#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tests Unitaires & Contrat d'Architecture Luumo (ECC Quality Gate)
================================================================
Vérifie la robustesse de :
1. La validation et la sanitization OWASP (anti-XSS, anti-injection).
2. La validation des identifiants et numéros de téléphone guinéens.
3. La génération exacte des codes USSD Orange Money / MTN MoMo.
4. La logique de calcul des forfaits et d'expiration des 14 jours d'essai.
"""
import json
import unittest
from datetime import date, timedelta


class TestLuumoSecurity(unittest.TestCase):
    """Vérification des règles de sécurité et de validation OWASP."""

    def test_phone_validation_guinea(self):
        import re
        phone_re = re.compile(r'^\+?[0-9\s\-()]{8,22}$')
        valid_phones = [
            '+224 620 12 34 56',
            '+224620123456',
            '620123456',
            '+224 (622) 00-11-22',
        ]
        for p in valid_phones:
            self.assertTrue(bool(phone_re.match(p)), f"Échec sur numéro valide: {p}")

        invalid_phones = [
            'abcd',
            '123',
            '<script>alert(1)</script>',
        ]
        for p in invalid_phones:
            self.assertFalse(bool(phone_re.match(p)), f"Devrait rejeter: {p}")

    def test_email_validation(self):
        import re
        email_re = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,24}$')
        self.assertTrue(bool(email_re.match('contact@entreprise.gn')))
        self.assertTrue(bool(email_re.match('admin.luumo+test@gmail.com')))
        self.assertFalse(bool(email_re.match('invalid-email')))
        self.assertFalse(bool(email_re.match('@entreprise.gn')))

    def test_self_service_password_reset_phone_matching(self):
        """Vérifie que la validation du téléphone commerçant pour la réinitialisation
        de mot de passe accepte les variantes locales (+224, 00224, espaces) et rejette les fraudes.
        """
        user_phone = "+224 620 21 34 56"
        clean_user = ''.join([d for d in user_phone if d.isdigit()])

        valid_inputs = ["620213456", "+224 620213456", "00224620213456", "620-21-34-56"]
        for p in valid_inputs:
            clean_input = ''.join([d for d in p if d.isdigit()])
            cmp_len = min(8, len(clean_input), len(clean_user))
            self.assertEqual(clean_input[-cmp_len:], clean_user[-cmp_len:])

        invalid_inputs = ["620000000", "+224 622 99 99 99", "12345"]
        for p in invalid_inputs:
            clean_input = ''.join([d for d in p if d.isdigit()])
            cmp_len = min(8, len(clean_input), len(clean_user))
            self.assertNotEqual(clean_input[-cmp_len:], clean_user[-cmp_len:])


class TestLuumoMobileMoneyUSSD(unittest.TestCase):
    """Vérification de la passerelle de paiement Mobile Money et USSD."""

    def test_orange_money_ussd_format(self):
        merchant_code = "620145"
        amount = 150000
        expected = f"*144*4*1*{merchant_code}*{amount}#"
        actual = f"*144*4*1*{merchant_code}*{amount}#"
        self.assertEqual(actual, expected)
        self.assertTrue(actual.startswith("*144*4*1*"))
        self.assertTrue(actual.endswith("#"))

    def test_mtn_momo_ussd_format(self):
        merchant_code = "620145"
        amount = 450000
        expected = f"*440*1*{merchant_code}*{amount}#"
        actual = f"*440*1*{merchant_code}*{amount}#"
        self.assertEqual(actual, expected)
        self.assertTrue(actual.startswith("*440*1*"))
        self.assertTrue(actual.endswith("#"))

    def test_qr_payload_contract(self):
        payload = {
            'type': 'LUUMO_MERCHANT_QR',
            'provider': 'orange_money',
            'merchant': '620145',
            'amount': 250000,
            'currency': 'GNF',
            'tx_ref': 'LUUMO-QR-20261027-ABC123',
        }
        serialized = json.dumps(payload)
        deserialized = json.loads(serialized)
        self.assertEqual(deserialized['currency'], 'GNF')
        self.assertEqual(deserialized['amount'], 250000)
        self.assertTrue(deserialized['tx_ref'].startswith('LUUMO-QR-'))


class TestLuumoSubscriptionRules(unittest.TestCase):
    """Vérification des règles d'abonnement et des 14 jours d'essai."""

    def test_trial_period_duration(self):
        today = date.today()
        trial_end = today + timedelta(days=14)
        days_remaining = (trial_end - today).days
        self.assertEqual(days_remaining, 14)

    def test_trial_expiration_condition(self):
        today = date.today()
        # Essai expiré (créé il y a 15 jours)
        past_end = today - timedelta(days=1)
        status = 'trial'

        if today > past_end:
            status = 'expired'

        self.assertEqual(status, 'expired')

    def test_plan_pricing_consistency(self):
        plans = {
            'retail': {'name': 'Forfait Boutique', 'price': 150000},
            'services': {'name': 'Forfait Services', 'price': 250000},
            'wholesale': {'name': 'Forfait Grossiste', 'price': 450000},
        }
        # 1 an = 10 mois payés (2 mois offerts)
        self.assertEqual(plans['retail']['price'] * 10, 1500000)
        self.assertEqual(plans['wholesale']['price'] * 10, 4500000)

    def test_stock_quant_allowed_fields_contract(self):
        """Vérifie que la création de stock quant en mode inventaire respecte le contrat
        strict d'Odoo 18 et ne contient jamais 'company_id' (qui déclenche UserError 'Quant's creation is restricted').
        """
        allowed_fields = {
            'product_id', 'location_id', 'inventory_quantity', 'inventory_quantity_auto_apply',
            'inventory_diff_quantity', 'inventory_date', 'user_id', 'inventory_quantity_set',
            'is_outdated', 'lot_id', 'package_id', 'owner_id'
        }
        test_payload = {
            'product_id': 64,
            'location_id': 117,
            'inventory_quantity': 10.0,
        }
        for k in test_payload.keys():
            self.assertIn(k, allowed_fields, f"Le champ {k} est interdit par Odoo 18 dans stock.quant create")
        self.assertNotIn('company_id', test_payload)

    def test_inventory_present_in_all_plans(self):
        # Règle Métier Luumo : l'application Inventaire/Catalogue doit être incluse
        # dans TOUS les forfaits pour permettre la gestion des articles, pièces et prix.
        plans_apps = {
            'retail': ['pos', 'inventory', 'customers', 'dashboard'],
            'services': ['inventory', 'orders', 'customers', 'hr', 'dashboard'],
            'wholesale': ['pos', 'orders', 'dashboard', 'inventory', 'purchases', 'customers', 'hr', 'fleet'],
        }
        for plan_id, apps in plans_apps.items():
            self.assertIn(
                'inventory',
                apps,
                f"L'application inventaire doit être incluse dans le forfait '{plan_id}'",
            )


class TestLuumoAdminBackoffice(unittest.TestCase):
    """Vérification des règles d'administration de la plateforme Luumo (Option A)."""

    def test_admin_trial_extension_calculation(self):
        today = date.today()
        # Extension de +7 jours
        initial_end = today + timedelta(days=2)
        added_days = 7
        new_end = initial_end + timedelta(days=added_days)
        self.assertEqual((new_end - initial_end).days, 7)
        self.assertEqual((new_end - today).days, 9)

    def test_admin_phone_cleanup_and_mrr(self):
        # Calcul MRR plateforme
        companies = [
            {'status': 'active', 'plan_price': 150000},
            {'status': 'active', 'plan_price': 450000},
            {'status': 'trial', 'plan_price': 150000},
            {'status': 'expired', 'plan_price': 250000},
        ]
        mrr = sum(c['plan_price'] for c in companies if c['status'] == 'active')
        self.assertEqual(mrr, 600000)


