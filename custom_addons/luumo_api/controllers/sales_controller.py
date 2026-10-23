# -*- coding: utf-8 -*-
"""
Contrôleur Caisse (POS) & Ventes (`/orders`, `/orders/create`, `/orders/batch-sync`)
Supporte le mode Hybride B2B : encaissement direct et synchronisation par lot
des ventes réalisées hors-ligne avec déduplication idempotente (`client_order_ref`).
"""
import logging
from odoo.exceptions import ValidationError
from odoo.http import request

from ..services.accounting_service import (
    get_or_create_walkin_partner,
    get_payment_journal,
    resolve_order_partner,
    validate_picking_delivery,
)
from ..services.http_core import LuumoBaseController, luumo_route
from ..services.security_owasp import clean_text
from ..services.serializers import serialize_order

_logger = logging.getLogger(__name__)


class LuumoSalesController(LuumoBaseController):

    def _process_single_order(self, p):
        """Crée une commande, déduit le stock, valide la facture et enregistre le règlement.

        Supporte l'idempotence via ``client_order_ref`` pour éviter les doublons
        en cas de renvoi multiple après reconnexion réseau.
        """
        ref = clean_text(p.get('reference') or p.get('offline_uuid'), 'Référence', max_len=80) or False

        # Idempotence : si une commande avec cette référence locale existe déjà, on la retourne directement
        if ref:
            existing = request.env['sale.order'].search([
                ('client_order_ref', '=', ref),
                ('company_id', '=', request.env.company.id),
            ], limit=1)
            if existing:
                _logger.info("Commande déjà synchronisée (idempotence) : %s (ID %s)", ref, existing.id)
                return existing

        lines = p.get('lines') or []
        if not lines:
            raise ValidationError("Au moins une ligne d'article est requise.")

        partner = resolve_order_partner(request.env, p.get('partner_id'))
        payment_method = p.get('payment', 'cash')
        if payment_method == 'credit' and partner == get_or_create_walkin_partner(request.env):
            raise ValidationError("Une vente à crédit nécessite un client identifié.")

        order_lines = []
        for line in lines:
            qty = float(line.get('qty') or 1)
            if qty <= 0:
                raise ValidationError("La quantité commandée doit être strictement positive.")
            vals = {'product_id': int(line['product_id']), 'product_uom_qty': qty}
            if line.get('price_unit') is not None:
                price = float(line['price_unit'])
                if price < 0:
                    raise ValidationError("Le prix unitaire ne peut pas être négatif.")
                vals['price_unit'] = price
            order_lines.append((0, 0, vals))

        order = request.env['sale.order'].create({
            'partner_id': partner.id,
            'order_line': order_lines,
            'client_order_ref': ref,
            'company_id': request.env.company.id,
        })
        order.action_confirm()

        if p.get('deliver', True):
            validate_picking_delivery(order)

        invoice = order._create_invoices()
        invoice.action_post()

        if payment_method != 'credit':
            journal = get_payment_journal(request.env, payment_method)
            request.env['account.payment.register'].with_context(
                active_model='account.move',
                active_ids=invoice.ids,
            ).create({'journal_id': journal.id}).action_create_payments()

        return order

    @luumo_route('/orders', ['GET'])
    def list_orders(self, limit=30, offset=0, partner_id=None, **kw):
        def _do():
            domain = [('state', '=', 'sale')]
            if partner_id:
                domain.append(('partner_id', '=', self._int(partner_id, 0)))
            SaleOrder = request.env['sale.order']
            total = SaleOrder.search_count(domain)
            orders = SaleOrder.search(
                domain,
                limit=self._int(limit, 30),
                offset=self._int(offset, 0),
                order='date_order desc',
            )
            return self._ok(
                [serialize_order(o) for o in orders],
                total=total,
                currency=self._currency(),
            )
        return self._guard(_do)

    @luumo_route('/orders/create', ['POST'])
    def create_order(self):
        def _do():
            p = self._payload()
            order = self._process_single_order(p)
            return self._ok(serialize_order(order), status=201)
        return self._guard(_do)

    @luumo_route('/orders/batch-sync', ['POST'])
    def batch_sync_orders(self):
        """Endpoint B2B Hybride : reçoit une liste de ventes enregistrées en mode hors-ligne
        lors d'une coupure réseau, et les synchronise de manière transactionnelle et idempotente.
        """
        def _do():
            payload = self._payload()
            orders_to_sync = payload.get('orders') or []
            if not isinstance(orders_to_sync, list):
                return self._error("Le paramètre 'orders' doit être une liste.", 400)

            synced_results = []
            errors = []

            for item in orders_to_sync:
                client_uuid = item.get('offline_uuid') or item.get('reference') or ''
                try:
                    with request.env.cr.savepoint():
                        order = self._process_single_order(item)
                        synced_results.append({
                            'offline_uuid': client_uuid,
                            'order_id': order.id,
                            'name': order.name,
                            'amount_total': order.amount_total,
                            'state': 'synced',
                        })
                except Exception as ex:  # noqa: BLE001
                    _logger.warning("Échec de synchronisation de la commande hors-ligne %s : %s", client_uuid, ex)
                    errors.append({
                        'offline_uuid': client_uuid,
                        'error': str(ex),
                    })

            # Valider les commandes traitées avec succès
            if synced_results:
                request.env.cr.commit()

            return self._ok({
                'synced_count': len(synced_results),
                'error_count': len(errors),
                'synced': synced_results,
                'errors': errors,
            })
        return self._guard(_do)
