# -*- coding: utf-8 -*-
"""
Service de gestion des forfaits et applications modulaires Luumo
================================================================
Assure le cloisonnement commercial et le contrôle d'accès par forfait :
1. Chaque PME souscrit à un Forfait selon son activité (Boutique, Services, Grossiste).
2. Seules les applications autorisées par son forfait sont débloquées.
3. Les applications des forfaits supérieurs sont verrouillées et nécessitent un surclassement.
4. Les PME préexistantes conservent le Forfait Grossiste & Entreprise (zéro régression).
"""
import json

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
        'name': 'Forfait Boutique & Caisse',
        'allowed_apps': ['pos', 'inventory', 'customers', 'dashboard'],
        'monthly_price': 150000,
        'description': 'Idéal pour le commerce de détail, supérettes, pharmacies et quincailleries.',
        'badge': 'Starter',
    },
    'services': {
        'id': 'services',
        'name': 'Forfait Pro Services & B2B',
        'allowed_apps': ['orders', 'customers', 'hr', 'dashboard'],
        'monthly_price': 250000,
        'description': 'Idéal pour prestataires, cabinets, transitaires et agences de service.',
        'badge': 'Pro B2B',
    },
    'wholesale': {
        'id': 'wholesale',
        'name': 'Forfait Grossiste & Entreprise',
        'allowed_apps': ['pos', 'orders', 'dashboard', 'inventory', 'purchases', 'customers', 'hr', 'fleet'],
        'monthly_price': 450000,
        'description': 'Suite complète 360° avec parc de camions, livraisons, achats conteneurs et RH.',
        'badge': 'Illimité 360°',
    },
}


def get_company_plan_id(env, company):
    """Récupère l'identifiant du forfait de l'entreprise.
    Si non configuré (entreprises existantes), retourne 'wholesale' (accès complet, zéro régression).
    """
    if not company:
        return 'wholesale'
    key = f'luumo_company_plan_{company.id}'
    plan_id = env['ir.config_parameter'].sudo().get_param(key, default=None)
    if plan_id and plan_id in PLANS:
        return plan_id
    return 'wholesale'


def get_company_plan(env, company):
    """Retourne la définition complète du forfait actif pour l'entreprise."""
    plan_id = get_company_plan_id(env, company)
    return PLANS.get(plan_id, PLANS['wholesale'])


def set_company_plan(env, company, plan_id):
    """Enregistre le forfait souscrit par l'entreprise et initialise ses applications autorisées."""
    if not company or plan_id not in PLANS:
        plan_id = 'wholesale'
    key = f'luumo_company_plan_{company.id}'
    env['ir.config_parameter'].sudo().set_param(key, plan_id)

    plan = PLANS[plan_id]
    set_company_enabled_apps(env, company, plan['allowed_apps'])
    return plan


def get_company_enabled_apps(env, company):
    """Récupère la liste des applications activées pour l'affichage écran.
    Contrainte stricte : les applications doivent OBLIGATOIREMENT faire partie
    des applications autorisées par le forfait de l'entreprise.
    """
    if not company:
        return list(ALL_APP_IDS)
    plan = get_company_plan(env, company)
    allowed = set(plan['allowed_apps'])

    key = f'luumo_enabled_apps_company_{company.id}'
    raw = env['ir.config_parameter'].sudo().get_param(key, default=None)
    if not raw:
        return list(plan['allowed_apps'])

    try:
        apps = json.loads(raw)
        if isinstance(apps, list):
            valid = [a for a in apps if a in allowed]
            if 'dashboard' in allowed and 'dashboard' not in valid:
                valid.append('dashboard')
            return valid if valid else list(plan['allowed_apps'])
    except Exception:
        pass
    return list(plan['allowed_apps'])


def set_company_enabled_apps(env, company, app_ids):
    """Enregistre les applications visibles sur l'accueil, en filtrant strictement
    selon les droits du forfait actif.
    """
    if not company:
        return list(ALL_APP_IDS)
    plan = get_company_plan(env, company)
    allowed = set(plan['allowed_apps'])

    # Ne retenir que les applications souscrites dans le forfait
    valid = [a for a in app_ids if a in allowed]
    if 'dashboard' in allowed and 'dashboard' not in valid:
        valid.append('dashboard')

    key = f'luumo_enabled_apps_company_{company.id}'
    env['ir.config_parameter'].sudo().set_param(key, json.dumps(valid))
    return valid


def upgrade_company_plan(env, company, new_plan_id):
    """Fait monter l'entreprise vers un forfait supérieur (Passage Boutique -> Grossiste, etc.)."""
    if not company or new_plan_id not in PLANS:
        return False
    return set_company_plan(env, company, new_plan_id)


def get_company_subscription_info(env, company):
    """Fournit un état complet de la souscription et des forfaits disponibles pour l'UI."""
    plan = get_company_plan(env, company)
    enabled = get_company_enabled_apps(env, company)
    return {
        'current_plan': plan,
        'allowed_apps': plan['allowed_apps'],
        'enabled_apps': enabled,
        'all_apps': ALL_APP_IDS,
        'plans': PLANS,
    }


def init_company_profile_apps(env, company, profile='wholesale'):
    """Initialise le forfait et les applications lors de la création d'entreprise."""
    return set_company_plan(env, company, profile)