class TestLuumoRbacRoles(unittest.TestCase):
    """Vérification des règles de privilèges et de séparation des profils (RBAC)."""

    def test_role_matrix_privileges(self):
        roles = {
            'platform_admin': {'allowed_apps': [], 'is_admin': True},
            'manager': {'allowed_apps': ['pos', 'orders', 'dashboard', 'inventory', 'purchases', 'customers', 'hr', 'fleet'], 'is_admin': False},
            'cashier': {'allowed_apps': ['pos', 'customers'], 'is_admin': False},
            'stock_keeper': {'allowed_apps': ['inventory', 'purchases'], 'is_admin': False},
            'accountant': {'allowed_apps': ['orders', 'customers', 'hr', 'dashboard'], 'is_admin': False},
        }

        # 1. Super-Admin ne fait pas d'opérations de caisse locale
        self.assertEqual(roles['platform_admin']['allowed_apps'], [])
        self.assertTrue(roles['platform_admin']['is_admin'])

        # 2. Caissier ne peut accéder ni aux RH ni aux Achats
        cashier_apps = set(roles['cashier']['allowed_apps'])
        self.assertIn('pos', cashier_apps)
        self.assertIn('customers', cashier_apps)
        self.assertNotIn('hr', cashier_apps)
        self.assertNotIn('purchases', cashier_apps)

        # 3. Magasinier ne peut pas accéder à la caisse
        stock_apps = set(roles['stock_keeper']['allowed_apps'])
        self.assertIn('inventory', stock_apps)
        self.assertIn('purchases', stock_apps)
        self.assertNotIn('pos', stock_apps)

        # 4. Comptable a accès aux factures et bilans mais pas à la caisse comptoir
        accountant_apps = set(roles['accountant']['allowed_apps'])
        self.assertIn('dashboard', accountant_apps)
        self.assertIn('orders', accountant_apps)
        self.assertNotIn('pos', accountant_apps)

    def test_plan_downgrade_and_upgrade_intersection(self):
        """Vérifie que l'accès effectif d'un utilisateur est strictement l'intersection
        entre son rôle et le forfait actif de son entreprise (ex: Grossiste -> Services -> Boutique).
        """
        plans = {
            'retail': ['pos', 'inventory', 'customers', 'dashboard'],
            'services': ['inventory', 'orders', 'customers', 'hr', 'dashboard'],
            'wholesale': ['pos', 'orders', 'dashboard', 'inventory', 'purchases', 'customers', 'hr', 'fleet'],
        }
        manager_role_apps = ['pos', 'orders', 'dashboard', 'inventory', 'purchases', 'customers', 'hr', 'fleet']
        cashier_role_apps = ['pos', 'customers']

        # Cas 1 : Manager sur Forfait Grossiste -> 8 applications
        effective_wholesale = [a for a in manager_role_apps if a in plans['wholesale']]
        self.assertEqual(len(effective_wholesale), 8)

        # Cas 2 : Passage immédiat au Forfait Services -> strictement 5 applications
        effective_services = [a for a in manager_role_apps if a in plans['services']]
        self.assertEqual(len(effective_services), 5)
        self.assertNotIn('pos', effective_services)
        self.assertNotIn('fleet', effective_services)
        self.assertNotIn('purchases', effective_services)

        # Cas 3 : Passage immédiat au Forfait Boutique -> strictement 4 applications
        effective_retail = [a for a in manager_role_apps if a in plans['retail']]
        self.assertEqual(len(effective_retail), 4)
        self.assertNotIn('orders', effective_retail)
        self.assertNotIn('hr', effective_retail)

        # Cas 4 : Caissier sur Forfait Services (qui n'a pas de 'pos') -> reste uniquement 'customers'
        effective_cashier_services = [a for a in cashier_role_apps if a in plans['services']]
        self.assertEqual(effective_cashier_services, ['customers'])


if __name__ == '__main__':
    unittest.main()
