# -*- coding: utf-8 -*-
"""
Passerelle SMS Guinée - Nimba SMS API
====================================
Prend en charge l'expédition de SMS professionnels vers les réseaux mobiles
de Guinée (+224 Orange, MTN, Cellcom) via l'API officielle de Nimba SMS.

Documentation officielle : https://developers.nimbasms.com
Endpoint d'envoi : POST https://api.nimbasms.com/v1/messages
Authentification : HTTP Basic Auth (service_id / secret_token)

Paramètres configurables dans Odoo (ir.config_parameter) :
- `luumo_nimba_service_id`   : Identifiant de service Nimba
- `luumo_nimba_secret_token` : Jeton secret API Nimba
- `luumo_nimba_sender_name`  : Nom d'expéditeur validé (défaut: 'Luumo')
"""
import base64
import json
import logging
import re
import urllib.error
import urllib.request

from .notification_templates import render_sms

_logger = logging.getLogger(__name__)

NIMBA_API_URL = 'https://api.nimbasms.com/v1/messages'
DEFAULT_SENDER_NAME = 'Luumo'


def normalize_guinean_phone(phone):
    """Normalise un numéro de téléphone guinéen au format E.164 (+224XXXXXXXXX)."""
    if not phone:
        return ''
    digits = re.sub(r'\D', '', str(phone))

    # Cas 00224...
    if digits.startswith('00224'):
        digits = digits[2:]

    # Cas 224...
    if digits.startswith('224'):
        return f"+{digits}"

    # Cas numéro local 9 chiffres (ex: 620123456)
    if len(digits) == 9:
        return f"+224{digits}"

    # Fallback générique avec préfixe +
    return f"+{digits}" if digits else ''


def get_nimba_config(env):
    """Récupère les identifiants Nimba SMS enregistrés en base."""
    params = env['ir.config_parameter'].sudo()
    return {
        'service_id': params.get_param('luumo_nimba_service_id', '').strip(),
        'secret_token': params.get_param('luumo_nimba_secret_token', '').strip(),
        'sender_name': params.get_param('luumo_nimba_sender_name', DEFAULT_SENDER_NAME).strip(),
    }


def set_nimba_credentials(env, service_id, secret_token, sender_name=DEFAULT_SENDER_NAME):
    """Enregistre les clés d'API Nimba SMS dans Odoo."""
    params = env['ir.config_parameter'].sudo()
    params.set_param('luumo_nimba_service_id', (service_id or '').strip())
    params.set_param('luumo_nimba_secret_token', (secret_token or '').strip())
    params.set_param('luumo_nimba_sender_name', (sender_name or DEFAULT_SENDER_NAME).strip())
    _logger.info("Identifiants Nimba SMS enregistrés avec succès (Expéditeur: %s)", sender_name)


def send_nimba_sms(env, recipient_phone, message):
    """Envoie un SMS via l'API Nimba SMS.

    Retourne ``{'success': bool, 'simulated': bool, 'message_id': str|None, 'error': str|None}``.
    """
    normalized_phone = normalize_guinean_phone(recipient_phone)
    if not normalized_phone or len(normalized_phone) < 10:
        return {'success': False, 'simulated': False, 'error': f"Numéro invalide : {recipient_phone}"}

    cfg = get_nimba_config(env)
    service_id = cfg['service_id']
    secret_token = cfg['secret_token']
    sender_name = cfg['sender_name'] or DEFAULT_SENDER_NAME

    # Si Nimba SMS n'est pas encore configuré (ex: avant souscription du gérant)
    if not service_id or not secret_token:
        _logger.warning(
            "\n"
            "================================================================================\n"
            "[NIMBA SMS GUINEE SIMULATION]\n"
            "Destinataire : %s\n"
            "Expéditeur   : %s\n"
            "Message      : %s\n"
            "Statut       : Identifiants non saisis (luumo_nimba_service_id).\n"
            "================================================================================",
            normalized_phone, sender_name, message
        )
        return {
            'success': True,
            'simulated': True,
            'message_id': 'SIMULATED_SMS_ID',
            'error': None,
            'message': 'SMS simulé avec succès (mode pré-configuration Nimba SMS).',
        }

    # Préparation de l'appel HTTP Nimba SMS
    credentials = f"{service_id}:{secret_token}"
    b64_creds = base64.b64encode(credentials.encode('utf-8')).decode('ascii')

    payload = {
        'to': [normalized_phone],
        'message': message,
        'sender_name': sender_name,
    }
    payload_bytes = json.dumps(payload).encode('utf-8')

    req = urllib.request.Request(
        url=NIMBA_API_URL,
        data=payload_bytes,
        headers={
            'Authorization': f'Basic {b64_creds}',
            'Content-Type': 'application/json',
            'User-Agent': 'Luumo-ERP-Guinea/1.0',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode('utf-8')
            res_data = json.loads(res_body) if res_body else {}
            message_id = res_data.get('message_id') or res_data.get('id')
            _logger.info("Nimba SMS délivré avec succès à %s [ID: %s]", normalized_phone, message_id)
            return {
                'success': True,
                'simulated': False,
                'message_id': message_id,
                'error': None,
            }
    except urllib.error.HTTPError as e:
        error_detail = e.read().decode('utf-8', errors='ignore')
        _logger.error("Erreur HTTP Nimba SMS (%s) pour %s : %s", e.code, normalized_phone, error_detail)
        return {
            'success': False,
            'simulated': False,
            'error': f"Erreur Nimba SMS {e.code} : {error_detail}",
        }
    except Exception as e:
        _logger.exception("Échec réseau Nimba SMS pour %s : %s", normalized_phone, str(e))
        return {
            'success': False,
            'simulated': False,
            'error': f"Erreur de connexion Nimba SMS : {str(e)}",
        }


def send_otp_sms(env, recipient_phone, purpose, code):
    """Génère le texte adapté et expédie le code OTP par Nimba SMS."""
    sms_text = render_sms(purpose=purpose, code=code)
    return send_nimba_sms(
        env=env,
        recipient_phone=recipient_phone,
        message=sms_text,
    )
