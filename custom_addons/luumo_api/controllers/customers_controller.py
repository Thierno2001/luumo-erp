# -*- coding: utf-8 -*-
"""
Contrôleur Clients, Entreprises B2B & Carnet de Dettes
(`/customers`, `/customers/create`, `/customers/<id>`, `/customers/<id>/payment`)
"""
from odoo import fields
from odoo.http import request

from ..services.accounting_service import get_payment_journal, reconcile_partner_receivables
from ..services.http_core import LuumoBaseController, luumo_route
from ..services.security_owasp import clean_text, validate_email, validate_phone, validate_vat_nif
from ..services.serializers import serialize_order, serialize_partner


class LuumoCustomersController(LuumoBaseController):

    @luumo_route('/customers', ['GET'])
    def list_customers(self, search='', limit=50, offset=0, debtors_only=None, **kw):
        def _do():
            domain = [('customer_rank', '>', 0)]
            if search:
                clean_q = clean_text(search, 'Recherche client', max_len=80)
                domain += [
                    '|', '|', '|',
                    ('name', 'ilike', clean_q),
                    ('phone', 'ilike', clean_q),
                    ('mobile', 'ilike', clean_q),
                    ('vat', 'ilike', clean_q),
                ]
            if debtors_only in ('1', 'true', 'True'):
                domain.append(('credit', '>', 0))
            Partner = request.env['res.partner']
            total = Partner.search_count(domain)
            customers = Partner.search(
                domain,
                limit=self._int(limit, 50),
                offset=self._int(offset, 0),
                order='name',
            )
            return self._ok(
                [serialize_partner(c) for c in customers],
                total=total,
                currency=self._currency(),
            )
        return self._guard(_do)

    @luumo_route('/customers/create', ['POST'])
    def create_customer(self):
        def _do():
            p = self._payload()
            is_company = bool(p.get('is_company', False)) or p.get('company_type') == 'company'
            label = "Raison sociale de l'entreprise" if is_company else "Nom complet du client"
            name = clean_text(p.get('name'), label, min_len=2, max_len=100, required=True)
            phone = validate_phone(p.get('phone'), required=False)
            email = validate_email(p.get('email'), required=False) if p.get('email') else ''
            street = clean_text(p.get('street'), 'Quartier / Adresse', max_len=120, required=False)
            city = clean_text(p.get('city') or 'Conakry', 'Ville', max_len=80, required=False) or 'Conakry'
            vat = validate_vat_nif(p.get('vat'), required=False)

            country = request.env.ref('base.gn', raise_if_not_found=False)
            partner = request.env['res.partner'].create({
                'name': name,
                'is_company': is_company,
                'company_type': 'company' if is_company else 'person',
                'phone': phone or False,
                'email': email or False,
                'street': street or False,
                'city': city,
                'vat': vat or False,
                'country_id': country.id if country else False,
                'company_id': request.env.company.id,
                'customer_rank': 1,
            })
            return self._ok(serialize_partner(partner), status=201)
        return self._guard(_do)

    @luumo_route('/customers/<int:partner_id>', ['GET'])
    def customer_detail(self, partner_id):
        def _do():
            partner = request.env['res.partner'].browse(partner_id).exists()
            if not partner:
                return self._error('Client introuvable', 404)
            orders = request.env['sale.order'].search(
                [('partner_id', '=', partner.id), ('state', '=', 'sale')],
                limit=20,
                order='date_order desc',
            )
            payments = request.env['account.payment'].search(
                [('partner_id', '=', partner.id), ('payment_type', '=', 'inbound'),
                 ('state', 'not in', ('draft', 'canceled'))],
                limit=20,
                order='date desc',
            )
            data = serialize_partner(partner)
            data['orders'] = [serialize_order(o) for o in orders]
            data['payments'] = [{
                'id': pay.id,
                'name': pay.name,
                'date': fields.Date.to_string(pay.date),
                'amount': pay.amount,
                'journal': pay.journal_id.name,
            } for pay in payments]
            return self._ok(data, currency=self._currency())
        return self._guard(_do)

    @luumo_route('/customers/<int:partner_id>/payment', ['POST'])
    def customer_payment(self, partner_id):
        def _do():
            p = self._payload()
            partner = request.env['res.partner'].browse(partner_id).exists()
            if not partner:
                return self._error('Client introuvable', 404)
            amount = float(p.get('amount') or 0)
            if amount <= 0:
                return self._error('Montant invalide', 400)
            journal = get_payment_journal(request.env, p.get('method', 'cash'))
            memo = clean_text(p.get('memo') or 'Remboursement Luumo', 'Libellé', max_len=100)
            payment = request.env['account.payment'].create({
                'partner_id': partner.id,
                'partner_type': 'customer',
                'payment_type': 'inbound',
                'amount': amount,
                'journal_id': journal.id,
                'memo': memo,
            })
            payment.action_post()
            reconcile_partner_receivables(request.env, partner)
            return self._ok(serialize_partner(partner), status=201)
        return self._guard(_do)
