# -*- coding: utf-8 -*-
"""
Contrôleur Équipe, Collaborateurs & Dépenses de Fonctionnement
(`GET /hr/overview`, `POST /hr/employees/create`, `POST /hr/expenses/create`)
"""
from odoo import fields
from odoo.exceptions import ValidationError
from odoo.http import request

from ..services.accounting_service import ensure_company_infrastructure
from ..services.http_core import LuumoBaseController, luumo_route
from ..services.security_owasp import clean_text
from ..services.serializers import serialize_employee, serialize_expense


class LuumoHrController(LuumoBaseController):

    @luumo_route('/hr/overview', ['GET'])
    def hr_overview(self):
        def _do():
            env = request.env
            ensure_company_infrastructure(env, env.company)
            today = fields.Date.context_today(env.user)
            month_start = today.replace(day=1)

            employees = env['hr.employee'].search([
                ('company_id', '=', env.company.id)
            ], limit=100)
            if not employees:
                # Fallback pour voir les employés partagés ou sans société explicite
                employees = env['hr.employee'].search([], limit=100)

            expenses = env['hr.expense'].search([
                ('company_id', '=', env.company.id),
                ('date', '>=', month_start)
            ], limit=100, order='date desc, id desc')
            if not expenses:
                expenses = env['hr.expense'].search([], limit=100, order='date desc, id desc')

            serialized_emps = [serialize_employee(e) for e in employees]
            serialized_exps = [serialize_expense(ex) for ex in expenses]

            total_month = sum(x.get('total_amount', 0.0) for x in serialized_exps)
            today_str = fields.Date.to_string(today)
            today_cash_out = sum(
                x.get('total_amount', 0.0)
                for x in serialized_exps
                if x.get('date') == today_str and x.get('payment_mode') == 'company_account'
            )
            total_payroll = sum(e.get('monthly_wage', 0.0) for e in serialized_emps)

            return self._ok({
                'employees': serialized_emps,
                'expenses': serialized_exps,
                'kpis': {
                    'total_month_expenses': total_month,
                    'today_cash_out': today_cash_out,
                    'total_payroll': total_payroll,
                    'employees_count': len(serialized_emps),
                },
            }, currency=self._currency())
        return self._guard(_do)

    @luumo_route('/hr/employees/create', ['POST'])
    def create_employee(self):
        """Création directe d'une fiche collaborateur (bouton + Nouveau collaborateur)."""
        def _do():
            p = self._payload()
            name = clean_text(p.get('name'), 'Nom du collaborateur', min_len=2, max_len=100, required=True)
            job_title = clean_text(p.get('job_title') or 'Employé', 'Fonction / Rôle', max_len=100)
            work_phone = clean_text(p.get('work_phone') or '', 'Téléphone', max_len=30)
            dep_name = clean_text(p.get('department') or 'Boutique & Dépôt', 'Département', max_len=100)
            wage = float(p.get('monthly_wage') or 0.0)
            if wage < 0:
                raise ValidationError("Le salaire mensuel ne peut pas être négatif.")

            env = request.env
            Department = env['hr.department']
            dep = Department.search([
                ('name', '=ilike', dep_name),
                ('company_id', '=', env.company.id),
            ], limit=1)
            if not dep:
                dep = Department.create({
                    'name': dep_name,
                    'company_id': env.company.id,
                })

            vals = {
                'name': name,
                'job_title': job_title,
                'work_phone': work_phone,
                'department_id': dep.id,
                'company_id': env.company.id,
            }
            if wage > 0:
                vals['notes'] = f"WAGE:{wage}"

            employee = env['hr.employee'].sudo().create(vals)
            return self._ok(serialize_employee(employee), status=201)
        return self._guard(_do)

    @luumo_route('/hr/expenses/create', ['POST'])
    def create_expense(self):
        """Enregistrement d'une dépense d'exploitation ou sortie directe de caisse POS."""
        def _do():
            p = self._payload()
            name = clean_text(p.get('name'), 'Motif de la dépense', min_len=2, max_len=120, required=True)
            emp_name = clean_text(p.get('employee') or 'Équipe Boutique', 'Collaborateur', min_len=2, max_len=100)
            amount = float(p.get('total_amount') or 0)
            if amount <= 0:
                raise ValidationError("Le montant de la dépense doit être supérieur à 0 GNF.")

            from_cash = bool(p.get('from_cash', True))

            env = request.env
            ensure_company_infrastructure(env, env.company)
            Employee = env['hr.employee'].sudo()
            employee = Employee.search([
                ('name', '=ilike', emp_name),
                ('company_id', '=', env.company.id)
            ], limit=1)
            if not employee:
                employee = Employee.create({
                    'name': emp_name,
                    'company_id': env.company.id,
                })

            Product = env['product.product'].sudo()
            exp_product = Product.search([
                ('can_be_expensed', '=', True),
                '|', ('company_id', '=', False), ('company_id', '=', env.company.id)
            ], limit=1)
            if not exp_product:
                exp_product = Product.create({
                    'name': 'Frais de fonctionnement Luumo',
                    'can_be_expensed': True,
                    'sale_ok': False,
                    'purchase_ok': True,
                    'type': 'service',
                    'company_id': False,
                })

            expense = env['hr.expense'].sudo().create({
                'name': name,
                'employee_id': employee.id,
                'product_id': exp_product.id,
                'total_amount_currency': amount,
                'date': fields.Date.context_today(env.user),
                'company_id': env.company.id,
                'payment_mode': 'company_account' if from_cash else 'own_account',
            })
            return self._ok(serialize_expense(expense), status=201)
        return self._guard(_do)
