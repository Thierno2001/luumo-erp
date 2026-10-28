# -*- coding: utf-8 -*-
"""
Service d'Abonnement & Facturation SaaS Luumo
============================================
Gère le cycle de vie complet de l'abonnement pour les PME en Guinée :
1. Forfait attribué selon le métier (Boutique, Services, Grossiste).
2. Période d'essai gratuite de 14 jours à la création.
3. Renouvellement et facturation par Mobile Money (Orange Money, MTN MoMo).
4. Génération automatique de factures d'abonnement numérotées et acquittées.
5. Surclassement de forfait en 1 clic.
"""
from datetime import timedelta
import json
from odoo import fields

ALL_APP_IDS = [
    'pos',
    'orders',
    'dashboard',
    'inventory',
    'purchases',
    'customers',
    'hr',
    'fleet',
]

PLANS = {
    'retail': {
        'id': 'retail',
        'name': 'Forfait Boutique',
        'allowed_apps': ['pos', 'inventory', 'customers', 'dashboard'],
        'monthly_price': 150000,
        'description': 'Commerce de détail, supérettes, pharmacies et quincailleries.',
        'badge': 'Boutique',
    },
    'services': {
        'id': 'services',
        'name': 'Forfait Services',
        'allowed_apps': ['inventory', 'orders', 'customers', 'hr', 'dashboard'],
        'monthly_price': 250000,
        'description': 'Sociétés de prestations, agences, cabinets, ateliers et maintenance.',
        'badge': 'Services',
    },
    'wholesale': {
        'id': 'wholesale',
        'name': 'Forfait Grossiste',
        'allowed_apps': ['pos', 'orders', 'dashboard', 'inventory', 'purchases', 'customers', 'hr', 'fleet'],
        'monthly_price': 450000,
        'description': 'Grossistes, dépôts de distribution, importateurs et logistique.',
        'badge': 'Grossiste',
    },
}


def get_company_plan_id(env, company):
    """Récupère l'identifiant du forfait de l'entreprise.
    Par défaut 'wholesale' pour les entreprises préexistantes (zéro régression).
    """
    if not company:
        return 'wholesale'
    key = f'luumo_company_plan_{company.id}'
    plan_id = env['ir.config_parameter'].sudo().get_param(key, default=None)
    if plan_id and plan_id in PLANS:
        return plan_id
    return 'wholesale'


def get_company_plan(env, company):
    """Retourne la configuration du forfait actif de l'entreprise."""
    plan_id = get_company_plan_id(env, company)
    return PLANS.get(plan_id, PLANS['wholesale'])


def set_company_plan(env, company, plan_id):
    """Assigne un forfait à l'entreprise et synchronise ses applications."""
    if not company or plan_id not in PLANS:
        plan_id = 'wholesale'
    key = f'luumo_company_plan_{company.id}'
    env['ir.config_parameter'].sudo().set_param(key, plan_id)
    return PLANS[plan_id]


def get_company_enabled_apps(env, company):
    """Les applications actives d'une entreprise sont exactement les applications de son forfait."""
    plan = get_company_plan(env, company)
    return list(plan['allowed_apps'])


def set_company_enabled_apps(env, company, app_ids):
    """Compatibilité : retourne les applications du forfait."""
    return get_company_enabled_apps(env, company)


def get_company_subscription_info(env, company):
    """Retourne l'état complet de l'abonnement, de l'échéance et de la facturation."""
    plan = get_company_plan(env, company)
    today = fields.Date.today()

    # Date de fin de période / échéance
    period_key = f'luumo_sub_period_end_{company.id}'
    period_end_raw = env['ir.config_parameter'].sudo().get_param(period_key, default=None)
    if period_end_raw:
        try:
            period_end = fields.Date.from_string(period_end_raw)
        except Exception:
            period_end = today + timedelta(days=30)
    else:
        # 30 jours par défaut
        period_end = today + timedelta(days=30)
        env['ir.config_parameter'].sudo().set_param(period_key, fields.Date.to_string(period_end))

    # Statut
    status_key = f'luumo_sub_status_{company.id}'
    status = env['ir.config_parameter'].sudo().get_param(status_key, default=None)
    if not status:
        status = 'active' if company.id == 1 else 'trial'
        env['ir.config_parameter'].sudo().set_param(status_key, status)

    days_remaining = max(0, (period_end - today).days)

    # Vérification automatique de l'expiration des 14 jours d'essai ou de l'abonnement
    if today > period_end or days_remaining == 0:
        if status == 'trial':
            status = 'expired'
            env['ir.config_parameter'].sudo().set_param(status_key, status)
        elif status == 'active':
            status = 'past_due'
            env['ir.config_parameter'].sudo().set_param(status_key, status)

    # Factures d'abonnement
    invoices_key = f'luumo_sub_invoices_{company.id}'
    invoices_raw = env['ir.config_parameter'].sudo().get_param(invoices_key, default=None)
    invoices = []
    if invoices_raw:
        try:
            invoices = json.loads(invoices_raw)
        except Exception:
            invoices = []

    # Si aucune facture n'existe encore, en créer une initiale
    if not invoices:
        init_inv = {
            'id': 1,
            'number': f'FACT-LUUMO-{today.strftime("%Y%m")}-{company.id:03d}-01',
            'date': fields.Date.to_string(today),
            'plan_name': plan['name'],
            'amount': plan['monthly_price'],
            'payment_method': 'Orange Money / Offert à la création',
            'period': f'{fields.Date.to_string(today)} au {fields.Date.to_string(period_end)}',
            'status': 'paid',
        }
        invoices = [init_inv]
        env['ir.config_parameter'].sudo().set_param(invoices_key, json.dumps(invoices))

    return {
        'current_plan': plan,
        'allowed_apps': plan['allowed_apps'],
        'enabled_apps': plan['allowed_apps'],
        'status': status,
        'current_period_end': fields.Date.to_string(period_end),
        'days_remaining': days_remaining,
        'plans': PLANS,
        'invoices': invoices,
    }


