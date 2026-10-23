# -*- coding: utf-8 -*-
"""
Services Métier Transverses : Comptabilité, Stock & Partenaires
===============================================================
Centralise les opérations transactionnelles partagées entre la Caisse (POS),
le Carnet de Dettes, l'Inventaire, les Achats et les Webhooks Mobile Money.
"""
from odoo.exceptions import UserError


def get_payment_journal(env, method):
    """Retourne le journal comptable correspondant au mode de paiement :
    - ``cash`` -> Journal Espèces
    - ``mobile_money`` / ``bank`` -> Journal Banque / Mobile Money
    """
    Journal = env['account.journal']
    company_domain = [('company_id', '=', env.company.id)]
    if method == 'cash':
        journal = Journal.search(company_domain + [('type', '=', 'cash')], limit=1)
    else:
        journal = Journal.search(company_domain + [('type', '=', 'bank')], limit=1)
    if not journal:
        raise UserError("Aucun journal de paiement configuré (Espèces / Banque).")
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
    warehouse = env['stock.warehouse'].search(
        [('company_id', '=', env.company.id)], limit=1
    )
    if not warehouse:
        raise UserError("Aucun entrepôt configuré pour cette entreprise.")
    env['stock.quant'].with_context(inventory_mode=True).create({
        'product_id': product.id,
        'location_id': warehouse.lot_stock_id.id,
        'inventory_quantity': max(0.0, qty),
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
