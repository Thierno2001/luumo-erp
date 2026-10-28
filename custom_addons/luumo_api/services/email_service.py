# -*- coding: utf-8 -*-
"""
Service d'Envoi d'Emails Luumo (Gmail SMTP & Odoo Mail Server)
=============================================================
Prend en charge l'expédition d'emails transactionnels (OTP, alertes de sécurité)
via l'adresse officielle : luumo.guinee@gmail.com.

Fonctionnalités :
1. Connexion SMTP sécurisée avec STARTTLS (smtp.gmail.com:587).
2. Format MIME hybride : HTML responsive aux couleurs Luumo + version texte brut.
3. Mode simulation/fallback automatique : si le mot de passe d'application Google
   n'est pas encore renseigné en production, l'email est consigné dans les logs
   sans bloquer l'utilisateur.
"""
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
import smtplib

from .notification_templates import render_email_template

_logger = logging.getLogger(__name__)

DEFAULT_SMTP_HOST = 'smtp.gmail.com'
DEFAULT_SMTP_PORT = 587
DEFAULT_SMTP_USER = 'luumo.guinee@gmail.com'
DEFAULT_SENDER_NAME = 'Luumo Guinée'


def get_email_config(env):
    """Récupère la configuration SMTP enregistrée dans Odoo ir.config_parameter."""
    params = env['ir.config_parameter'].sudo()
    return {
        'host': params.get_param('luumo_smtp_host', DEFAULT_SMTP_HOST),
        'port': int(params.get_param('luumo_smtp_port', DEFAULT_SMTP_PORT)),
        'user': params.get_param('luumo_smtp_user', DEFAULT_SMTP_USER),
        'password': params.get_param('luumo_smtp_password', ''),
        'sender_name': params.get_param('luumo_smtp_sender_name', DEFAULT_SENDER_NAME),
    }


def set_email_password(env, app_password):
    """Configure le mot de passe d'application Google (16 caractères) pour luumo.guinee@gmail.com."""
    env['ir.config_parameter'].sudo().set_param('luumo_smtp_password', (app_password or '').strip())
    _logger.info("Mot de passe SMTP Luumo mis à jour pour %s", DEFAULT_SMTP_USER)


def send_email(env, recipient_email, subject, html_content, plain_text_content=None):
    """Envoie un email via Gmail SMTP.

    Retourne ``{'success': bool, 'simulated': bool, 'error': str|None}``.
    """
    if not recipient_email or '@' not in recipient_email:
        return {'success': False, 'simulated': False, 'error': 'Adresse email invalide.'}

    cfg = get_email_config(env)
    sender_addr = cfg['user']
    sender_header = f"{cfg['sender_name']} <{sender_addr}>"
    password = cfg['password']

    # Si le mot de passe SMTP n'est pas configuré, mode simulation propre
    if not password:
        _logger.warning(
            "\n"
            "================================================================================\n"
            "[LUUMO EMAIL SIMULATION - luumo.guinee@gmail.com]\n"
            "Destinataire : %s\n"
            "Objet        : %s\n"
            "Avis         : Mot de passe d'application non configuré (luumo_smtp_password).\n"
            "Contenu brut :\n%s\n"
            "================================================================================",
            recipient_email, subject, plain_text_content or "(HTML uniquement)"
        )
        return {
            'success': True,
            'simulated': True,
            'error': None,
            'message': 'Email simulé avec succès (mode développement/pré-configuration).',
        }

    # Construction du message MIME multipart
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = sender_header
    msg['To'] = recipient_email
    msg['Reply-To'] = sender_addr

    if plain_text_content:
        msg.attach(MIMEText(plain_text_content, 'plain', 'utf-8'))
    if html_content:
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))

    try:
        server = smtplib.SMTP(cfg['host'], cfg['port'], timeout=10)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(sender_addr, password)
        server.sendmail(sender_addr, [recipient_email], msg.as_string())
        server.quit()
        _logger.info("Email Luumo envoyé avec succès à %s [Objet: %s]", recipient_email, subject)
        return {'success': True, 'simulated': False, 'error': None}
    except Exception as e:
        _logger.exception("Échec de l'envoi de l'email Luumo à %s : %s", recipient_email, str(e))
        return {'success': False, 'simulated': False, 'error': f"Erreur SMTP : {str(e)}"}


def send_otp_email(env, recipient_email, purpose, code, user_name='Commerçant'):
    """Rend le gabarit officiel et expédie le code OTP par email."""
    subject, html, plain = render_email_template(
        purpose=purpose,
        code=code,
        user_name=user_name,
        target_email=recipient_email,
    )
    return send_email(
        env=env,
        recipient_email=recipient_email,
        subject=subject,
        html_content=html,
        plain_text_content=plain,
    )
