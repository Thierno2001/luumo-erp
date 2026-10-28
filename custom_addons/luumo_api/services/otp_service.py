# -*- coding: utf-8 -*-
"""
Service de Gestion des Codes de Vérification OTP Luumo
=====================================================
Gère le cycle de vie complet des codes de sécurité à 6 chiffres :
1. Génération cryptographique aléatoire (secrets).
2. Hachage sécurisé HMAC-SHA256 (le code en clair n'est jamais stocké en base).
3. Durée de validité stricte de 10 minutes (600 secondes).
4. Protection anti-brute-force : 3 tentatives max par code avant révocation.
5. Distribution multi-canal : Email officiel (luumo.guinee@gmail.com) et Nimba SMS (+224).
"""
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import time

from .email_service import send_otp_email
from .nimba_sms_service import normalize_guinean_phone, send_otp_sms
from .security_owasp import check_rate_limit

_logger = logging.getLogger(__name__)

OTP_VALIDITY_SECONDS = 600  # 10 minutes
MAX_VERIFY_ATTEMPTS = 3
OTP_SECRET_KEY = os.environ.get('LUUMO_OTP_SECRET', 'luumo_guinea_sec_otp_2026_conakry').encode('utf-8')


def _clean_key(value):
    """Nettoie une clé pour stockage dans ir.config_parameter."""
    return re.sub(r'[^a-zA-Z0-9_\-]', '_', str(value or '').lower())


def _hash_otp(code, salt):
    """Calcule l'empreinte HMAC-SHA256 du code OTP."""
    h = hmac.new(OTP_SECRET_KEY, f"{code}:{salt}".encode('utf-8'), hashlib.sha256)
    return h.hexdigest()


def generate_and_send_otp(env, target_login, purpose, channel='email', phone=None, user_name='Commerçant'):
    """Génère un code OTP à 6 chiffres et l'expédie via Email et/ou Nimba SMS.

    :param env: Odoo Environment
    :param target_login: email de l'utilisateur
    :param purpose: 'password_reset' | 'change_password' | 'account_verify'
    :param channel: 'email' | 'sms' | 'both'
    :param phone: numéro de téléphone optionnel pour envoi SMS
    :param user_name: nom du commerçant pour l'email
    :return: dict avec {success, message, channel, expires_in, masked_target}
    """
    clean_target = _clean_key(target_login)
    rate_key = f"otp_req:{clean_target}"
    allowed, retry_after = check_rate_limit(rate_key, max_attempts=5, window_seconds=900)
    if not allowed:
        return {
            'success': False,
            'error': f"Trop de demandes de code. Réessayez dans {retry_after} secondes.",
            'retry_after': retry_after,
        }

    # Génération d'un code 6 chiffres cryptographiquement aléatoire (100000 à 999999)
    code = f"{secrets.randbelow(900000) + 100000}"
    salt = secrets.token_hex(8)
    code_hash = _hash_otp(code, salt)
    now = time.time()
    expires_at = now + OTP_VALIDITY_SECONDS

    # Enregistrement en base chiffré
    record = {
        'hash': code_hash,
        'salt': salt,
        'expires_at': expires_at,
        'attempts': 0,
        'purpose': purpose,
        'target': target_login,
        'phone': phone or '',
    }
    param_key = f"luumo_otp_{purpose}_{clean_target}"
    env['ir.config_parameter'].sudo().set_param(param_key, json.dumps(record))

    email_result = None
    sms_result = None
    channels_used = []

    # 1. Expédition Email via luumo.guinee@gmail.com
    if channel in ('email', 'both'):
        email_result = send_otp_email(
            env=env,
            recipient_email=target_login,
            purpose=purpose,
            code=code,
            user_name=user_name,
        )
        if email_result.get('success'):
            channels_used.append('email')

    # 2. Expédition SMS via Nimba SMS Guinée
    if channel in ('sms', 'both') and phone:
        sms_result = send_otp_sms(
            env=env,
            recipient_phone=phone,
            purpose=purpose,
            code=code,
        )
        if sms_result.get('success'):
            channels_used.append('sms')

    # Masquer l'email pour le retour UX (ex: c***o@gmail.com)
    parts = target_login.split('@')
    masked_target = f"{parts[0][0]}***{parts[0][-1]}@{parts[1]}" if len(parts) == 2 and len(parts[0]) > 2 else target_login

    return {
        'success': True,
        'message': f"Code de vérification envoyé à {masked_target}.",
        'channel': '+'.join(channels_used) or channel,
        'expires_in': OTP_VALIDITY_SECONDS,
        'masked_target': masked_target,
        'email_sent': bool(email_result and email_result.get('success')),
        'sms_sent': bool(sms_result and sms_result.get('success')),
        # Conserve le code en debug/simulation pour fluidifier les tests unitaires
        '_debug_code': code if (email_result and email_result.get('simulated')) else None,
    }


def verify_otp(env, target_login, code, purpose, consume=True):
    """Vérifie la validité d'un code OTP pour une cible et un motif donnés.

    Retourne ``(is_valid: bool, error_message: str|None)``.
    """
    if not target_login or not code:
        return False, "Identifiant et code de vérification obligatoires."

    clean_code = str(code).replace(' ', '').strip()
    if not clean_code.isdigit() or len(clean_code) != 6:
        return False, "Le code de vérification doit être composé de 6 chiffres."

    clean_target = _clean_key(target_login)
    param_key = f"luumo_otp_{purpose}_{clean_target}"
    raw_record = env['ir.config_parameter'].sudo().get_param(param_key, default=None)

    if not raw_record:
        return False, "Aucun code en attente ou le code a expiré. Veuillez redemander un nouveau code."

    try:
        record = json.loads(raw_record)
    except Exception:
        return False, "Données de vérification corrompues."

    now = time.time()
    if now > record.get('expires_at', 0):
        # Expiré : supprimer immédiatement
        env['ir.config_parameter'].sudo().set_param(param_key, '')
        return False, "Le code de vérification a expiré (validité 10 minutes). Veuillez redemander un code."

    attempts = record.get('attempts', 0)
    if attempts >= MAX_VERIFY_ATTEMPTS:
        env['ir.config_parameter'].sudo().set_param(param_key, '')
        return False, "Trop de tentatives erronées (3 max). Ce code a été révoqué par sécurité."

    # Vérification cryptographique
    salt = record.get('salt', '')
    expected_hash = record.get('hash', '')
    provided_hash = _hash_otp(clean_code, salt)

    if not hmac.compare_digest(expected_hash, provided_hash):
        record['attempts'] = attempts + 1
        env['ir.config_parameter'].sudo().set_param(param_key, json.dumps(record))
        remaining = MAX_VERIFY_ATTEMPTS - record['attempts']
        return False, f"Code incorrect. Il vous reste {remaining} tentative(s)."

    # Code valide !
    if consume:
        env['ir.config_parameter'].sudo().set_param(param_key, '')

    return True, None
