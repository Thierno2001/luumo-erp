# -*- coding: utf-8 -*-
"""
Sérialiseurs JSON pour les modèles métier Luumo
===============================================
Garantit un contrat d'interface (DTO) identique et stable entre le backend
et les frontends Web (`luumo_web`) et Mobile (`luumo_mobile`).
"""
from odoo import fields


def serialize_product(p):
    return {
        'id': p.id,
        'name': p.display_name,
        'default_code': p.default_code or '',
        'barcode': p.barcode or '',
        'list_price': p.lst_price,
        'standard_price': p.standard_price,
        'qty_available': p.qty_available if p.is_storable else None,
        'is_storable': p.is_storable,
        'uom': p.uom_id.name,
        'category': p.categ_id.name,
        'image_url': f'/web/image/product.product/{p.id}/image_128' if p.image_128 else None,
    }


def serialize_partner(c):
    return {
        'id': c.id,
        'name': c.name,
        'is_company': bool(c.is_company),
        'company_type': 'company' if c.is_company else 'person',
        'phone': c.phone or c.mobile or '',
        'email': c.email or '',
        'street': c.street or '',
        'city': c.city or '',
        'vat': c.vat or '',
        'credit': c.credit,
    }


def serialize_order(o):
    return {
        'id': o.id,
        'name': o.name,
        'date': fields.Datetime.to_string(o.date_order),
        'partner': {'id': o.partner_id.id, 'name': o.partner_id.name},
        'state': o.state,
        'amount_total': o.amount_total,
        'amount_untaxed': o.amount_untaxed,
        'invoice_status': o.invoice_status,
        'payment_state': (o.invoice_ids[:1].payment_state if o.invoice_ids else 'not_invoiced'),
        'lines': [{
            'product_id': l.product_id.id,
            'name': l.product_id.display_name,
            'qty': l.product_uom_qty,
            'price_unit': l.price_unit,
            'subtotal': l.price_subtotal,
        } for l in o.order_line if not l.display_type],
    }


def serialize_purchase(po):
    received = bool(po.picking_ids) and all(
        pk.state == 'done' for pk in po.picking_ids.filtered(lambda x: x.state != 'cancel')
    )
    return {
        'id': po.id,
        'name': po.name,
        'date': fields.Datetime.to_string(po.date_order),
        'partner': {'id': po.partner_id.id, 'name': po.partner_id.name},
        'state': po.state,
        'received': received,
        'amount_total': po.amount_total,
        'lines': [{
            'product_id': l.product_id.id,
            'name': l.product_id.display_name,
            'qty': l.product_qty,
            'price_unit': l.price_unit,
            'subtotal': l.price_subtotal,
        } for l in po.order_line if not l.display_type],
    }


def serialize_employee(e):
    wage = 0.0
    if e.notes and 'WAGE:' in e.notes:
        try:
            for part in e.notes.split(';'):
                if part.startswith('WAGE:'):
                    wage = float(part.split(':')[1])
        except Exception:
            pass
    return {
        'id': e.id,
        'name': e.name,
        'job_title': e.job_title or 'Employé',
        'work_phone': e.work_phone or e.mobile_phone or '',
        'department': e.department_id.name or 'Boutique & Dépôt',
        'monthly_wage': wage,
    }


def serialize_expense(ex):
    return {
        'id': ex.id,
        'name': ex.name,
        'date': fields.Date.to_string(ex.date),
        'employee': ex.employee_id.name,
        'total_amount': ex.total_amount,
        'state': ex.state,
        'payment_mode': ex.payment_mode or 'company_account',
    }


def serialize_vehicle(v):
    return {
        'id': v.id,
        'name': v.name,
        'license_plate': v.license_plate or '',
        'driver': v.driver_id.name or 'Non assigné',
        'odometer': v.odometer,
    }
