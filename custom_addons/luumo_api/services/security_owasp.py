# -*- coding: utf-8 -*-
"""
Socle de sécurité OWASP Top 10 & ASVS V4 pour Luumo API
=======================================================
Centralise :
1. Le Rate-Limiting par fenêtre glissante (anti-brute-force A07)
2. Le nettoyage et la validation stricte des entrées (anti-XSS/Injection A03)
3. La politique de mot de passe robuste 12+ caractères (ASVS V2.1)
4. La signature et vérification cryptographique HMAC-SHA256 (Webhooks B2B A08)
"""
import hashlib
import hmac
import os
import re
import threading
import time

from odoo.exceptions import ValidationError

EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,24}$')
PHONE_RE = re.compile(r'^\+?[0-9\s\-()]{8,22}$')
VAT_NIF_RE = re.compile(r'^[A-Z0-9\-\/. ]{4,32}$', re.IGNORECASE)
CONTROL_CHARS_RE = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')

COMMON_WEAK_PASSWORDS = {
    'password123!', 'admin123456!', 'azerty123456!', '123456789012',
    'guineeconakry1!', 'conakry2025!', 'conakry2026!', 'luumo123456!',
    'welcome12345!', 'qwerty123456!',
}

_RATE_LOCK = threading.Lock()
_RATE_BUCKETS = {}  # key -> list[timestamp]


def check_rate_limit(key, max_attempts, window_seconds):
    """Vérifie et enregistre une tentative dans la fenêtre glissante.

    Renvoie ``(allowed: bool, retry_after_seconds: int)``.
    """
    now = time.time()
    cutoff = now - window_seconds
    with _RATE_LOCK:
        attempts = [t for t in _RATE_BUCKETS.get(key, []) if t > cutoff]
        if len(attempts) >= max_attempts:
            retry_after = max(1, int(window_seconds - (now - attempts[0])))
            _RATE_BUCKETS[key] = attempts
            return False, retry_after
        attempts.append(now)
        _RATE_BUCKETS[key] = attempts
        return True, 0


def clear_rate_limit(key):
    with _RATE_LOCK:
        _RATE_BUCKETS.pop(key, None)


def clean_text(value, field_label, min_len=0, max_len=120, required=False):
    """Nettoie une chaîne et bloque les injections HTML/script et caractères de contrôle."""
    raw = (value or '') if isinstance(value, str) else str(value or '')
    cleaned = CONTROL_CHARS_RE.sub('', raw).strip()
    if required and not cleaned:
        raise ValidationError(f"Le champ « {field_label} » est obligatoire.")
    if not cleaned:
        return ''
    if len(cleaned) < min_len:
        raise ValidationError(
            f"Le champ « {field_label} » doit contenir au moins {min_len} caractères."
        )
    if len(cleaned) > max_len:
        raise ValidationError(
            f"Le champ « {field_label} » ne peut pas dépasser {max_len} caractères."
        )
    if '<' in cleaned or '>' in cleaned:
        raise ValidationError(
            f"Le champ « {field_label} » contient des caractères non autorisés (< ou >)."
        )
    return cleaned


def validate_email(email, required=True):
    cleaned = clean_text(email, 'Email / Identifiant', max_len=120, required=required).lower()
    if not cleaned:
        return ''
    if not EMAIL_RE.match(cleaned):
        raise ValidationError("Adresse email invalide (ex. contact@entreprise.gn).")
    return cleaned


def validate_phone(phone, required=False):
    cleaned = clean_text(phone, 'Téléphone', max_len=24, required=required)
    if not cleaned:
        return ''
    if not PHONE_RE.match(cleaned):
        raise ValidationError("Numéro de téléphone invalide (ex. +224 622 00 00 00).")
    return cleaned


def validate_vat_nif(vat, required=False):
    cleaned = clean_text(vat, 'NIF / RCCM', max_len=32, required=required).upper()
    if not cleaned:
        return ''
    if not VAT_NIF_RE.match(cleaned):
        raise ValidationError(
            "Format NIF / RCCM invalide (utilisez uniquement lettres, chiffres, tirets et slashs)."
        )
    return cleaned


def validate_password_owasp(password, login='', name='', company_name=''):
    """Vérifie la conformité du mot de passe selon OWASP ASVS V2.1."""
    if not isinstance(password, str) or not password:
        raise ValidationError("Le mot de passe est obligatoire.")
    if len(password) < 12:
        raise ValidationError("Le mot de passe doit contenir au moins 12 caractères.")
    if len(password) > 128:
        raise ValidationError("Le mot de passe ne doit pas dépasser 128 caractères.")
    if not re.search(r'[A-Z]', password):
        raise ValidationError("Le mot de passe doit contenir au moins une lettre majuscule.")
    if not re.search(r'[a-z]', password):
        raise ValidationError("Le mot de passe doit contenir au moins une lettre minuscule.")
    if not re.search(r'[0-9]', password):
        raise ValidationError("Le mot de passe doit contenir au moins un chiffre.")
    if not re.search(r'[^A-Za-z0-9\s]', password):
        raise ValidationError("Le mot de passe doit contenir au moins un caractère spécial (!@#$%&*...).")
    low_pw = password.lower()
    if low_pw in COMMON_WEAK_PASSWORDS:
        raise ValidationError("Ce mot de passe est trop courant. Veuillez en choisir un plus robuste.")
    for token in (login.split('@')[0], name, company_name):
        clean_tok = (token or '').strip().lower()
        if len(clean_tok) >= 4 and clean_tok in low_pw:
            raise ValidationError(
                "Le mot de passe ne doit pas contenir votre nom, email ou nom d'entreprise."
            )


def get_gateway_config(company=None):
    """Retourne la configuration de la passerelle B2B Mobile Money."""
    merchant_id = os.environ.get('LUUMO_MERCHANT_ID', '620145')
    if company and getattr(company, 'luumo_merchant_code', False):
        merchant_id = company.luumo_merchant_code
    return {
        'provider': os.environ.get('LUUMO_GATEWAY_PROVIDER', 'djomi'),
        'api_url': os.environ.get('LUUMO_GATEWAY_API_URL', ''),
        'merchant_id': merchant_id,
        'api_secret': os.environ.get('LUUMO_API_SECRET', ''),
        'webhook_secret': os.environ.get(
            'LUUMO_WEBHOOK_SECRET', 'luumo-default-hmac-secret-change-in-prod'
        ),
        'public_base_url': os.environ.get('LUUMO_PUBLIC_BASE_URL', ''),
    }


def compute_hmac_signature(raw_bytes):
    secret = get_gateway_config()['webhook_secret'].encode('utf-8')
    return hmac.new(secret, raw_bytes, hashlib.sha256).hexdigest()


def verify_hmac_signature(raw_bytes, provided_signature):
    sig = (provided_signature or '').strip()
    if not sig:
        return False
    expected = compute_hmac_signature(raw_bytes)
    return hmac.compare_digest(sig, expected)
