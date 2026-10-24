# -*- coding: utf-8 -*-
"""
Contrôleur Tableaux de Bord & Indicateurs Clés (`/dashboard`)
"""
from datetime import timedelta

from odoo import fields
from odoo.http import request

from ..services.http_core import LOW_STOCK_THRESHOLD, LuumoBaseController, luumo_route
from ..services.serializers import serialize_order, serialize_partner, serialize_product


class LuumoDashboardController(LuumoBaseController):

    @luumo_route('/dashboard', ['GET'])
    def dashboard(self):
        def _do():
            env = request.env
            today = fields.Date.context_today(env.user)
            month_start = today.replace(day=1)
            week_start = today - timedelta(days=6)

            SaleOrder = env['sale.order']
            confirmed = [('state', '=', 'sale')]

            today_groups = SaleOrder._read_group(
                confirmed + [('date_order', '>=', fields.Datetime.to_string(today))],
                aggregates=['amount_total:sum', '__count'],
            )
            today_total, today_count = today_groups[0] if today_groups else (0.0, 0)

            month_groups = SaleOrder._read_group(
                confirmed + [('date_order', '>=', fields.Datetime.to_string(month_start))],
                aggregates=['amount_total:sum', '__count'],
            )
            month_total, month_count = month_groups[0] if month_groups else (0.0, 0)

            daily = dict(
                (day.date() if hasattr(day, 'date') else day, total or 0.0)
                for day, total in SaleOrder._read_group(
                    confirmed + [('date_order', '>=', week_start)],
                    groupby=['date_order:day'],
                    aggregates=['amount_total:sum'],
                )
            )
            series = []
            for i in range(7):
                d = week_start + timedelta(days=i)
                if hasattr(d, 'date'):
                    d = d.date()
                series.append({'date': d.isoformat(), 'total': daily.get(d, 0.0)})

            receivable_groups = env['account.move']._read_group(
                [('move_type', '=', 'out_invoice'), ('state', '=', 'posted'),
                 ('payment_state', 'in', ('not_paid', 'partial'))],
                aggregates=['amount_residual_signed:sum', 'partner_id:count_distinct'],
            )
            receivable_total, debtor_count = receivable_groups[0] if receivable_groups else (0.0, 0)

            low_stock = env['product.product'].search(
                [('is_storable', '=', True), ('sale_ok', '=', True),
                 ('qty_available', '<', LOW_STOCK_THRESHOLD)],
                limit=8, order='name',
            )
            top_debtors = env['res.partner'].search(
                [('credit', '>', 0)], limit=200,
            ).sorted('credit', reverse=True)[:5]
            recent = SaleOrder.search(confirmed, limit=6, order='date_order desc')

            return self._ok({
                'kpis': {
                    'sales_today': today_total or 0.0,
                    'orders_today': today_count or 0,
                    'sales_month': month_total or 0.0,
                    'orders_month': month_count or 0,
                    'receivables': receivable_total or 0.0,
                    'debtors': debtor_count or 0,
                    'low_stock_count': len(low_stock),
                },
                'sales_7d': series,
                'low_stock': [serialize_product(p) for p in low_stock],
                'top_debtors': [serialize_partner(c) for c in top_debtors],
                'recent_orders': [serialize_order(o) for o in recent],
                'currency': self._currency(),
            })
        return self._guard(_do)
