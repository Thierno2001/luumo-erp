# -*- coding: utf-8 -*-
"""
Contrôleur Équipe & Dépenses de Fonctionnement (`/hr/overview`, `/hr/expenses/create`)
"""
from odoo import fields
from odoo.exceptions import ValidationError
from odoo.http import request

from ..services.http_core import LuumoBaseController, luumo_route
from ..services.security_owasp import clean_text
from ..services.serializers import serialize_employee, serialize_expense


class LuumoHrController(LuumoBaseController):

    @luumo_route('/hr/overview', ['GET'])
    def hr_overview(self):
        def _do():
            employees = request.env['hr.employee'].search([], limit=50)
            expenses = request.env['hr.expense'].search([], limit=50, order='date desc')
            return self._ok({
                'employees': [serialize_employee(e) for e in employees],
                'expenses': [serialize_expense(ex) for ex in expenses],
            }, currency=self._currency())
        return self._guard(_do)

    @luumo_route('/hr/expenses/create', ['POST'])
    def create_expense(self):
        def _do():
            p = self._payload()
            name = clean_text(p.get('name'), 'Motif de la dépense', min_len=2, max_len=120, required=True)
            emp_name = clean_text(p.get('employee') or 'Équipe Boutique', 'Collaborateur', min_len=2, max_len=100)
            amount = float(p.get('total_amount') or 0)
            if amount <= 0:
                raise ValidationError("Le montant de la dépense doit être supérieur à 0 GNF.")

            Employee = request.env['hr.employee']
            employee = Employee.search([('name', '=ilike', emp_name)], limit=1)
            if not employee:
                employee = Employee.create({
                    'name': emp_name,
                    'company_id': request.env.company.id,
                })

            Product = request.env['product.product']
            exp_product = Product.search([('can_be_expensed', '=', True)], limit=1)
            if not exp_product:
                exp_product = Product.create({
                    'name': 'Frais de fonctionnement Luumo',
                    'can_be_expensed': True,
                    'sale_ok': False,
                    'purchase_ok': True,
                    'type': 'service',
                })

            expense = request.env['hr.expense'].create({
                'name': name,
                'employee_id': employee.id,
                'product_id': exp_product.id,
                'total_amount_currency': amount,
                'date': fields.Date.context_today(request.env.user),
                'company_id': request.env.company.id,
            })
            return self._ok(serialize_expense(expense), status=201)
        return self._guard(_do)
