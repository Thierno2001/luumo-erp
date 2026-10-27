# -*- coding: utf-8 -*-
"""
Contrôleur d'Administration Plateforme & Backoffice Luumo
=========================================================
Accessible uniquement aux Super-Admins et Opérateurs de la plateforme Luumo (ID 1 ou groupe system).
Permet le pilotage global du SaaS :
1. Statistiques & KPIs Plateforme (MRR, GMV, conversion des essais).
2. Supervision de toutes les entreprises clientes (Tenants).
3. Prolongation manuelle d'essai (ex: geste commercial Madina/Kankan).
4. Validation manuelle d'un règlement Mobile Money (Orange Money / MTN MoMo).
5. Journalisation des flux de paiement.
"""
import json
import logging
from datetime import timedelta

from odoo import SUPERUSER_ID, fields
from odoo.exceptions import AccessError, ValidationError
from odoo.http import request

from ..services.apps_service import (
    PLANS,
    get_company_plan,
    get_company_subscription_info,
    record_subscription_payment,
    set_company_plan,
    upgrade_company_plan,
)
from ..services.http_core import LuumoBaseController, luumo_route
from ..services.roles_service import (
    LUUMO_ROLES,
    get_user_allowed_apps,
    get_user_role,
    set_user_role,
)
from ..services.security_owasp import (
    clean_text,
    validate_email,
    validate_password_owasp,
    validate_phone,
)

_logger = logging.getLogger(__name__)


def _is_platform_admin():
    """Vérifie si l'utilisateur connecté est un Super-Admin Luumo."""
    user = request.env.user
    if not user or user._is_public():
        return False
    return (
        user.id == 1
        or user.id == SUPERUSER_ID
        or user.has_group('base.group_system')
    )


