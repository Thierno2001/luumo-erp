# -*- coding: utf-8 -*-
"""
Service de gestion modulaire des applications Luumo par entreprise
==================================================================
Permet à chaque PME d'activer / masquer les applications selon son secteur :
- Niveau 1 : Profil initial à l'inscription (Détail, Grossiste, Services)
- Niveau 2 : Activation / Désactivation à la carte dans les paramètres
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

PROFILE_DEFAULTS = {
    # 1. Commerce de détail (Boutique, superette, pharmacie, quincaillerie)
    'retail': ['pos', 'inventory', 'customers', 'dashboard'],
    # 2. Grossiste & Import (Madina, matériaux, agroalimentaire, conteneurs)
    'wholesale': ['pos', 'orders', 'dashboard', 'inventory', 'purchases', 'customers', 'hr', 'fleet'],
    # 3. Prestations de services & B2B (Cabinet, transit, agence)
    'services': ['orders', 'customers', 'hr', 'dashboard'],
}


def get_company_enabled_apps(env, company):
    """Récupère la liste des applications activées pour une entreprise.
    Si non configurée (ancienne entreprise), active par défaut toutes les applications
    pour garantir une stricte compatibilité ascendante sans régression.
    """
    if not company:
        return list(ALL_APP_IDS)
    key = f'luumo_enabled_apps_company_{company.id}'
    raw = env['ir.config_parameter'].sudo().get_param(key, default=None)
    if not raw:
        return list(ALL_APP_IDS)
    try:
        apps = json.loads(raw)
        if isinstance(apps, list):
            valid = [a for a in apps if a in ALL_APP_IDS]
            if 'dashboard' not in valid:
                valid.append('dashboard')
            return valid
    except Exception:
        pass
    return list(ALL_APP_IDS)


def set_company_enabled_apps(env, company, app_ids):
    """Enregistre les applications activées pour l'entreprise."""
    if not company:
        return list(ALL_APP_IDS)
    valid = [a for a in app_ids if a in ALL_APP_IDS]
    if 'dashboard' not in valid:
        valid.append('dashboard')
    key = f'luumo_enabled_apps_company_{company.id}'
    env['ir.config_parameter'].sudo().set_param(key, json.dumps(valid))
    return valid


def init_company_profile_apps(env, company, profile='wholesale'):
    """Initialise les applications à la création selon le profil métier sélectionné."""
    defaults = PROFILE_DEFAULTS.get(profile, PROFILE_DEFAULTS['wholesale'])
    return set_company_enabled_apps(env, company, defaults)
