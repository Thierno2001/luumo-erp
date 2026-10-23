# -*- coding: utf-8 -*-
"""
Contrôleur Caisse (POS) & Ventes (`/orders`, `/orders/create`)
"""
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


class LuumoSalesController(LuumoBaseController):

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
            lines = p.get('lines') or []
            if not lines:
                return self._error("Au moins une ligne d'article est requise", 400)
            partner = resolve_order_partner(request.env, p.get('partner_id'))
            payment_method = p.get('payment', 'cash')
            if payment_method == 'credit' and partner == get_or_create_walkin_partner(request.env):
                return self._error('Une vente à crédit nécessite un client identifié', 400)

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

            ref = clean_text(p.get('reference'), 'Référence', max_len=80) or False
            order = request.env['sale.order'].create({
                'partner_id': partner.id,
                'order_line': order_lines,
                'client_order_ref': ref,
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

            return self._ok(serialize_order(order), status=201)
        return self._guard(_do)
