# -*- coding: utf-8 -*-
"""
Gabarits de Notification Luumo (Email HTML & Nimba SMS Guinée)
============================================================
Centralise tous les gabarits de messages pour :
1. Changement de mot de passe (OTP)
2. Réinitialisation de mot de passe oublié (OTP)
3. Validation de compte à l'inscription (OTP)
4. Confirmation de mot de passe modifié (Alerte sécurité)

Respecte le Design System Luumo :
- Palette officielle : Forêt #115040, Or #F3BC33, Nuit #06231A, Émeraude #34D399.
- Typographie soignée, montants et codes en chiffres tabulaires espacés.
- SMS concis optimisés pour les réseaux guinéens (+224 Orange / MTN / Cellcom).
"""

# ==============================================================================
# 1. GABARITS SMS NIMBA (160 caractères max par segment)
# ==============================================================================

SMS_TEMPLATES = {
    'change_password': (
        "Luumo : Votre code de vérification pour CHANGER votre mot de passe est {code}. "
        "Valide 10 min. Ne le partagez JAMAIS à personne."
    ),
    'password_reset': (
        "Luumo : Votre code de REINITIALISATION de mot de passe est {code}. "
        "Valide 10 min. Si vous n'en etes pas l'auteur, ignorez ce message."
    ),
    'account_verify': (
        "Bienvenue sur Luumo ! Votre code d'activation de compte commercant est {code}. "
        "Valide 10 min. Activez votre boutique en toute securite."
    ),
    'password_changed_alert': (
        "Luumo Securite : Le mot de passe de votre compte a ete modifie avec succes. "
        "Si vous n'en etes pas l'auteur, contactez l'assistance d'urgence Luumo."
    ),
}


def render_sms(purpose, code=None, **kwargs):
    """Génère le texte du SMS adapté à Nimba SMS."""
    template = SMS_TEMPLATES.get(purpose, "Luumo : Votre code de verification est {code}.")
    return template.format(code=code or '', **kwargs)


# ==============================================================================
# 2. GABARITS EMAIL HTML (Responsive, Design Luumo Officiel)
# ==============================================================================

