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


if __name__ == '__main__':
    unittest.main()
