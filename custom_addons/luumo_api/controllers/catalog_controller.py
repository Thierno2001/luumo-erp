# -*- coding: utf-8 -*-
"""
Contrôleur Catalogue Produits & Inventaire (`/products`, `/products/create`, `/products/<id>/stock`)
"""
from odoo.exceptions import ValidationError
from odoo.http import request

from ..services.accounting_service import set_product_stock
from ..services.http_core import LuumoBaseController, luumo_route
from ..services.security_owasp import clean_text
from ..services.serializers import serialize_product


class LuumoCatalogController(LuumoBaseController):

    @luumo_route('/products', ['GET'])
    def list_products(self, search='', limit=50, offset=0, barcode=None, **kw):
        def _do():
            domain = [('sale_ok', '=', True)]
            if barcode:
                clean_bc = clean_text(barcode, 'Code-barres', max_len=64)
                domain.append(('barcode', '=', clean_bc))
            elif search:
                clean_q = clean_text(search, 'Recherche', max_len=80)
                domain += [
                    '|', '|',
                    ('name', 'ilike', clean_q),
                    ('default_code', 'ilike', clean_q),
                    ('barcode', 'ilike', clean_q),
                ]
            Product = request.env['product.product']
            total = Product.search_count(domain)
            products = Product.search(
                domain,
                limit=self._int(limit, 50),
                offset=self._int(offset, 0),
                order='name',
            )
            return self._ok(
                [serialize_product(p) for p in products],
                total=total,
                currency=self._currency(),
            )
        return self._guard(_do)

    @luumo_route('/products/create', ['POST'])
    def create_product(self):
        def _do():
            p = self._payload()
            name = clean_text(p.get('name'), "Nom de l'article", min_len=2, max_len=120, required=True)
            list_price = float(p.get('list_price') or 0)
            standard_price = float(p.get('standard_price') or 0)
            if list_price < 0 or standard_price < 0:
                raise ValidationError("Les prix ne peuvent pas être négatifs.")
            barcode = clean_text(p.get('barcode'), 'Code-barres', max_len=64) or False
            default_code = clean_text(p.get('default_code'), 'Référence', max_len=64) or False

            product = request.env['product.product'].create({
                'name': name,
                'lst_price': list_price,
                'standard_price': standard_price,
                'barcode': barcode,
                'default_code': default_code,
                'is_storable': bool(p.get('is_storable', True)),
                'sale_ok': True,
                'company_id': request.env.company.id,
            })
            if p.get('initial_qty'):
                set_product_stock(request.env, product, float(p['initial_qty']))
            return self._ok(serialize_product(product), status=201)
        return self._guard(_do)

    @luumo_route('/products/<int:product_id>/stock', ['POST'])
    def update_stock(self, product_id):
        def _do():
            p = self._payload()
            if 'qty' not in p:
                return self._error('Champ "qty" requis', 400)
            new_qty = float(p['qty'])
            if new_qty < 0:
                raise ValidationError("La quantité en stock ne peut pas être négative.")
            product = request.env['product.product'].browse(product_id).exists()
            if not product:
                return self._error('Article introuvable', 404)
            set_product_stock(request.env, product, new_qty)
            return self._ok(serialize_product(product))
        return self._guard(_do)