class LuumoAdminController(LuumoBaseController):

    def _check_admin_access(self):
        if not self._is_authenticated():
            return self._error('Session expirée ou non authentifiée', 401)
        if not _is_platform_admin():
            return self._error("Accès réservé aux super-administrateurs de la plateforme Luumo.", 403)
        return None

    @luumo_route('/admin/overview', ['GET'])
    def admin_overview(self):
        """KPIs globaux de la plateforme Luumo en Guinée."""
        access_err = self._check_admin_access()
        if access_err:
            return access_err

        def _do():
            su_env = request.env(user=SUPERUSER_ID)
            companies = su_env['res.company'].search([])
            today = fields.Date.today()

            total_companies = len(companies)
            active_subscribers = 0
            trial_subscribers = 0
            expired_subscribers = 0
            mrr = 0

            for comp in companies:
                info = get_company_subscription_info(su_env, comp)
                st = info['status']
                if st == 'active':
                    active_subscribers += 1
                    mrr += info['current_plan']['monthly_price']
                elif st == 'trial':
                    trial_subscribers += 1
                elif st in ('expired', 'past_due'):
                    expired_subscribers += 1

            # Volume global d'affaires (GMV)
            gmv = 0
            orders = su_env['sale.order'].search([('state', 'in', ['sale', 'done'])])
            if orders:
                gmv = round(sum(orders.mapped('amount_total')))

            return self._ok({
                'kpis': {
                    'total_companies': total_companies,
                    'active_subscribers': active_subscribers,
                    'trial_subscribers': trial_subscribers,
                    'expired_subscribers': expired_subscribers,
                    'mrr': mrr,
                    'gmv': gmv,
                },
                'currency': self._currency(),
            })

        return self._guard(_do, check_subscription=False)

    @luumo_route('/admin/companies', ['GET'])
    def admin_companies(self):
        """Liste tous les commerces enregistrés sur la plateforme avec leur statut d'abonnement."""
        access_err = self._check_admin_access()
        if access_err:
            return access_err

        def _do():
            su_env = request.env(user=SUPERUSER_ID)
            companies = su_env['res.company'].search([], order='create_date desc')
            res = []
            for comp in companies:
                info = get_company_subscription_info(su_env, comp)
                # Trouver le gérant de la boutique
                admin_user = su_env['res.users'].search([('company_id', '=', comp.id)], limit=1, order='id asc')

                res.append({
                    'id': comp.id,
                    'name': comp.name,
                    'city': comp.city or 'Conakry',
                    'phone': comp.phone or '',
                    'email': comp.email or '',
                    'admin_name': admin_user.name if admin_user else comp.name,
                    'plan': info['current_plan'],
                    'status': info['status'],
                    'days_remaining': info['days_remaining'],
                    'current_period_end': info['current_period_end'],
                    'create_date': fields.Datetime.to_string(comp.create_date),
                })
            return self._ok(res)

        return self._guard(_do, check_subscription=False)

    @luumo_route('/admin/companies/<int:cid>/extend-trial', ['POST'])
    def admin_extend_trial(self, cid):
        """Prolonge manuellement la période d'essai d'un commerce (ex. +7 jours)."""
        access_err = self._check_admin_access()
        if access_err:
            return access_err

        def _do():
            su_env = request.env(user=SUPERUSER_ID)
            comp = su_env['res.company'].browse(cid)
            if not comp.exists():
                return self._error("Entreprise introuvable.", 404)

            p = self._payload()
            add_days = max(1, int(p.get('days') or 7))
            today = fields.Date.today()

            period_key = f'luumo_sub_period_end_{comp.id}'
            period_end_raw = su_env['ir.config_parameter'].sudo().get_param(period_key, default=None)
            base_date = today
            if period_end_raw:
                try:
                    curr = fields.Date.from_string(period_end_raw)
                    if curr > today:
                        base_date = curr
                except Exception:
                    pass

            new_end = base_date + timedelta(days=add_days)
            su_env['ir.config_parameter'].sudo().set_param(period_key, fields.Date.to_string(new_end))
            su_env['ir.config_parameter'].sudo().set_param(f'luumo_sub_status_{comp.id}', 'trial')
            su_env.cr.commit()

            return self._ok(get_company_subscription_info(su_env, comp))

        return self._guard(_do, check_subscription=False)

    @luumo_route('/admin/companies/<int:cid>/activate', ['POST'])
    def admin_activate_company(self, cid):
        """Valide manuellement l'abonnement d'un client (ex: suite à réception de preuve SMS Orange Money)."""
        access_err = self._check_admin_access()
        if access_err:
            return access_err

        def _do():
            su_env = request.env(user=SUPERUSER_ID)
            comp = su_env['res.company'].browse(cid)
            if not comp.exists():
                return self._error("Entreprise introuvable.", 404)

            p = self._payload()
            provider = clean_text(p.get('provider') or 'orange_money', 'Opérateur', max_len=32)
            phone = clean_text(p.get('phone') or comp.phone or '+224 620 00 00 00', 'Téléphone', max_len=32)
            months = max(1, int(p.get('months') or 1))

            res = record_subscription_payment(su_env, comp, provider=provider, phone=phone, months=months)
            su_env.cr.commit()
            return self._ok(res)

        return self._guard(_do, check_subscription=False)

    @luumo_route('/admin/companies/<int:cid>/change-plan', ['POST'])
    def admin_change_plan(self, cid):
        """Modifie le forfait attribué à une entreprise."""
        access_err = self._check_admin_access()
        if access_err:
            return access_err

        def _do():
            su_env = request.env(user=SUPERUSER_ID)
            comp = su_env['res.company'].browse(cid)
            if not comp.exists():
                return self._error("Entreprise introuvable.", 404)

            p = self._payload()
            plan_id = clean_text(p.get('plan_id'), 'Forfait', min_len=2, max_len=30, required=True)
            if plan_id not in PLANS:
                return self._error("Identifiant de forfait invalide.", 400)

            set_company_plan(su_env, comp, plan_id)
            su_env.cr.commit()
            return self._ok(get_company_subscription_info(su_env, comp))

        return self._guard(_do, check_subscription=False)

    @luumo_route('/admin/payments', ['GET'])
    def admin_payments(self):
        """Historique centralisé des flux Mobile Money de la plateforme."""
        access_err = self._check_admin_access()
        if access_err:
            return access_err

        def _do():
            su_env = request.env(user=SUPERUSER_ID)
            res = []
            if 'luumo.payment.transaction' in su_env:
                txs = su_env['luumo.payment.transaction'].search([], order='create_date desc', limit=50)
                for tx in txs:
                    res.append({
                        'id': tx.id,
                        'tx_ref': tx.tx_ref,
                        'company_name': tx.company_id.name if tx.company_id else 'Inconnu',
                        'provider': tx.provider,
                        'merchant_code': tx.merchant_code,
                        'amount': tx.amount,
                        'customer_phone': tx.customer_phone or '',
                        'state': tx.state,
                        'created_at': fields.Datetime.to_string(tx.create_date),
                    })
            return self._ok(res)

        return self._guard(_do, check_subscription=False)

    @luumo_route('/admin/payments/<int:pid>/force-confirm', ['POST'])
    def admin_force_confirm_payment(self, pid):
        """Force la validation d'une transaction Mobile Money en attente."""
        access_err = self._check_admin_access()
        if access_err:
            return access_err

        def _do():
            su_env = request.env(user=SUPERUSER_ID)
            if 'luumo.payment.transaction' not in su_env:
                return self._error("Modèle de transaction non initialisé.", 400)
            tx = su_env['luumo.payment.transaction'].browse(pid)
            if not tx.exists():
                return self._error("Transaction introuvable.", 404)

            tx.write({
                'state': 'paid',
                'confirmed_at': fields.Datetime.now(),
            })
            su_env.cr.commit()
            return self._ok(tx.to_api_dict())

        return self._guard(_do, check_subscription=False)

    @luumo_route('/admin/roles', ['GET'])
    def admin_roles(self):
        """Retourne le référentiel des profils métier et de leurs privilèges."""
        access_err = self._check_admin_access()
        if access_err:
            return access_err
        return self._ok(list(LUUMO_ROLES.values()))

    @luumo_route('/admin/users', ['GET'])
    def admin_users(self):
        """Liste tous les utilisateurs de la plateforme avec leur profil et entreprise."""
        access_err = self._check_admin_access()
        if access_err:
            return access_err

        def _do():
            su_env = request.env(user=SUPERUSER_ID)
            users = su_env['res.users'].search([('id', '!=', 1), ('login', 'not in', ['__system__', 'public', 'default', 'portaltemplate'])], order='id desc')
            res = []
            for u in users:
                role_id = get_user_role(su_env, u)
                role_info = LUUMO_ROLES.get(role_id, LUUMO_ROLES['manager'])
                user_apps = get_user_allowed_apps(su_env, u)

                res.append({
                    'id': u.id,
                    'name': u.name,
                    'login': u.login,
                    'phone': u.partner_id.phone or '',
                    'active': u.active,
                    'role': role_id,
                    'role_name': role_info['name'],
                    'allowed_apps': user_apps,
                    'company_id': u.company_id.id,
                    'company_name': u.company_id.name,
                    'create_date': fields.Datetime.to_string(u.create_date),
                })
            return self._ok(res)

        return self._guard(_do, check_subscription=False)

    @luumo_route('/admin/users/create', ['POST'])
    def admin_create_user(self):
        """Crée un nouvel utilisateur pour une entreprise avec un rôle spécifique."""
        access_err = self._check_admin_access()
        if access_err:
            return access_err

        def _do():
            su_env = request.env(user=SUPERUSER_ID)
            p = self._payload()

            name = clean_text(p.get('name'), 'Nom complet', min_len=2, max_len=100, required=True)
            login = validate_email(p.get('login'), required=True)
            password = p.get('password') or ''
            validate_password_owasp(password, login=login, name=name)

            company_id = int(p.get('company_id') or 0)
            comp = su_env['res.company'].browse(company_id)
            if not comp.exists():
                return self._error("Entreprise introuvable.", 404)

            existing = su_env['res.users'].search([('login', '=', login)], limit=1)
            if existing:
                return self._error("Cet identifiant / email est déjà utilisé.", 400)

            role = p.get('role') or 'cashier'
            if role not in LUUMO_ROLES:
                return self._error("Profil / Rôle invalide.", 400)

            user_vals = {
                'name': name,
                'login': login,
                'password': password,
                'company_id': comp.id,
                'company_ids': [(6, 0, [comp.id])],
                'email': login,
            }
            if p.get('phone'):
                user_vals['phone'] = validate_phone(p.get('phone'))

            # Groupe de base utilisateur interne
            internal_grp = su_env.ref('base.group_user', raise_if_not_found=False)
            if internal_grp:
                user_vals['groups_id'] = [(4, internal_grp.id)]

            new_u = su_env['res.users'].create(user_vals)
            set_user_role(su_env, new_u, role)
            su_env.cr.commit()

            role_info = LUUMO_ROLES.get(role, LUUMO_ROLES['cashier'])
            return self._ok({
                'id': new_u.id,
                'name': new_u.name,
                'login': new_u.login,
                'phone': new_u.partner_id.phone or '',
                'active': new_u.active,
                'role': role,
                'role_name': role_info['name'],
                'allowed_apps': get_user_allowed_apps(su_env, new_u),
                'company_id': comp.id,
                'company_name': comp.name,
                'create_date': fields.Datetime.to_string(new_u.create_date),
            }, status=201)

        return self._guard(_do, check_subscription=False)

    @luumo_route('/admin/users/<int:uid>/role', ['POST'])
    def admin_update_user_role(self, uid):
        """Met à jour le profil métier / privilège d'un utilisateur."""
        access_err = self._check_admin_access()
        if access_err:
            return access_err

        def _do():
            su_env = request.env(user=SUPERUSER_ID)
            user = su_env['res.users'].browse(uid)
            if not user.exists():
                return self._error("Utilisateur introuvable.", 404)

            p = self._payload()
            role = p.get('role')
            if role not in LUUMO_ROLES:
                return self._error("Rôle invalide.", 400)

            set_user_role(su_env, user, role)
            su_env.cr.commit()

            role_info = LUUMO_ROLES[role]
            return self._ok({
                'id': user.id,
                'role': role,
                'role_name': role_info['name'],
                'allowed_apps': get_user_allowed_apps(su_env, user),
            })

        return self._guard(_do, check_subscription=False)

    @luumo_route('/admin/users/<int:uid>/toggle-active', ['POST'])
    def admin_toggle_user_active(self, uid):
        """Active ou désactive (suspend) le compte d'un utilisateur."""
        access_err = self._check_admin_access()
        if access_err:
            return access_err

        def _do():
            su_env = request.env(user=SUPERUSER_ID)
            if uid == request.env.user.id:
                return self._error("Vous ne pouvez pas désactiver votre propre compte administrateur.", 400)
            if uid == 1:
                return self._error("Le compte système racine ne peut pas être désactivé.", 400)

            user = su_env['res.users'].browse(uid)
            if not user.exists():
                return self._error("Utilisateur introuvable.", 404)

            new_active = not user.active
            user.write({'active': new_active})
            su_env.cr.commit()

            return self._ok({'id': user.id, 'active': new_active})

        return self._guard(_do, check_subscription=False)

    @luumo_route('/admin/users/<int:uid>/reset-password', ['POST'])
    def admin_reset_user_password(self, uid):
        """Réinitialise le mot de passe d'un utilisateur."""
        access_err = self._check_admin_access()
        if access_err:
            return access_err

        def _do():
            su_env = request.env(user=SUPERUSER_ID)
            user = su_env['res.users'].browse(uid)
            if not user.exists():
                return self._error("Utilisateur introuvable.", 404)

            p = self._payload()
            password = p.get('password') or ''
            validate_password_owasp(password, login=user.login, name=user.name)

            user.write({'password': password})
            su_env.cr.commit()

            return self._ok({'id': user.id, 'password_reset': True})

        return self._guard(_do, check_subscription=False)
