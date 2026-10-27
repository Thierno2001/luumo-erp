# -*- coding: utf-8 -*-
"""
Service de Gestion des Rôles & Privilèges (RBAC) Luumo
======================================================
Définit les profils métier et restreint l'accès aux applications :
1. platform_admin : Super-Admin Plateforme (Backoffice exclusif /admin, aucune caisse locale).
2. manager        : Gérant / Propriétaire (accès complet aux applications du forfait souscrit).
3. cashier        : Caissier / Vendeur (Point de vente /pos et carnet clients /customers).
4. stock_keeper   : Magasinier (Inventaire /products et commandes fournisseurs /purchases).
5. accountant     : Comptable (Factures /orders, dettes /customers, charges /hr, bilan /dashboard).
"""
import logging
from odoo import SUPERUSER_ID, fields
from .apps_service import get_company_enabled_apps

_logger = logging.getLogger(__name__)

LUUMO_ROLES = {
    'platform_admin': {
        'id': 'platform_admin',
        'name': 'Super-Admin Plateforme',
        'description': 'Opérateur racine de la plateforme Luumo (supervision multi-tenants, MRR, Mobile Money).',
        'allowed_apps': [],  # N'accède pas aux caisses ou stocks locaux d'un commerce individuel
        'is_platform_admin': True,
    },
    'manager': {
        'id': 'manager',
        'name': 'Gérant / Propriétaire',
        'description': 'Propriétaire ou directeur du commerce (accès complet à toutes les applications de la boutique).',
        'allowed_apps': ['pos', 'orders', 'dashboard', 'inventory', 'purchases', 'customers', 'hr', 'fleet'],
        'is_platform_admin': False,
    },
    'cashier': {
        'id': 'cashier',
        'name': 'Caissier / Vendeur',
        'description': 'Encaissement rapide au comptoir, recherche de prix, encaissement de dettes.',
        'allowed_apps': ['pos', 'customers'],
        'is_platform_admin': False,
    },
    'stock_keeper': {
        'id': 'stock_keeper',
        'name': 'Magasinier / Gestionnaire de Dépôt',
        'description': 'Entrées/sorties de stock, inventaire physique et réception des commandes fournisseurs.',
        'allowed_apps': ['inventory', 'purchases'],
        'is_platform_admin': False,
    },
    'accountant': {
        'id': 'accountant',
        'name': 'Comptable / Gestionnaire Financier',
        'description': 'Suivi des factures, créances clients, salaires et tableaux de bord financiers.',
        'allowed_apps': ['orders', 'customers', 'hr', 'dashboard'],
        'is_platform_admin': False,
    },
}


def is_superuser_or_system(user):
    if not user or user._is_public():
        return False
    return (
        user.id == 1
        or user.id == SUPERUSER_ID
        or user.has_group('base.group_system')
    )


def get_user_role(env, user):
    """Retourne l'identifiant du rôle actif de l'utilisateur."""
    if not user or user._is_public():
        return 'cashier'

    if is_superuser_or_system(user):
        return 'platform_admin'

    param_key = f'luumo_user_role_{user.id}'
    stored_role = env['ir.config_parameter'].sudo().get_param(param_key, default=None)
    if stored_role and stored_role in LUUMO_ROLES:
        return stored_role

    # Rôle par défaut : manager pour les utilisateurs internes d'un commerce
    return 'manager'


def set_user_role(env, user, role_id):
    """Assigne un nouveau rôle à un utilisateur et ajuste les groupes système."""
    if not user or role_id not in LUUMO_ROLES:
        raise ValueError(f"Rôle invalide : {role_id}")

    su_env = env(user=SUPERUSER_ID)
    param_key = f'luumo_user_role_{user.id}'
    su_env['ir.config_parameter'].sudo().set_param(param_key, role_id)

    sys_group = su_env.ref('base.group_system', raise_if_not_found=False)
    if role_id == 'platform_admin':
        if sys_group and sys_group.id not in user.groups_id.ids:
            user.sudo().write({'groups_id': [(4, sys_group.id)]})
    else:
        # Ne jamais dégrader l'utilisateur racine Odoo ID 1
        if user.id not in (1, SUPERUSER_ID) and sys_group and sys_group.id in user.groups_id.ids:
            user.sudo().write({'groups_id': [(3, sys_group.id)]})

    return LUUMO_ROLES[role_id]


def get_user_allowed_apps(env, user):
    """Calcule la liste des applications autorisées pour l'utilisateur en croisant
    les privilèges de son rôle et les applications activées sur le forfait de son entreprise.
    """
    if not user or user._is_public():
        return []

    role_id = get_user_role(env, user)
    if role_id == 'platform_admin':
        # Le Super-Admin est dédié à la plateforme (/admin) et ne gère pas de boutique au détail
        return []

    role_info = LUUMO_ROLES.get(role_id, LUUMO_ROLES['manager'])
    company_apps = get_company_enabled_apps(env, user.company_id)

    # Intersection ordonnée
    return [app for app in role_info['allowed_apps'] if app in company_apps]


def can_user_access_app(env, user, app_id):
    """Vérifie si l'utilisateur a le privilège d'accéder à l'application `app_id`."""
    if not user or user._is_public():
        return False

    role_id = get_user_role(env, user)

    if role_id == 'platform_admin':
        # Le Super-Admin a accès exclusif à l'administration de la plateforme
        return app_id == 'admin'

    if app_id == 'admin':
        return False

    allowed = get_user_allowed_apps(env, user)
    return app_id in allowed
