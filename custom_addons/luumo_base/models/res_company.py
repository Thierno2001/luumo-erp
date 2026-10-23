# -*- coding: utf-8 -*-
from odoo import fields, models


class ResCompany(models.Model):
    _inherit = 'res.company'

    luumo_merchant_code = fields.Char(
        string='Code Marchand Mobile Money',
        default='620145',
        help='Code marchand principal utilisé pour générer les QR Codes et USSD.',
    )
    luumo_orange_msisdn = fields.Char(
        string='Compte Marchand Orange Money',
        help='Numéro ou code marchand Orange Money Guinée.',
    )
    luumo_mtn_msisdn = fields.Char(
        string='Compte Marchand MTN MoMo',
        help='Numéro ou code marchand MTN MoMoPay Guinée.',
    )
    luumo_paycard_code = fields.Char(
        string='Identifiant Marchand PayCard',
        help='Code marchand PayCard Guinée.',
    )
