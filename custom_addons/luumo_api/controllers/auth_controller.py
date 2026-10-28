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
    get_company_plan,
    get_company_subscription_info,
    init_company_profile_apps,
    record_subscription_payment,
    set_company_enabled_apps,
    upgrade_company_plan,
)
from ..services.roles_service import (
    LUUMO_ROLES,
    get_user_role,
    get_user_allowed_apps,
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
from ..services.otp_service import generate_and_send_otp, verify_otp
from ..services.email_service import send_email
from ..services.nimba_sms_service import send_nimba_sms
from ..services.notification_templates import render_email_template, render_sms

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
        plan = get_company_plan(request.env, user.company_id)
        enabled_apps = get_company_enabled_apps(request.env, user.company_id)
        subscription = get_company_subscription_info(request.env, user.company_id)
        is_admin = user.id == 1 or user.id == SUPERUSER_ID or user.has_group('base.group_system')
        role_id = get_user_role(request.env, user)
        role_info = LUUMO_ROLES.get(role_id, LUUMO_ROLES['manager'])
        user_allowed_apps = get_user_allowed_apps(request.env, user)

        return self._ok({
            'session_id': request.session.sid,
            'user': {
                'id': user.id,
                'name': user.name,
                'login': user.login,
                'is_admin': is_admin,
                'role': role_id,
                'role_name': role_info['name'],
                'allowed_apps': user_allowed_apps,
                'company': {
                    'id': user.company_id.id,
                    'name': user.company_id.name,
                    'plan': plan,
                    'enabled_apps': enabled_apps,
                    'subscription': subscription,
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

            plan = get_company_plan(su_env, company)
            enabled_apps = get_company_enabled_apps(su_env, company)
            subscription = get_company_subscription_info(su_env, company)
            return self._ok({
                'session_id': request.session.sid,
                'user': {
                    'id': new_user.id,
                    'name': new_user.name,
                    'login': new_user.login,
                    'is_admin': False,
                    'role': 'manager',
                    'role_name': LUUMO_ROLES['manager']['name'],
                    'allowed_apps': enabled_apps,
                    'company': {
                        'id': company.id,
                        'name': company.name,
                        'plan': plan,
                        'enabled_apps': enabled_apps,
                        'subscription': subscription,
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
            plan = get_company_plan(request.env, user.company_id)
            enabled_apps = get_company_enabled_apps(request.env, user.company_id)
            subscription = get_company_subscription_info(request.env, user.company_id)
            is_admin = user.id == 1 or user.id == SUPERUSER_ID or user.has_group('base.group_system')
            role_id = get_user_role(request.env, user)
            role_info = LUUMO_ROLES.get(role_id, LUUMO_ROLES['manager'])
            user_allowed_apps = get_user_allowed_apps(request.env, user)

            return self._ok({
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'login': user.login,
                    'is_admin': is_admin,
                    'role': role_id,
                    'role_name': role_info['name'],
                    'allowed_apps': user_allowed_apps,
                    'company': {
                        'id': user.company_id.id,
                        'name': user.company_id.name,
                        'plan': plan,
                        'enabled_apps': enabled_apps,
                        'subscription': subscription,
                    },
                },
                'currency': self._currency(),
            })
        return self._guard(_do, check_subscription=False)

    @luumo_route('/auth/logout', ['POST'])
    def auth_logout(self):
        request.session.logout(keep_db=True)
        return self._ok({'logged_out': True})

    @luumo_route('/auth/otp/request', ['POST'], auth='none')
    def auth_otp_request(self):
        """Demande d'envoi d'un code OTP par Email (luumo.guinee@gmail.com) ou Nimba SMS."""
        try:
            p = self._payload()
            login = validate_email(p.get('login'), required=True)
            purpose = clean_text(p.get('purpose') or 'password_reset', "Motif de vérification", max_len=30)
            channel = clean_text(p.get('channel') or 'email', "Canal", max_len=10)
            phone = clean_text(p.get('phone') or '', "Téléphone", max_len=30, required=False)
        except ValidationError as e:
            return self._error(str(e), 422)

        if purpose not in ('password_reset', 'change_password', 'account_verify'):
            return self._error("Motif de vérification non reconnu.", 400)

        su_env = request.env(user=SUPERUSER_ID)
        user = su_env['res.users'].search([('login', '=ilike', login)], limit=1)

        # En cas de changement de mot de passe ou réinitialisation, le compte doit exister
        if purpose in ('password_reset', 'change_password') and not user:
            return self._error("Compte introuvable pour cet identifiant.", 404)

        user_name = user.name if user else 'Commerçant'
        target_phone = phone or (user and (user.partner_id.phone or user.company_id.phone)) or ''

        res = generate_and_send_otp(
            env=su_env,
            target_login=login,
            purpose=purpose,
            channel=channel,
            phone=target_phone,
            user_name=user_name,
        )
        if not res.get('success'):
            return self._error(res.get('error', "Échec de l'envoi du code."), 429 if 'retry_after' in res else 500)

        return self._ok(res)

    @luumo_route('/auth/otp/verify', ['POST'], auth='none')
    def auth_otp_verify(self):
        """Vérification unitaire d'un code OTP (sans le consommer immédiatement)."""
        try:
            p = self._payload()
            login = validate_email(p.get('login'), required=True)
            code = clean_text(p.get('code'), "Code OTP", min_len=6, max_len=6, required=True)
            purpose = clean_text(p.get('purpose') or 'password_reset', "Motif", max_len=30)
        except ValidationError as e:
            return self._error(str(e), 422)

        su_env = request.env(user=SUPERUSER_ID)
        is_valid, err_msg = verify_otp(su_env, login, code, purpose=purpose, consume=False)
        if not is_valid:
            return self._error(err_msg, 400)

        return self._ok({'valid': True, 'message': "Code de sécurité valide."})

    @luumo_route('/auth/reset-password', ['POST'], auth='none')
    def auth_reset_password(self):
        """Réinitialisation de mot de passe en libre-service sécurisé avec validation par code OTP ou téléphone."""
        ip = self._client_ip()
        ip_ok, ip_wait = check_rate_limit(f'reset_ip:{ip}', max_attempts=5, window_seconds=900)
        if not ip_ok:
            return self._error(
                f"Trop de demandes de réinitialisation. Réessayez dans {ip_wait} secondes.",
                429,
                headers={'Retry-After': ip_wait},
            )

        try:
            p = self._payload()
            login = validate_email(p.get('login'), required=True)
            code = clean_text(p.get('code') or '', "Code de vérification", max_len=10, required=False)
            phone = clean_text(p.get('phone') or '', "Téléphone commerçant", max_len=30, required=False)
            new_password = p.get('new_password') or p.get('password') or ''
        except ValidationError as e:
            return self._error(str(e), 422)

        su_env = request.env(user=SUPERUSER_ID)
        user = su_env['res.users'].search([('login', '=ilike', login)], limit=1)
        if not user:
            return self._error("Compte introuvable pour cet identifiant.", 404)

        # 1. Vérification par code OTP (méthode standard sécurisée)
        if code:
            is_valid, err_msg = verify_otp(su_env, user.login, code, purpose='password_reset', consume=True)
            if not is_valid:
                return self._error(err_msg, 400)
        elif phone:
            # 2. Rétro-compatibilité : validation croisée par téléphone
            user_phone = (user.partner_id.phone or user.company_id.phone or '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            provided_phone = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')

            clean_user_digits = ''.join([d for d in user_phone if d.isdigit()])
            clean_provided_digits = ''.join([d for d in provided_phone if d.isdigit()])

            if len(clean_provided_digits) < 6 or len(clean_user_digits) < 6:
                return self._error("Numéro de téléphone incomplet pour valider votre compte.", 400)

            cmp_len = min(8, len(clean_provided_digits), len(clean_user_digits))
            if clean_provided_digits[-cmp_len:] != clean_user_digits[-cmp_len:]:
                return self._error("Le numéro de téléphone ne correspond pas au compte enregistré.", 403)
        else:
            return self._error("Veuillez renseigner le code de vérification reçu par email ou votre numéro de téléphone.", 400)

        try:
            validate_password_owasp(new_password, login=user.login, name=user.name)
        except ValidationError as e:
            return self._error(str(e), 422)

        user.write({'password': new_password})
        su_env.cr.commit()

        # Nettoyer les compteurs de tentatives échouées pour permettre une connexion immédiate
        clear_rate_limit(f'login_acct:{user.login}')
        clear_rate_limit(f'login_ip:{ip}')

        # Alerte de confirmation
        try:
            user_phone = user.partner_id.phone or user.company_id.phone
            send_nimba_sms(su_env, user_phone, render_sms('password_changed_alert'))
            subj, html, plain = render_email_template('password_changed_alert', user_name=user.name, target_email=user.login)
            send_email(su_env, user.login, subj, html, plain)
        except Exception as notify_err:
            _logger.warning("Notification post-réinitialisation ignorée : %s", str(notify_err))

        return self._ok({
            'message': "Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.",
            'login': user.login,
        })

    @luumo_route('/auth/change-password', ['POST'])
    def auth_change_password(self):
        """Changement de mot de passe sécurisé pour l'utilisateur connecté avec code OTP."""
        user = request.env.user
        if not user or user._is_public():
            return self._error("Authentification requise pour cette opération.", 401)

        try:
            p = self._payload()
            old_password = p.get('old_password') or ''
            code = clean_text(p.get('code') or '', "Code de vérification", max_len=10, required=True)
            new_password = p.get('new_password') or ''
        except ValidationError as e:
            return self._error(str(e), 422)

        # Vérifier l'ancien mot de passe
        try:
            user._check_credentials(old_password, {'type': 'password', 'interactive': True})
        except AccessDenied:
            return self._error("L'ancien mot de passe est incorrect.", 403)

        su_env = request.env(user=SUPERUSER_ID)

        # Vérifier le code OTP
        is_valid, err_msg = verify_otp(su_env, user.login, code, purpose='change_password', consume=True)
        if not is_valid:
            return self._error(err_msg, 400)

        # Vérifier politique OWASP
        try:
            validate_password_owasp(new_password, login=user.login, name=user.name)
        except ValidationError as e:
            return self._error(str(e), 422)

        user.sudo().write({'password': new_password})
        su_env.cr.commit()

        # Notification de confirmation
        try:
            user_phone = user.partner_id.phone or user.company_id.phone
            send_nimba_sms(su_env, user_phone, render_sms('password_changed_alert'))
            subj, html, plain = render_email_template('password_changed_alert', user_name=user.name, target_email=user.login)
            send_email(su_env, user.login, subj, html, plain)
        except Exception as notify_err:
            _logger.warning("Notification post-modification ignorée : %s", str(notify_err))

        return self._ok({
            'message': "Votre mot de passe a été modifié avec succès.",
        })

    @luumo_route('/company/subscription', ['GET'])
    def get_company_subscription(self):
        """Récupère l'état complet du forfait, de l'échéance et des factures d'abonnement."""
        def _do():
            env = request.env
            return self._ok(get_company_subscription_info(env, env.company))
        return self._guard(_do, check_subscription=False)

    @luumo_route('/company/apps', ['GET'])
    def get_company_apps(self):
        """Compatibilité : alias vers /company/subscription."""
        return self.get_company_subscription()

    @luumo_route('/company/apps', ['POST'])
    def update_company_apps(self):
        """Met à jour les applications activées (visibles) dans la limite du forfait souscrit."""
        def _do():
            env = request.env
            company = env.company
            p = self._payload()
            apps = p.get('enabled_apps')
            if not isinstance(apps, list):
                raise ValidationError("Le format des applications activées est invalide (liste attendue).")
            set_company_enabled_apps(env, company, apps)
            env.cr.commit()
            return self._ok(get_company_subscription_info(env, company))
        return self._guard(_do, check_subscription=False)

    @luumo_route('/company/subscription/pay', ['POST'])
    def pay_company_subscription(self):
        """Règlement de l'abonnement par Mobile Money (Orange Money / MTN MoMo)."""
        def _do():
            env = request.env
            company = env.company
            p = self._payload()
            provider = clean_text(p.get('provider') or 'orange_money', "Opérateur", max_len=32)
            phone = clean_text(p.get('phone') or '+224 620 00 00 00', "Numéro de téléphone", max_len=32)
            months = int(p.get('months') or 1)
            res = record_subscription_payment(env, company, provider=provider, phone=phone, months=months)
            env.cr.commit()
            return self._ok(res)
        return self._guard(_do, check_subscription=False)

    @luumo_route('/company/plan/upgrade', ['POST'])
    def upgrade_company_plan(self):
        """Surclassement du forfait entreprise (ex. Boutique -> Grossiste & Entreprise)."""
        def _do():
            env = request.env
            company = env.company
            p = self._payload()
            new_plan_id = clean_text(p.get('plan_id'), "Identifiant du forfait", min_len=2, max_len=30, required=True)
            res = upgrade_company_plan(env, company, new_plan_id)
            if not res:
                return self._error("Forfait sélectionné invalide.", 400)
            env.cr.commit()
            return self._ok(get_company_subscription_info(env, company))
        return self._guard(_do, check_subscription=False)