def record_subscription_payment(env, company, provider='orange_money', phone='+224 620 00 00 00', months=1):
    """Enregistre le règlement Mobile Money d'un forfait, prolonge l'abonnement
    et génère automatiquement la facture acquittée.
    """
    plan = get_company_plan(env, company)
    today = fields.Date.today()

    period_key = f'luumo_sub_period_end_{company.id}'
    period_end_raw = env['ir.config_parameter'].sudo().get_param(period_key, default=None)
    start_date = today
    if period_end_raw:
        try:
            current_end = fields.Date.from_string(period_end_raw)
            if current_end > today:
                start_date = current_end
        except Exception:
            pass

    months = max(1, int(months))
    # 1 an = 12 mois au prix de 10 mois
    if months == 12:
        amount = plan['monthly_price'] * 10
        new_end = start_date + timedelta(days=365)
    else:
        amount = plan['monthly_price'] * months
        new_end = start_date + timedelta(days=30 * months)

    env['ir.config_parameter'].sudo().set_param(period_key, fields.Date.to_string(new_end))
    env['ir.config_parameter'].sudo().set_param(f'luumo_sub_status_{company.id}', 'active')

    # Opérateur label
    op_label = 'Orange Money' if 'orange' in provider.lower() else 'MTN Mobile Money'

    # Ajouter la facture
    invoices_key = f'luumo_sub_invoices_{company.id}'
    invoices_raw = env['ir.config_parameter'].sudo().get_param(invoices_key, default='[]')
    try:
        invoices = json.loads(invoices_raw)
    except Exception:
        invoices = []

    seq = len(invoices) + 1
    new_invoice = {
        'id': seq,
        'number': f'FACT-LUUMO-{today.strftime("%Y%m")}-{company.id:03d}-{seq:02d}',
        'date': fields.Date.to_string(today),
        'plan_name': plan['name'],
        'amount': amount,
        'payment_method': f'{op_label} ({phone})',
        'period': f'{fields.Date.to_string(start_date)} au {fields.Date.to_string(new_end)}',
        'status': 'paid',
    }
    invoices.insert(0, new_invoice)
    env['ir.config_parameter'].sudo().set_param(invoices_key, json.dumps(invoices))

    return get_company_subscription_info(env, company)


def upgrade_company_plan(env, company, new_plan_id):
    """Surclasse l'entreprise vers un forfait supérieur."""
    if not company or new_plan_id not in PLANS:
        return False
    set_company_plan(env, company, new_plan_id)
    return get_company_subscription_info(env, company)


def init_company_profile_apps(env, company, profile='wholesale'):
    """Initialise le forfait et la période d'essai de 14 jours."""
    plan = set_company_plan(env, company, profile)
    today = fields.Date.today()
    trial_end = today + timedelta(days=14)
    env['ir.config_parameter'].sudo().set_param(f'luumo_sub_period_end_{company.id}', fields.Date.to_string(trial_end))
    env['ir.config_parameter'].sudo().set_param(f'luumo_sub_status_{company.id}', 'trial')
    return plan


def is_subscription_active(env, company):
    """Vérifie si l'accès aux fonctionnalités métier Luumo est autorisé.
    Bloque strictement l'accès si la période d'essai de 14 jours est terminée sans paiement Mobile Money.
    """
    if not company:
        return False
    if env.user.id == 1:
        return True

    info = get_company_subscription_info(env, company)
    today = fields.Date.today()
    try:
        period_end = fields.Date.from_string(info['current_period_end'])
    except Exception:
        return False

    if today > period_end or info['status'] in ('expired', 'past_due'):
        return False
    return info['status'] in ('active', 'trial')

