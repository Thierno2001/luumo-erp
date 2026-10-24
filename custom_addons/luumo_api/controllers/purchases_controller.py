# -*- coding: utf-8 -*-
"""
Contrôleur Achats, Importations & Réceptions Fournisseurs
(`/purchases`, `/purchases/create`, `/purchases/<id>/receive`)
"""
from odoo.http import request

from ..services.accounting_service import ensure_company_infrastructure, validate_picking_delivery
from ..services.http_core import LuumoBaseController, luumo_route
from ..services.security_owasp import clean_text
from ..services.serializers import serialize_purchase


class LuumoPurchasesController(LuumoBaseController):

    @luumo_route('/purchases', ['GET'])
    def list_purchases(self, limit=40, offset=0, **kw):
        def _do():
            PO = request.env['purchase.order']
            orders = PO.search(
                [],
                limit=self._int(limit, 40),
                offset=self._int(offset, 0),
                order='date_order desc',
            )
            return self._ok(
                [serialize_purchase(po) for po in orders],
                total=PO.search_count([]),
                currency=self._currency(),
            )
        return self._guard(_do)

    @luumo_route('/purchases/create', ['POST'])
    def create_purchase(self):
        def _do():
            ensure_company_infrastructure(request.env, request.env.company)
            p = self._payload()
            lines = p.get('lines') or []
            if not lines:
                return self._error("Au moins une ligne d'achat est requise", 400)
            partner_id = p.get('partner_id')
            Partner = request.env['res.partner']
            if partner_id:
                supplier = Partner.browse(int(partner_id)).exists()
            else:
                sup_name = clean_text(
                    p.get('supplier_name') or 'Fournisseur Import Conakry',
                    'Nom du fournisseur',
                    min_len=2,
                    max_len=100,
                    required=True,
                )
                supplier = Partner.create({
                    'name': sup_name,
                    'is_company': True,
                    'company_id': request.env.company.id,
                    'supplier_rank': 1,
                })
            order_lines = [(0, 0, {
                'product_id': int(l['product_id']),
                'product_qty': max(0.01, float(l.get('qty') or 1)),
                'price_unit': max(0.0, float(l.get('price_unit') or 0)),
            }) for l in lines]
            po = request.env['purchase.order'].create({
                'partner_id': supplier.id,
                'company_id': request.env.company.id,
                'order_line': order_lines,
            })
            po.button_confirm()
            if p.get('receive_now', True):
                validate_picking_delivery(po)
            return self._ok(serialize_purchase(po), status=201)
        return self._guard(_do)

    @luumo_route('/purchases/<int:po_id>/receive', ['POST'])
    def receive_purchase(self, po_id):
        def _do():
            po = request.env['purchase.order'].browse(po_id).exists()
            if not po:
                return self._error('Commande fournisseur introuvable', 404)
            validate_picking_delivery(po)
            return self._ok(serialize_purchase(po))
        return self._guard(_do)
