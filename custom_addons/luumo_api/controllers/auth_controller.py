# -*- coding: utf-8 -*-
"""
Contrôleur d'Authentification & Enregistrement Entreprise Multi-Sociétés
(`/auth/login`, `/auth/register`, `/auth/me`, `/auth/logout`)
"""
import logging

from odoo import SUPERUSER_ID
from odoo.exceptions import AccessDenied, ValidationError
from odoo.http import request, root

from ..services.accounting_service import ensure_company_infrastructure, ensure_company_warehouse
from ..services.apps_service import (
    ALL_APP_IDS,
    get_company_enabled_apps,
    init_company_profile_apps,
    set_company_enabled_apps,
)
from ..services.http_core import LuumoBaseController, luumo_route
from ..services.security_owasp import (
    check_rate_limit,
    clean_text,
    clear_rate_limit,
    validate_email,
    validate_password_owasp,
    validate_phone,
    validate_vat_nif,
)

_logger = logging.getLogger(__name__)


class LuumoAuthController(LuumoBaseController):

    @luumo_route('/auth/login', ['POST'], auth='none')
    def auth_login(self):
        ip = self._client_ip()
        try:
            payload = self._payload()
        except ValidationError as e:
            return self._error(str(e), 413)

        raw_login = (payload.get('login') or '').strip().lower()
        password = payload.get('password') or ''
        db = payload.get('db') or request.db

        if not raw_login or not password:
            return self._error('Identifiant et mot de passe obligatoires.', 400)
        if len(raw_login) > 120 or len(password) > 128:
            return self._error('Identifiants invalides.', 401)
        if not db:
            return self._error('Aucune base de données sélectionnée (configurez dbfilter).', 400)

        ip_ok, ip_wait = check_rate_limit(f'login_ip:{ip}', max_attempts=10, window_seconds=900)
        acct_ok, acct_wait = check_rate_limit(f'login_acct:{raw_login}', max_attempts=5, window_seconds=900)
        if not ip_ok or not acct_ok:
            wait_sec = max(ip_wait, acct_wait)
            _logger.warning('RateLimit bloque la tentative de connexion pour %s depuis %s', raw_login, ip)
            return self._error(
                f"Trop de tentatives de connexion échouées. Compte temporairement protégé, réessayez dans {wait_sec} secondes.",
                429,
                headers={'Retry-After': wait_sec},
            )

        try:
            request.session.authenticate(db, {'login': raw_login, 'password': password, 'type': 'password'})
        except AccessDenied:
            return self._error('Identifiant ou mot de passe incorrect.', 401)

        if not request.session.uid:
            return self._error("Authentification multifacteur requise.", 401)

        clear_rate_limit(f'login_acct:{raw_login}')
        if request.session.should_rotate:
            root.session_store.rotate(request.session, request.env)

        user = request.env['res.users'].browse(request.session.uid)
        ensure_company_infrastructure(request.env, company=user.company_id, user=user)
        request.env.cr.commit()
        enabled_apps = get_company_enabled_apps(request.env, user.company_id)
        return self._ok({
            'session_id': request.session.sid,
            'user': {
                'id': user.id,
                'name': user.name,
                'login': user.login,
                'company': {
                    'id': user.company_id.id,
                    'name': user.company_id.name,
                    'enabled_apps': enabled_apps,
                },
            },
            'currency': self._currency(),
        })

    @luumo_route('/auth/register', ['POST'], auth='none')
    def auth_register(self):
        """Enregistre une nouvelle Entreprise (`res.company`) et son gérant (`res.users`)
        avec cloisonnement Multi-Sociétés et principe du moindre privilège.
        """
        ip = self._client_ip()
        reg_ok, reg_wait = check_rate_limit(f'register_ip:{ip}', max_attempts=5, window_seconds=900)
        if not reg_ok:
            return self._error(
                f"Trop de demandes de création de compte depuis cette adresse. Réessayez dans {reg_wait} secondes.",
                429,
                headers={'Retry-After': reg_wait},
            )

        try:
            p = self._payload()
            company_name = clean_text(p.get('company_name'), "Nom de l'entreprise", min_len=2, max_len=100, required=True)
            admin_name = clean_text(p.get('admin_name') or p.get('name'), 'Nom complet du gérant', min_len=2, max_len=100, required=True)
            login = validate_email(p.get('login'), required=True)
            phone = validate_phone(p.get('phone'), required=True)
            city = clean_text(p.get('city') or 'Conakry', 'Ville / Quartier', min_len=2, max_len=80, required=True)
            nif_rccm = validate_vat_nif(p.get('nif_rccm'), required=False)
            business_profile = clean_text(p.get('business_profile') or 'retail', 'Profil métier', max_len=30)
            password = p.get('password') or ''

            validate_password_owasp(
                password, login=login, name=admin_name, company_name=company_name,
            )
        except ValidationError as e:
            return self._error(str(e), 422)

        db = p.get('db') or request.db
        if not db:
            return self._error('Aucune base de données configurée sur le serveur.', 400)

        try:
            su_env = request.env(user=SUPERUSER_ID)
            existing = su_env['res.users'].search([('login', '=ilike', login)], limit=1)
            if existing:
                return self._error(
                    "Impossible de finaliser l'inscription avec cet identifiant (compte déjà existant).",
                    409,
                )

            with request.env.cr.savepoint():
                country_gn = su_env.ref('base.gn', raise_if_not_found=False)
                currency_gnf = su_env.ref('base.GNF', raise_if_not_found=False)
                if currency_gnf and not currency_gnf.active:
                    currency_gnf.active = True

                company_vals = {
                    'name': company_name,
                    'phone': phone,
                    'email': login,
                    'city': city,
                    'vat': nif_rccm or False,
                    'country_id': country_gn.id if country_gn else False,
                }
                if currency_gnf:
                    company_vals['currency_id'] = currency_gnf.id
                company = su_env['res.company'].create(company_vals)
                ensure_company_warehouse(su_env, company)
                init_company_profile_apps(su_env, company, profile=business_profile)

                group_xmlids = [
                    'base.group_user',
                    'sales_team.group_sale_manager',
                    'stock.group_stock_manager',
                    'purchase.group_purchase_manager',
                    'account.group_account_invoice',
                    'hr.group_hr_user',
                    'hr_expense.group_hr_expense_user',
                    'hr_expense.group_hr_expense_manager',
                    'fleet.fleet_group_manager',
                ]
                group_ids = []
                for xmlid in group_xmlids:
                    grp = su_env.ref(xmlid, raise_if_not_found=False)
                    if grp:
                        group_ids.append(grp.id)

                user_vals = {
                    'name': admin_name,
                    'login': login,
                    'email': login,
                    'phone': phone,
                    'password': password,
                    'company_id': company.id,
                    'company_ids': [(6, 0, [company.id])],
                }
                if group_ids:
                    user_vals['groups_id'] = [(6, 0, group_ids)]

                new_user = su_env['res.users'].create(user_vals)
                ensure_company_infrastructure(su_env, company=company, user=new_user)

            # Valider définitivement la création en base avant l'authentification
            # (nécessaire car authenticate() ouvre son propre curseur PostgreSQL)
            request.env.cr.commit()

            request.session.authenticate(db, {'login': login, 'password': password, 'type': 'password'})
            clear_rate_limit(f'register_ip:{ip}')
            clear_rate_limit(f'login_acct:{login}')
            if request.session.should_rotate:
                root.session_store.rotate(request.session, request.env)

            enabled_apps = get_company_enabled_apps(su_env, company)
            return self._ok({
                'session_id': request.session.sid,
                'user': {
                    'id': new_user.id,
                    'name': new_user.name,
                    'login': new_user.login,
                    'company': {
                        'id': company.id,
                        'name': company.name,
                        'enabled_apps': enabled_apps,
                    },
                },
                'currency': self._currency(),
            }, status=201)
        except Exception:  # noqa: BLE001
            request.env.cr.rollback()
            _logger.exception('Erreur lors de la création sécurisée du compte entreprise')
            return self._error(
                "Une erreur est survenue lors de la création de votre espace entreprise.",
                500,
            )

    @luumo_route('/auth/me', ['GET'])
    def auth_me(self):
        def _do():
            user = request.env.user
            enabled_apps = get_company_enabled_apps(request.env, user.company_id)
            return self._ok({
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'login': user.login,
                    'company': {
                        'id': user.company_id.id,
                        'name': user.company_id.name,
                        'enabled_apps': enabled_apps,
                    },
                },
                'currency': self._currency(),
            })
        return self._guard(_do)

    @luumo_route('/auth/logout', ['POST'])
    def auth_logout(self):
        request.session.logout(keep_db=True)
        return self._ok({'logged_out': True})

    @luumo_route('/company/apps', ['GET'])
    def get_company_apps(self):
        """Récupère la liste des applications activées pour l'entreprise connectée."""
        def _do():
            env = request.env
            company = env.company
            enabled = get_company_enabled_apps(env, company)
            return self._ok({
                'enabled_apps': enabled,
                'all_apps': ALL_APP_IDS,
            })
        return self._guard(_do)

    @luumo_route('/company/apps', ['POST'])
    def update_company_apps(self):
        """Met à jour les applications activées pour l'entreprise connectée (Niveau 2)."""
        def _do():
            env = request.env
            company = env.company
            p = self._payload()
            apps = p.get('enabled_apps')
            if not isinstance(apps, list):
                raise ValidationError("Le format des applications activées est invalide (liste attendue).")
            updated = set_company_enabled_apps(env, company, apps)
            env.cr.commit()
            return self._ok({
                'enabled_apps': updated,
                'all_apps': ALL_APP_IDS,
            })
        return self._guard(_do)
