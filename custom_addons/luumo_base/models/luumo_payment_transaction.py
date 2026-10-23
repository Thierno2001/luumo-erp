# -*- coding: utf-8 -*-
import secrets
from datetime import timedelta

from odoo import api, fields, models


class LuumoPaymentTransaction(models.Model):
    """Transaction d'encaissement Mobile Money / QR Code persistée en base PostgreSQL.

    Permet au backend d'être totalement sans état (stateless) et compatible avec
    plusieurs workers Gunicorn/Odoo, tout en assurant une traçabilité comptable
    et un cloisonnement Multi-Sociétés (`company_id`).
    """
    _name = 'luumo.payment.transaction'
    _description = 'Transaction Mobile Money & QR Code Luumo'
    _order = 'create_date desc, id desc'
    _rec_name = 'tx_ref'

    tx_ref = fields.Char(
        string='Référence Transaction',
        required=True,
        index=True,
        copy=False,
        readonly=True,
    )
    company_id = fields.Many2one(
        'res.company',
        string='Entreprise',
        required=True,
        default=lambda self: self.env.company,
        index=True,
    )
    partner_id = fields.Many2one(
        'res.partner',
        string='Client',
        index=True,
    )
    provider = fields.Selection(
        selection=[
            ('orange_money', 'Orange Money Guinée'),
            ('mtn_momo', 'MTN MoMoPay'),
            ('paycard', 'PayCard Guinée'),
        ],
        string='Opérateur',
        required=True,
        default='orange_money',
        index=True,
    )
    merchant_code = fields.Char(
        string='Code Marchand',
        required=True,
    )
    amount = fields.Float(
        string='Montant (GNF)',
        required=True,
         digits=(16, 0),
    )
    currency_code = fields.Char(
        string='Devise',
        default='GNF',
        required=True,
    )
    customer_phone = fields.Char(
        string='Téléphone Client',
    )
    qr_payload = fields.Text(
        string='Payload QR Code',
        required=True,
    )
    ussd_code = fields.Char(
        string='Code USSD de secours',
        required=True,
    )
    state = fields.Selection(
        selection=[
            ('pending', 'En attente'),
            ('paid', 'Payé'),
            ('failed', 'Échoué'),
            ('expired', 'Expiré'),
        ],
        string='Statut',
        default='pending',
        required=True,
        index=True,
    )
    gateway_mode = fields.Selection(
        selection=[
            ('local_qr', 'QR Marchand Local'),
            ('live_api', 'Passerelle B2B Temps Réel'),
        ],
        string='Mode Passerelle',
        default='local_qr',
        required=True,
    )
    operator_tx_id = fields.Char(
        string='Réf. Opérateur (SMS/Webhook)',
        index=True,
    )
    expires_at = fields.Datetime(
        string='Date d’expiration',
        required=True,
        default=lambda self: fields.Datetime.now() + timedelta(minutes=10),
    )
    confirmed_at = fields.Datetime(
        string='Date de confirmation',
    )

    _sql_constraints = [
        ('tx_ref_uniq', 'unique(tx_ref)', 'La référence de transaction Mobile Money doit être unique.'),
    ]

    def check_expiration(self):
        """Passe automatiquement les transactions en attente dépassées à ``expired``."""
        now = fields.Datetime.now()
        for rec in self:
            if rec.state == 'pending' and rec.expires_at and now > rec.expires_at:
                rec.sudo().write({'state': 'expired'})

    def mark_as_paid(self, operator_tx_id=None):
        """Confirme la transaction suite au Webhook opérateur."""
        self.ensure_one()
        prefix = (
            'OM' if self.provider == 'orange_money'
            else 'MOMO' if self.provider == 'mtn_momo'
            else 'PYC'
        )
        op_id = operator_tx_id or f"{prefix}{fields.Date.today().strftime('%y%m%d')}.{secrets.token_hex(3).upper()}"
        self.sudo().write({
            'state': 'paid',
            'operator_tx_id': op_id,
            'confirmed_at': fields.Datetime.now(),
        })
        return op_id

    @api.model
    def _dt_to_epoch(self, dt_val):
        if not dt_val:
            return None
        return int(fields.Datetime.to_datetime(dt_val).timestamp())

    def to_api_dict(self):
        """Sérialise l'enregistrement au format attendu par les frontends Luumo Web & Mobile."""
        self.ensure_one()
        self.check_expiration()
        return {
            'tx_ref': self.tx_ref,
            'provider': self.provider,
            'merchant_code': self.merchant_code,
            'amount': round(self.amount),
            'currency': self.currency_code or 'GNF',
            'customer_phone': self.customer_phone or '',
            'qr_payload': self.qr_payload,
            'ussd_code': self.ussd_code,
            'state': self.state,
            'gateway_mode': self.gateway_mode,
            'operator_tx_id': self.operator_tx_id or None,
            'created_at': self._dt_to_epoch(self.create_date) or int(fields.Datetime.now().timestamp()),
            'expires_at': self._dt_to_epoch(self.expires_at),
            'confirmed_at': self._dt_to_epoch(self.confirmed_at),
        }
