# -*- coding: utf-8 -*-
{
    'name': 'Luumo Base & Guinea Localization (360° ERP)',
    'version': '18.0.2.0.0',
    'category': 'Localization',
    'summary': 'Socle ERP 360° Luumo pour le marché Guinéen et Ouest-Africain (Modèles & Isolation SaaS)',
    'description': """
Luumo Base 360°
===============
Socle domaine et persistance PostgreSQL pour la plateforme Luumo :
- Devise GNF (Franc Guinéen, 0 décimale)
- Comptabilité SYSCOHADA révisé & TVA 18% (l10n_gn)
- Modèle transactionnel Mobile Money & QR Code (luumo.payment.transaction)
- Isolation Multi-Sociétés (ir.rule) & Paramètres marchands par entreprise
- Ventes, Stocks, Achats, Facturation/Dettes, Employés/Frais, Flotte
    """,
    'author': 'Luumo Team',
    'website': 'https://luumo.tech',
    'license': 'LGPL-3',
    'depends': [
        'base',
        'contacts',
        'sale_management',
        'sale_margin',
        'stock',
        'sale_stock',
        'purchase',
        'purchase_stock',
        'account',
        'l10n_gn',
        'hr',
        'hr_expense',
        'fleet',
    ],
    'data': [
        'security/ir.model.access.csv',
        'security/luumo_security.xml',
        'data/res_currency_data.xml',
    ],
    'installable': True,
    'application': True,
    'auto_install': False,
}
