# -*- coding: utf-8 -*-
"""
Services Métier Transverses : Comptabilité, Stock & Partenaires
===============================================================
Centralise les opérations transactionnelles partagées entre la Caisse (POS),
le Carnet de Dettes, l'Inventaire, les Achats et les Webhooks Mobile Money.
"""
import re
from odoo import SUPERUSER_ID
from odoo.exceptions import UserError


def ensure_company_warehouse(env, company=None):
    """Garantit qu'un entrepôt principal existe pour la société (requis par Odoo sale_stock)."""
    comp = company or env.company
    Warehouse = env['stock.warehouse'].sudo()
    wh = Warehouse.search([('company_id', '=', comp.id)], limit=1)
    if not wh:
        base_code = re.sub(r'[^A-Z0-9]', '', (comp.name or 'WH').upper())[:5] or f"W{comp.id}"[:5]
        code = base_code
        suffix = 1
        while Warehouse.search([('code', '=', code)], limit=1):
            code = f"{base_code[:3]}{suffix}"
            suffix += 1
        wh = Warehouse.create({
            'name': f"Dépôt Principal — {comp.name}",
            'code': code,
            'company_id': comp.id,
            'partner_id': comp.partner_id.id,
        })
    return wh


def ensure_company_infrastructure(env, company=None, user=None):
    """Garantit de façon universelle et automatique que TOUTE entreprise
    (existante ou nouvellement enregistrée) dispose de l'infrastructure ERP indispensable :
    1. Entrepôt principal de stockage (requis par sale_stock pour valider les ventes).
    2. Partenaire 'Client comptoir' dédié (requis pour les ventes comptoir POS).
    3. Journaux comptables de paiement (Espèces & Banque/Mobile Money).
    4. Collaborateur par défaut de l'entreprise (requis pour les dépenses/sorties de caisse).
    5. Droits opérationnels universels pour tout utilisateur de l'entreprise (Vente, Stock, Achat, Caisse, RH, Frais, Flotte).
    """
    su_env = env(user=SUPERUSER_ID)
    comp = company or env.company
    if not comp:
        return

    # 1. Entrepôt principal de stockage
    ensure_company_warehouse(su_env, comp)

    # 2. Client comptoir dédié
    get_or_create_walkin_partner(su_env)

    # 3. Journaux de paiement (Caisse & Banque)
    Journal = su_env['account.journal']
    comp_domain = [('company_id', '=', comp.id)]
    cash_j = Journal.search(comp_domain + [('type', '=', 'cash')], limit=1)
    if not cash_j:
        base_code = re.sub(r'[^A-Z0-9]', '', (comp.name or 'CSH').upper())[:3] or 'CSH'
        Journal.create({
            'name': f"Caisse — {comp.name}",
            'type': 'cash',
            'code': f"C{base_code[:3]}"[:5],
            'company_id': comp.id,
        })

    bank_j = Journal.search(comp_domain + [('type', '=', 'bank')], limit=1)
    if not bank_j:
        base_code = re.sub(r'[^A-Z0-9]', '', (comp.name or 'BNK').upper())[:3] or 'BNK'
        Journal.create({
            'name': f"Banque / Mobile Money — {comp.name}",
            'type': 'bank',
            'code': f"B{base_code[:3]}"[:5],
            'company_id': comp.id,
        })

    # 4. Collaborateur par défaut pour l'entreprise
    Employee = su_env['hr.employee']
    if not Employee.search([('company_id', '=', comp.id)], limit=1):
        Employee.create({
            'name': 'Direction',
            'job_title': 'Gérant de boutique',
            'company_id': comp.id,
        })

    # 5. Article de Frais universel
    Product = su_env['product.product']
    if not Product.search([('can_be_expensed', '=', True)], limit=1):
        Product.create({
            'name': 'Frais de fonctionnement Luumo',
            'can_be_expensed': True,
            'sale_ok': False,
            'purchase_ok': True,
            'type': 'service',
            'company_id': False,
        })

    # 6. Droits opérationnels universels pour l'utilisateur
    target_user = user or (env.user if env.user.id != SUPERUSER_ID else None)
    if target_user and target_user.id != SUPERUSER_ID:
        internal_group = su_env.ref('base.group_user', raise_if_not_found=False)
        # S'applique uniquement aux utilisateurs internes (non portail)
        if internal_group and internal_group.id in target_user.groups_id.ids:
            luumo_roles = [
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
            needed_groups = []
            for xmlid in luumo_roles:
                grp = su_env.ref(xmlid, raise_if_not_found=False)
                if grp and grp.id not in target_user.groups_id.ids:
                    needed_groups.append((4, grp.id))
            if needed_groups:
                target_user.sudo().write({'groups_id': needed_groups})


def get_payment_journal(env, method):
    """Retourne le journal comptable correspondant au mode de paiement :
    - ``cash`` -> Journal Espèces
    - ``mobile_money`` / ``bank`` -> Journal Banque / Mobile Money
    Garantit l'auto-création si manquant pour éviter tout blocage.
    """
    Journal = env['account.journal'].sudo()
    comp = env.company
    company_domain = [('company_id', '=', comp.id)]
    if method == 'cash':
        journal = Journal.search(company_domain + [('type', '=', 'cash')], limit=1)
        if not journal:
            base_code = re.sub(r'[^A-Z0-9]', '', (comp.name or 'CSH').upper())[:3] or 'CSH'
            journal = Journal.create({
                'name': f"Caisse — {comp.name}",
                'type': 'cash',
                'code': f"C{base_code[:3]}"[:5],
                'company_id': comp.id,
            })
    else:
        journal = Journal.search(company_domain + [('type', '=', 'bank')], limit=1)
        if not journal:
            base_code = re.sub(r'[^A-Z0-9]', '', (comp.name or 'BNK').upper())[:3] or 'BNK'
            journal = Journal.create({
                'name': f"Banque / Mobile Money — {comp.name}",
                'type': 'bank',
                'code': f"B{base_code[:3]}"[:5],
                'company_id': comp.id,
            })
    return journal


def reconcile_partner_receivables(env, partner):
    """Lettre automatiquement les paiements et les factures ouvertes du client (méthode FIFO)."""
    lines = env['account.move.line'].search([
        ('partner_id', '=', partner.commercial_partner_id.id),
        ('account_id.account_type', '=', 'asset_receivable'),
        ('parent_state', '=', 'posted'),
        ('reconciled', '=', False),
    ])
    debit = lines.filtered(lambda l: l.balance > 0).sorted('date')
    credit = lines.filtered(lambda l: l.balance < 0).sorted('date')
    for line in credit:
        for inv_line in debit.filtered(lambda l: not l.reconciled):
            if line.reconciled:
                break
            (line + inv_line).reconcile()


def validate_picking_delivery(order_or_po):
    """Valide immédiatement les bons de livraison (vente) ou de réception (achat) liés."""
    for picking in order_or_po.picking_ids.filtered(lambda pk: pk.state not in ('done', 'cancel')):
        for move in picking.move_ids:
            move.quantity = move.product_uom_qty
            move.picked = True
        picking.with_context(
            skip_backorder=True,
            skip_sms=True,
            cancel_backorder=True,
        ).button_validate()


def set_product_stock(env, product, qty):
    """Ajuste le stock physique disponible dans l'entrepôt principal de la société active."""
    warehouse = ensure_company_warehouse(env, env.company)
    env['stock.quant'].with_context(inventory_mode=True).create({
        'product_id': product.id,
        'location_id': warehouse.lot_stock_id.id,
        'inventory_quantity': max(0.0, qty),
        'company_id': env.company.id,
    }).action_apply_inventory()


def get_or_create_walkin_partner(env):
    """Retourne ou crée le client générique « Client comptoir » pour les ventes anonymes."""
    Partner = env['res.partner']
    partner = Partner.search([
        ('ref', '=', 'LUUMO-COMPTOIR'),
        '|', ('company_id', '=', False), ('company_id', '=', env.company.id),
    ], limit=1)
    if not partner:
        partner = Partner.create({
            'name': 'Client comptoir',
            'ref': 'LUUMO-COMPTOIR',
            'company_id': env.company.id,
            'customer_rank': 1,
        })
    return partner


def resolve_order_partner(env, partner_id):
    """Résout le client d'une commande ou replie sur « Client comptoir »."""
    if partner_id:
        partner = env['res.partner'].browse(int(partner_id)).exists()
        if not partner:
            raise UserError('Client introuvable.')
        return partner
    return get_or_create_walkin_partner(env)