def _email_base_layout(title, preheader, body_content):
    """Layout HTML universel responsive aux couleurs de Luumo."""
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #F4F7F5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0B2920;
      -webkit-font-smoothing: antialiased;
    }}
    .email-container {{
      max-width: 560px;
      margin: 24px auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(11, 41, 32, 0.08);
      border: 1px solid #DCE5E1;
    }}
    .brand-header {{
      background: linear-gradient(135deg, #06231A 0%, #115040 100%);
      padding: 32px 28px;
      text-align: center;
      border-bottom: 3px solid #F3BC33;
    }}
    .brand-logo-text {{
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #FFFFFF;
      margin: 0;
    }}
    .brand-logo-text span {{
      color: #F3BC33;
    }}
    .brand-subtitle {{
      margin-top: 6px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #34D399;
      font-weight: 700;
    }}
    .content-body {{
      padding: 36px 32px;
      line-height: 1.6;
    }}
    .title-h2 {{
      font-size: 20px;
      font-weight: 700;
      color: #06231A;
      margin-top: 0;
      margin-bottom: 12px;
    }}
    .text-p {{
      font-size: 14px;
      color: #4A635A;
      margin: 0 0 16px 0;
    }}
    .otp-card {{
      background: #F7FAF8;
      border: 2px dashed #115040;
      border-radius: 14px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }}
    .otp-label {{
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #115040;
      margin-bottom: 8px;
    }}
    .otp-code {{
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #115040;
      margin: 0;
      padding: 4px 0;
    }}
    .otp-expiry {{
      font-size: 12px;
      color: #B45309;
      font-weight: 600;
      margin-top: 8px;
    }}
    .info-alert {{
      background: #FFFBEB;
      border-left: 4px solid #F59E0B;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 12px;
      color: #92400E;
      margin: 20px 0;
    }}
    .footer {{
      background-color: #06231A;
      padding: 24px 28px;
      text-align: center;
      font-size: 11px;
      color: #8FAEA1;
      line-height: 1.6;
    }}
    .footer a {{
      color: #F3BC33;
      text-decoration: none;
    }}
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    {preheader}
  </div>
  <div class="email-container">
    <div class="brand-header">
      <h1 class="brand-logo-text">luumo<span>.</span></h1>
      <div class="brand-subtitle">Sécurité & Authentification • Guinée</div>
    </div>
    <div class="content-body">
      {body_content}
    </div>
    <div class="footer">
      <div><strong>Luumo ERP</strong> • Le progiciel de gestion conçu pour les commerçants et PME de Guinée.</div>
      <div style="margin-top: 8px; color: #527367;">
        Conakry, République de Guinée • Assistance : <a href="mailto:luumo.guinee@gmail.com">luumo.guinee@gmail.com</a>
      </div>
    </div>
  </div>
</body>
</html>"""


def render_email_template(purpose, code=None, user_name='Commerçant', target_email=''):
    """Génère l'objet et le corps (HTML + texte brut) selon le motif demandé."""
    code_display = f"{code[:3]} {code[3:]}" if code and len(code) == 6 else (code or '')

    if purpose == 'change_password':
        subject = f"Luumo - Votre code de vérification pour changer votre mot de passe ({code})"
        preheader = f"Code de sécurité Luumo : {code}. Valide pendant 10 minutes."
        body = f"""
          <h2 class="title-h2">Changement de mot de passe</h2>
          <p class="text-p">Bonjour <strong>{user_name}</strong>,</p>
          <p class="text-p">
            Une demande de <strong>modification du mot de passe</strong> a été initiée depuis votre compte Luumo ({target_email}).
          </p>
          <div class="otp-card">
            <div class="otp-label">Code de vérification sécurisé</div>
            <div class="otp-code">{code_display}</div>
            <div class="otp-expiry">⏱ Expire dans 10 minutes • Usage unique</div>
          </div>
          <div class="info-alert">
            <strong>Important :</strong> Ne transmettez jamais ce code, même à un agent Luumo. Si vous n'avez pas demandé cette modification, connectez-vous immédiatement pour sécuriser votre compte.
          </div>
        """
        plain_text = (
            f"Bonjour {user_name},\n\n"
            f"Votre code de vérification pour changer votre mot de passe Luumo est : {code}\n"
            f"Ce code expire dans 10 minutes.\n\n"
            f"Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\n"
            f"L'équipe Luumo Guinée\nluumo.guinee@gmail.com"
        )

    elif purpose == 'password_reset':
        subject = f"Luumo - Réinitialisation de votre mot de passe ({code})"
        preheader = f"Code de réinitialisation Luumo : {code}. Valide pendant 10 minutes."
        body = f"""
          <h2 class="title-h2">Réinitialisation de mot de passe</h2>
          <p class="text-p">Bonjour <strong>{user_name}</strong>,</p>
          <p class="text-p">
            Vous avez demandé à réinitialiser le mot de passe de votre compte Luumo. Entrez le code à 6 chiffres ci-dessous pour choisir votre nouveau mot de passe :
          </p>
          <div class="otp-card">
            <div class="otp-label">Code de réinitialisation</div>
            <div class="otp-code">{code_display}</div>
            <div class="otp-expiry">⏱ Expire dans 10 minutes • 3 tentatives max</div>
          </div>
          <div class="info-alert">
            <strong>Sécurité :</strong> Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité : votre mot de passe actuel reste inchangé.
          </div>
        """
        plain_text = (
            f"Bonjour {user_name},\n\n"
            f"Votre code de réinitialisation de mot de passe Luumo est : {code}\n"
            f"Ce code expire dans 10 minutes.\n\n"
            f"L'équipe Luumo Guinée\nluumo.guinee@gmail.com"
        )

    elif purpose == 'account_verify':
        subject = f"Luumo - Activez votre compte ({code})"
        preheader = f"Code d'activation de votre boutique Luumo : {code}."
        body = f"""
          <h2 class="title-h2">Bienvenue sur Luumo !</h2>
          <p class="text-p">Bonjour <strong>{user_name}</strong>,</p>
          <p class="text-p">
            Merci d'avoir choisi Luumo pour la gestion de votre commerce en Guinée. Voici votre code pour valider votre compte et activer votre période d'essai de 14 jours :
          </p>
          <div class="otp-card">
            <div class="otp-label">Code d'activation</div>
            <div class="otp-code">{code_display}</div>
            <div class="otp-expiry">⏱ Valide pendant 10 minutes</div>
          </div>
        """
        plain_text = (
            f"Bienvenue sur Luumo !\n\n"
            f"Votre code d'activation est : {code}\n"
            f"Valide pendant 10 minutes.\n\n"
            f"L'équipe Luumo Guinée\nluumo.guinee@gmail.com"
        )

    elif purpose == 'password_changed_alert':
        subject = "Luumo - Votre mot de passe a été modifié avec succès"
        preheader = "Confirmation de sécurité : Votre mot de passe Luumo a bien été changé."
        body = f"""
          <h2 class="title-h2">Mot de passe modifié</h2>
          <p class="text-p">Bonjour <strong>{user_name}</strong>,</p>
          <p class="text-p">
            Nous vous confirmons que le mot de passe de votre compte Luumo ({target_email}) a été <strong>mis à jour avec succès</strong>.
          </p>
          <div style="background:#ECFDF5; border:1px solid #10B981; border-radius:10px; padding:16px; margin:20px 0; color:#065F46; font-size:13px;">
            ✔ <strong>Votre compte est sécurisé.</strong> Toutes les sessions précédentes ont été réinitialisées.
          </div>
          <div class="info-alert">
            <strong>Vous n'êtes pas à l'auteur de cette action ?</strong><br>
            Contactez immédiatement notre support par email à <a href="mailto:luumo.guinee@gmail.com">luumo.guinee@gmail.com</a> pour bloquer temporairement l'accès à votre boutique.
          </div>
        """
        plain_text = (
            f"Bonjour {user_name},\n\n"
            f"Le mot de passe de votre compte Luumo ({target_email}) a bien été modifié avec succès.\n"
            f"Si vous n'avez pas effectué cette action, contactez immédiatement luumo.guinee@gmail.com.\n\n"
            f"L'équipe Luumo Guinée"
        )
    else:
        subject = f"Luumo - Code de vérification ({code})"
        preheader = f"Code de sécurité : {code}"
        body = f"""
          <h2 class="title-h2">Code de vérification</h2>
          <div class="otp-card">
            <div class="otp-code">{code_display}</div>
          </div>
        """
        plain_text = f"Votre code Luumo est : {code}"

    html = _email_base_layout(subject, preheader, body)
    return subject, html, plain_text
