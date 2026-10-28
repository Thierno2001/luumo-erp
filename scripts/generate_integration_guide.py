#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Générateur du Guide d'Intégration des Solutions Tiers Luumo ERP en PDF et Markdown.
Design System Luumo : Vert Forêt (#115040), Or (#F3BC33), Nuit (#06231A), Rouge (#C8102E).
"""

import os
import sys
import base64
import subprocess
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS_DIR = os.path.join(BASE_DIR, "docs")
os.makedirs(DOCS_DIR, exist_ok=True)

LOGO_PATH = os.path.join(BASE_DIR, "luumo_web", "public", "luumo-logo.png")
logo_b64 = ""
if os.path.exists(LOGO_PATH):
    with open(LOGO_PATH, "rb") as f:
        logo_b64 = base64.b64encode(f.read()).decode("utf-8")

PDF_OUTPUT_PATH = os.path.join(DOCS_DIR, "LUUMO_GUIDE_INTEGRATION_SOLUTIONS_TIERS.pdf")
MD_OUTPUT_PATH = os.path.join(DOCS_DIR, "GUIDE_INTEGRATION_SOLUTIONS_TIERS.md")
HTML_TEMP_PATH = os.path.join(DOCS_DIR, "guide_integration_temp.html")

html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>LUUMO ERP - Guide Complet d'Intégration des Solutions Tiers</title>
<style>
  @page {{
    size: A4;
    margin: 15mm 15mm 20mm 15mm;
    @bottom-center {{
      content: counter(page) " / " counter(pages);
      font-size: 8pt;
      color: #708F83;
      font-family: 'Segoe UI', Arial, sans-serif;
    }}
  }}

  * {{
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}

  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #11261F;
    background-color: #FFFFFF;
    margin: 0;
    padding: 0;
    line-height: 1.5;
    font-size: 10.5pt;
  }}

  /* Bande Tricolore Guinéenne */
  .guinea-bar {{
    display: table;
    width: 100%;
    height: 5px;
    margin-bottom: 20px;
  }}
  .guinea-bar-red {{ display: table-cell; width: 33.33%; background-color: #C8102E; }}
  .guinea-bar-yellow {{ display: table-cell; width: 33.33%; background-color: #F3BC33; }}
  .guinea-bar-green {{ display: table-cell; width: 33.33%; background-color: #115040; }}

  /* En-tête de couverture / page 1 */
  .cover-header {{
    text-align: center;
    padding: 25px 0 15px 0;
    border-bottom: 2px solid #E5EBE8;
    margin-bottom: 25px;
  }}

  .logo-img {{
    max-height: 50px;
    margin-bottom: 15px;
  }}

  .doc-title {{
    font-size: 20pt;
    font-weight: 800;
    color: #115040;
    margin: 0 0 6px 0;
    letter-spacing: -0.5px;
    text-transform: uppercase;
  }}

  .doc-subtitle {{
    font-size: 11pt;
    font-weight: 600;
    color: #E8A02B;
    margin: 0 0 12px 0;
  }}

  .doc-meta {{
    font-size: 8.5pt;
    color: #526B63;
    margin: 0;
  }}

  /* Titres de sections */
  h2 {{
    font-size: 13.5pt;
    font-weight: 800;
    color: #115040;
    border-bottom: 2px solid #115040;
    padding-bottom: 5px;
    margin-top: 25px;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }}

  h3 {{
    font-size: 11.5pt;
    font-weight: 700;
    color: #0B382C;
    margin-top: 16px;
    margin-bottom: 8px;
  }}

  h4 {{
    font-size: 10.5pt;
    font-weight: 700;
    color: #11261F;
    margin-top: 12px;
    margin-bottom: 6px;
  }}

  p {{
    margin: 0 0 10px 0;
  }}

  /* Cartes et boîtes d'information */
  .card {{
    background-color: #F8FAF9;
    border: 1px solid #DCE5E1;
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 14px;
    page-break-inside: avoid;
  }}

  .card-highlight {{
    background-color: #F4F8F6;
    border-left: 4px solid #115040;
  }}

  .card-warning {{
    background-color: #FFFBF0;
    border: 1px solid #F9E2AF;
    border-left: 4px solid #F3BC33;
  }}

  .card-danger {{
    background-color: #FDF2F2;
    border: 1px solid #F8D7DA;
    border-left: 4px solid #C8102E;
  }}

  /* Badges */
  .badge {{
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-right: 4px;
  }}
  .badge-free {{ background-color: #D1FAE5; color: #065F46; border: 1px solid #A7F3D0; }}
  .badge-paid {{ background-color: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }}
  .badge-critical {{ background-color: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }}
  .badge-cloud {{ background-color: #E0E7FF; color: #3730A3; border: 1px solid #C7D2FE; }}

  /* Tableaux */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 16px 0;
    font-size: 9pt;
    page-break-inside: avoid;
  }}

  th {{
    background-color: #115040;
    color: #FFFFFF;
    text-align: left;
    padding: 8px 10px;
    font-weight: 700;
    border: 1px solid #115040;
  }}

  td {{
    padding: 7px 10px;
    border: 1px solid #DCE5E1;
    vertical-align: top;
  }}

  tr:nth-child(even) td {{
    background-color: #F8FAF9;
  }}

  /* Listes */
  ul, ol {{
    margin: 0 0 12px 0;
    padding-left: 20px;
  }}

  li {{
    margin-bottom: 5px;
  }}

  /* Code & Configs */
  code {{
    font-family: "Courier New", Courier, monospace;
    background-color: #EEF3F1;
    color: #0B382C;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 9pt;
  }}

  pre {{
    background-color: #06231A;
    color: #A7F3D0;
    padding: 10px 12px;
    border-radius: 6px;
    font-family: "Courier New", Courier, monospace;
    font-size: 8.5pt;
    overflow-x: auto;
    margin: 8px 0 12px 0;
    border: 1px solid #115040;
    page-break-inside: avoid;
    line-height: 1.4;
  }}

  pre .param {{ color: #F3BC33; font-weight: bold; }}
  pre .val {{ color: #FFFFFF; }}
  pre .comment {{ color: #708F83; font-style: italic; }}

  .page-break {{
    page-break-before: always;
  }}

  .footer-note {{
    font-size: 8pt;
    color: #708F83;
    text-align: center;
    margin-top: 25px;
    border-top: 1px solid #E5EBE8;
    padding-top: 8px;
  }}

  .step-num {{
    display: inline-block;
    width: 20px;
    height: 20px;
    line-height: 20px;
    text-align: center;
    background-color: #115040;
    color: #FFFFFF;
    border-radius: 50%;
    font-size: 8.5pt;
    font-weight: bold;
    margin-right: 6px;
  }}

  .checklist {{
    list-style-type: none;
    padding-left: 0;
  }}

  .checklist li {{
    padding: 4px 0;
    position: relative;
    padding-left: 24px;
  }}

  .checklist li:before {{
    content: "☐";
    position: absolute;
    left: 4px;
    color: #115040;
    font-weight: bold;
    font-size: 11pt;
  }}
</style>
</head>
<body>

  <!-- BANDE GUINEE -->
  <div class="guinea-bar">
    <div class="guinea-bar-red"></div>
    <div class="guinea-bar-yellow"></div>
    <div class="guinea-bar-green"></div>
  </div>

  <!-- EN-TETE / PAGE 1 -->
  <div class="cover-header">
    {"<img class='logo-img' src='data:image/png;base64," + logo_b64 + "' alt='LUUMO Logo' />" if logo_b64 else "<h1 style='color:#115040;margin:0;'>LUUMO ERP</h1>"}
    <div class="doc-title">Guide d'Intégration des Solutions Tiers</div>
    <div class="doc-subtitle">Éléments Requis, Procédures d'Obtention & Configuration Technique Pas à Pas</div>
    <div class="doc-meta">République de Guinée (Conakry) • Architecture SaaS Odoo 18 / Next.js / React Native • Version 1.0 (Octobre 2026)</div>
  </div>

  <!-- RESUME EXECUTIF & TABLEAU SYNTHETIQUE -->
  <h2>1. Synthèse Globale des Solutions Tiers Requises</h2>
  <p>
    Pour opérer de manière 100% autonome, sécurisée et économique en République de Guinée, <strong>LUUMO ERP</strong>
    s'appuie sur un ensemble cohérent de 7 services partenaires. Le tableau ci-dessous résume leurs rôles, coûts et délais.
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Solution / Rôle</th>
        <th style="width: 20%;">Fournisseur Recommandé</th>
        <th style="width: 18%;">Éléments Clés Requis</th>
        <th style="width: 22%;">Coût Réel Estimé</th>
        <th style="width: 18%;">Délai d'Obtention</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Email Transactionnel</strong><br><span class="badge badge-free">Gratuit</span><br>OTP, réinitialisation, factures</td>
        <td><strong>Gmail SMTP</strong><br>(`luumo.guinee@gmail.com`)</td>
        <td>Compte Google + Mot de passe d'application (16 lettres)</td>
        <td><strong>0 GNF</strong><br>(jusqu'à 500 emails/jour)</td>
        <td><strong>15 minutes</strong><br>(immédiat en ligne)</td>
      </tr>
      <tr>
        <td><strong>SMS Transactionnels & OTP</strong><br><span class="badge badge-paid">Économique</span><br>Secours après 45s (Niveau 2)</td>
        <td><strong>Nimba SMS Guinée</strong><br>(Passerelle locale leader)</td>
        <td>Compte Nimba + Sender ID ("Luumo") + Token API</td>
        <td>~350 à 450 GNF / SMS<br>(réduit de 80% via l'éco-routage)</td>
        <td><strong>24h à 48h</strong><br>(validation Sender ID)</td>
      </tr>
      <tr>
        <td><strong>Paiement Mobile Money</strong><br><span class="badge badge-critical">Indispensable</span><br>Abonnements SaaS & Caisse</td>
        <td><strong>PayDunya / Dexchange</strong><br>ou <strong>OFMG / MTN Direct</strong></td>
        <td>RCCM / NIF + Compte Marchand + Clés API Webhook</td>
        <td>1.5% à 2.5% par transaction reçue (aucun frais fixe)</td>
        <td><strong>3 à 7 jours ouvrés</strong><br>(selon opérateur)</td>
      </tr>
      <tr>
        <td><strong>Hébergement Cloud VPS</strong><br><span class="badge badge-cloud">Infrastructure</span><br>Odoo 18 + PostgreSQL + Nginx</td>
        <td><strong>Hetzner Cloud</strong> (CPX31)<br>ou <strong>OVH / DigitalOcean</strong></td>
        <td>Compte Cloud + Serveur Ubuntu 22/24 + Clé SSH</td>
        <td>~15 € à 25 € / mois<br>(~140 000 à 240 000 GNF/mois)</td>
        <td><strong>30 minutes</strong><br>(déploiement instantané)</td>
      </tr>
      <tr>
        <td><strong>Nom de Domaine & SSL</strong><br><span class="badge badge-cloud">Identité & Sécurité</span><br>`luumo.gn` ou `luumo.com`</td>
        <td><strong>ARPT / Télécom Guinée</strong><br>+ <strong>Cloudflare & Let's Encrypt</strong></td>
        <td>Domaine `.gn` + Zone DNS Cloudflare + Certificat SSL</td>
        <td>Domaine : ~250 000 GNF/an<br>SSL & Cloudflare : <strong>0 GNF</strong></td>
        <td><strong>24h à 72h</strong> (.gn)<br>10 min (.com)</td>
      </tr>
      <tr>
        <td><strong>Distribution Mobile</strong><br><span class="badge badge-paid">Boutique & Terrain</span><br>App Android Commerçants</td>
        <td><strong>Google Play Console</strong><br>+ Expo EAS Cloud (builds)</td>
        <td>Compte Développeur Google + APK direct sur site</td>
        <td>Google Play : 25 $ (à vie)<br>Expo EAS : <strong>0 $</strong> (gratuit)</td>
        <td><strong>2 à 5 jours</strong><br>(revue Google)</td>
      </tr>
      <tr>
        <td><strong>Sauvegardes Hors-Site</strong><br><span class="badge badge-free">Sécurité Données</span><br>Dumps PostgreSQL + Filestore</td>
        <td><strong>Cloudflare R2</strong><br>ou Backblaze B2 / AWS S3</td>
        <td>Bucket S3 chiffré + Clés d'accès API R2</td>
        <td><strong>0 GNF</strong> (10 Go gratuits)<br>puis ~0.01 $/Go</td>
        <td><strong>15 minutes</strong></td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 2 : EMAIL TRANSACTIONNEL -->
  <h2>2. Email Transactionnel : Google Workspace / Gmail SMTP</h2>

  <div class="card card-highlight">
    <strong>Pourquoi c'est stratégique :</strong> L'email est la <strong>Règle 1 de l'Économie Intelligente Luumo</strong>. Chaque vérification d'inscription, changement de mot de passe ou facture envoyée par email coûte <strong>exactement 0 GNF</strong>.
  </div>

  <h3>A. Ce que vous devez avoir (Prérequis)</h3>
  <ul>
    <li>Une adresse email dédiée : <code>luumo.guinee@gmail.com</code> (ou une adresse sous domaine Google Workspace comme <code>contact@luumo.gn</code>).</li>
    <li>Un numéro de téléphone fonctionnel pour activer la validation à deux facteurs (2FA) sur le compte Google.</li>
    <li>Un accès au gestionnaire de compte Google.</li>
  </ul>

  <h3>B. Procédure d'obtention du Mot de Passe d'Application (16 caractères)</h3>
  <ol>
    <li>Connectez-vous sur votre compte Google <code>luumo.guinee@gmail.com</code> depuis un navigateur web.</li>
    <li>Accédez à la section de sécurité : <a href="https://myaccount.google.com/security">https://myaccount.google.com/security</a>.</li>
    <li>Sous la rubrique <em>"Façon dont vous vous connectez à Google"</em>, activez la <strong>Validation en deux étapes</strong> si ce n'est pas déjà fait.</li>
    <li>Une fois activée, tapez dans la barre de recherche du compte Google : <strong>"Mots de passe des applications"</strong> (ou accédez directement à <a href="https://myaccount.google.com/apppasswords">https://myaccount.google.com/apppasswords</a>).</li>
    <li>Dans le champ <em>Nom de l'application</em>, saisissez : <code>Luumo Backend Odoo</code>, puis cliquez sur <strong>Créer</strong>.</li>
    <li>Google affiche une fenêtre modale avec un mot de passe de 16 lettres (exemple : <code>abcd efgh ijkl mnop</code>). <strong>Copiez-le immédiatement</strong> (il ne sera plus affiché).</li>
  </ol>

  <h3>C. Configuration dans Luumo / Odoo</h3>
  <p>Dans l'interface Odoo (menu <em>Paramètres > Technique > Paramètres > Paramètres système</em>) ou via le fichier d'environnement :</p>
  <pre>
<span class="comment"># Paramètres Système Odoo (ir.config_parameter)</span>
<span class="param">luumo_smtp_host</span>       = <span class="val">smtp.gmail.com</span>
<span class="param">luumo_smtp_port</span>       = <span class="val">587</span>
<span class="param">luumo_smtp_encryption</span> = <span class="val">starttls</span>
<span class="param">luumo_smtp_user</span>       = <span class="val">luumo.guinee@gmail.com</span>
<span class="param">luumo_smtp_password</span>   = <span class="val">abcdefghijklmnop</span>  <span class="comment"># Les 16 caractères sans espaces</span>
  </pre>

  <!-- SAUT DE PAGE -->
  <div class="page-break"></div>

  <!-- SECTION 3 : NIMBA SMS -->
  <h2>3. SMS Transactionnels & OTP de Secours : NIMBA SMS Guinée</h2>

  <div class="card card-warning">
    <strong>Règle d'Or d'Économie :</strong> Le SMS Nimba est le filet de sécurité (Niveau 2). Il n'est déclenché que si le commerçant clique volontairement sur <em>"Recevoir par SMS"</em> après un <strong>délai de réflexion de 45 secondes</strong>. Il réutilise le <strong>même code à 6 chiffres</strong>, plafonné à 3 SMS/jour/numéro sur les préfixes guinéens valides (<code>+224 6xx</code>).
  </div>

  <h3>A. Ce que vous devez avoir (Prérequis)</h3>
  <ul>
    <li>Un compte sur la plateforme guinéenne <strong>Nimba SMS</strong> (<a href="https://nimbasms.com">https://nimbasms.com</a>).</li>
    <li>Une pièce d'identité du gérant ou document d'entreprise (RCCM / NIF) pour valider le compte professionnel.</li>
    <li>Un <strong>Sender ID</strong> validé (Nom d'expéditeur officiel apparaissant sur le téléphone des commerçants : <code>Luumo</code>).</li>
    <li>Un premier rechargement de crédits SMS en Francs Guinéens (ex: 50 000 GNF ou 100 000 GNF).</li>
  </ul>

  <h3>B. Procédure étape par étape sur Nimba SMS</h3>
  <ol>
    <li><span class="step-num">1</span> <strong>Création du compte :</strong> Rendez-vous sur <a href="https://nimbasms.com">nimbasms.com</a> et créez votre compte avec l'adresse <code>luumo.guinee@gmail.com</code>.</li>
    <li><span class="step-num">2</span> <strong>Demande du Sender ID :</strong>
      Dans le tableau de bord Nimba, cliquez sur <em>"Noms d'expéditeurs (Sender ID)"</em> > <em>"Demander un Sender ID"</em>.
      Saisissez <code>Luumo</code>. Précisez dans le motif : <em>"Plateforme ERP & Caisse pour commerçants guinéens - Envoi d'OTP et alertes transactionnelles"</em>.
      La validation par les opérateurs (Orange, MTN, Cellcom) prend généralement <strong>24h à 48h ouvrées</strong>.
    </li>
    <li><span class="step-num">3</span> <strong>Recharge de crédits :</strong>
      Rendez-vous dans la section <em>"Acheter des crédits"</em>. Choisissez le volume souhaité et payez instantanément par <strong>Orange Money</strong> ou <strong>MTN Mobile Money</strong> en GNF.
    </li>
    <li><span class="step-num">4</span> <strong>Récupération des Clés API :</strong>
      Accédez à l'onglet <em>"Développeur"</em> ou <em>"Paramètres API"</em>. Copiez :
      <ul>
        <li>Le <strong>Service ID</strong> (identifiant unique de votre compte API).</li>
        <li>Le <strong>Secret Token</strong> (jeton d'authentification Bearer).</li>
      </ul>
    </li>
  </ol>

  <h3>C. Configuration dans Luumo / Odoo</h3>
  <pre>
<span class="comment"># Paramètres Système Odoo (ir.config_parameter)</span>
<span class="param">luumo_nimba_service_id</span>   = <span class="val">votre_service_id_recu_de_nimba</span>
<span class="param">luumo_nimba_secret_token</span> = <span class="val">votre_secret_token_recu_de_nimba</span>
<span class="param">luumo_nimba_sender_name</span>  = <span class="val">Luumo</span>
  </pre>

  <!-- SECTION 4 : PAIEMENT MOBILE MONEY -->
  <h2>4. Encaissement Mobile Money : Orange Money & MTN MoMo</h2>

  <p>
    En Guinée, plus de 90% des commerçants utilisent <strong>Orange Money</strong> (OFMG) ou <strong>MTN Mobile Money</strong>.
    Luumo en a besoin pour deux flux essentiels :
  </p>
  <ol>
    <li><strong>Abonnement SaaS Luumo :</strong> Prélèvement ou paiement mensuel des forfaits commerçants (Détail 150 000 GNF/mois, Grossiste 250 000 GNF/mois, Services 100 000 GNF/mois).</li>
    <li><strong>Règlement des ventes comptoir :</strong> Option de paiement direct Mobile Money à la caisse.</li>
  </ol>

  <h3>Deux Stratégies Possibles :</h3>

  <div class="card card-highlight">
    <h4>Option A (Fortement Recommandée au Lancement) : Agrégateur Unique</h4>
    <p>
      Au lieu de signer deux contrats lourds avec chaque opérateur, passez par un agrégateur certifié opérant en Guinée
      (ex: <strong>PayDunya</strong>, <strong>TouchPay / Bizao</strong>, <strong>Dexchange</strong>, ou <strong>CinetPay</strong>).
    </p>
    <ul>
      <li><strong>Avantage :</strong> Un seul contrat, un seul KYC, une seule API unifiée pour Orange Money + MTN MoMo.</li>
      <li><strong>Délai :</strong> Opérationnel en <strong>3 à 5 jours</strong>.</li>
      <li><strong>Éléments à fournir :</strong> RCCM, NIF, pièce d'identité du gérant, RIB bancaire guinéen pour recevoir les versements automatiques.</li>
      <li><strong>Clés fournies :</strong> <code>API_KEY</code>, <code>SECRET_KEY</code>, et URL de Webhook pour validation automatique.</li>
    </ul>
  </div>

  <div class="card">
    <h4>Option B : Contrats Directs avec les Opérateurs (À grand volume)</h4>
    <table style="margin-top: 6px;">
      <tr>
        <th style="width: 50%;">Orange Finances Mobiles Guinée (OFMG)</th>
        <th style="width: 50%;">MTN Mobile Money Guinée</th>
      </tr>
      <tr>
        <td>
          • <strong>Lieu :</strong> Siège OFMG / Orange Guinée (Kaloum / Donka)<br>
          • <strong>Dossier :</strong> RCCM, NIF, Pièce d'identité, Formulaire de souscription Marchand Webpay API.<br>
          • <strong>Éléments techniques :</strong> <code>Merchant Code</code>, <code>Client ID</code>, <code>Client Secret</code>.
        </td>
        <td>
          • <strong>Lieu :</strong> Siège MTN Guinée (Kaloum / Immeuble Al-Iman)<br>
          • <strong>Dossier :</strong> Contrat cadre Marchand MoMo, Statuts de l'entreprise, RIB bancaire.<br>
          • <strong>Éléments techniques :</strong> <code>Subscription Key</code>, <code>User ID</code>, <code>API Key</code>.
        </td>
      </tr>
    </table>
  </div>

  <!-- SAUT DE PAGE -->
  <div class="page-break"></div>

  <!-- SECTION 5 : SERVEUR & HEBERGEMENT CLOUD -->
  <h2>5. Serveur & Hébergement Cloud Production</h2>

  <p>
    Luumo fonctionne avec une architecture conteneurisée <strong>Docker</strong> complète :
    Odoo 18 (Backend ERP headless), PostgreSQL 16 (Base de données relationnelle), Nginx (Reverse proxy SSL), et Next.js (Frontend Web).
  </p>

  <h3>A. Spécifications Matérielles Recommandées</h3>
  <table>
    <thead>
      <tr>
        <th>Composant</th>
        <th>Spécification Recommandée</th>
        <th>Explication Technique</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Processeur (CPU)</strong></td>
        <td><strong>4 vCPU</strong> (AMD EPYC ou Intel Xeon)</td>
        <td>Garantit des calculs de stock et rapports comptables sans latence.</td>
      </tr>
      <tr>
        <td><strong>Mémoire RAM</strong></td>
        <td><strong>8 Go</strong> (minimum absolu : 4 Go)</td>
        <td>Odoo workers + cache PostgreSQL + Next.js SSR.</td>
      </tr>
      <tr>
        <td><strong>Disque</strong></td>
        <td><strong>80 à 160 Go SSD NVMe</strong></td>
        <td>Stockage rapide de la base de données et du filestore (logos, factures PDF).</td>
      </tr>
      <tr>
        <td><strong>Système d'exploitation</strong></td>
        <td><strong>Ubuntu 22.04 LTS ou 24.04 LTS</strong></td>
        <td>Stabilité éprouvée, support à long terme et compatibilité Docker native.</td>
      </tr>
    </tbody>
  </table>

  <h3>B. Fournisseurs Cloud Recommandés</h3>
  <ul>
    <li><strong>Hetzner Cloud (Recommandé #1 pour le rapport qualité/prix) :</strong> Instance <code>CPX31</code> (4 vCPU AMD, 8 Go RAM, 160 Go NVMe, trafic 20 To inclus) à seulement <strong>~15 € / mois</strong>.</li>
    <li><strong>OVHcloud :</strong> VPS Comfort (4 vCPU, 8 Go RAM, 100 Go NVMe) à <strong>~20 € / mois</strong> (datacenter France/Europe, support francophone).</li>
    <li><strong>DigitalOcean :</strong> Droplet 8 Go RAM / 4 vCPU à <strong>~48 $ / mois</strong>.</li>
  </ul>

  <h3>C. Procédure de Préparation et Sécurisation du Serveur</h3>
  <ol>
    <li>Commander le VPS avec le système d'exploitation <strong>Ubuntu 22.04 LTS</strong>.</li>
    <li>Générer une paire de clés SSH sur votre machine locale et l'injecter sur le serveur :
      <pre>ssh-keygen -t ed25519 -C "admin@luumo.gn"</pre>
    </li>
    <li>Installer Docker Engine et le plugin Docker Compose :
      <pre>
sudo apt update && sudo apt install -y curl ufw fail2ban
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
      </pre>
    </li>
    <li>Verrouiller le pare-feu du serveur (ports stricts nécessaires) :
      <pre>
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    <span class="comment"># SSH sécurisé</span>
sudo ufw allow 80/tcp    <span class="comment"># HTTP (redirection Let's Encrypt)</span>
sudo ufw allow 443/tcp   <span class="comment"># HTTPS sécurisé</span>
sudo ufw enable
      </pre>
    </li>
  </ol>

  <!-- SECTION 6 : DOMAINE & SSL -->
  <h2>6. Nom de Domaine Officiel & Sécurité SSL (HTTPS)</h2>

  <h3>A. Choix et Achat du Nom de Domaine</h3>
  <ul>
    <li><strong>Option Locale (.gn) :</strong> <code>luumo.gn</code> ou <code>luumo-erp.gn</code>.
      Géré par l'<strong>ARPT</strong> (Autorité de Régulation des Postes et Télécommunications de Guinée). Achat auprès de revendeurs accrédités (ex: Afribone Guinée, Espace Guinée, etc.). Coût moyen : <strong>200 000 à 350 000 GNF/an</strong>.
    </li>
    <li><strong>Option Internationale (.com / .app) :</strong> <code>luumo.com</code> ou <code>luumo.app</code>.
      Achat instantané sur Cloudflare Registrar ou Namecheap (~10 à 14 $/an).
    </li>
  </ul>

  <h3>B. Configuration DNS Recommandée (via Cloudflare Gratuit)</h3>
  <p>Lier le domaine à Cloudflare permet de bénéficier gratuitement du pare-feu anti-DDoS et d'un cache ultra-rapide en Afrique :</p>
  <table>
    <thead>
      <tr>
        <th>Type</th>
        <th>Nom d'hôte</th>
        <th>Destination (Valeur)</th>
        <th>Usage</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>A</code></td>
        <td><code>@</code> (luumo.gn)</td>
        <td><code>IP_PUBLIQUE_DU_SERVEUR</code></td>
        <td>Site vitrine & Landing page</td>
      </tr>
      <tr>
        <td><code>A</code></td>
        <td><code>app</code> (app.luumo.gn)</td>
        <td><code>IP_PUBLIQUE_DU_SERVEUR</code></td>
        <td>Application Web Commerçants (Next.js)</td>
      </tr>
      <tr>
        <td><code>A</code></td>
        <td><code>api</code> (api.luumo.gn)</td>
        <td><code>IP_PUBLIQUE_DU_SERVEUR</code></td>
        <td>API Backend & ERP (Odoo 18)</td>
      </tr>
    </tbody>
  </table>

  <h3>C. Certificat SSL Let's Encrypt (100% Gratuit à vie)</h3>
  <pre>
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.luumo.gn -d api.luumo.gn -d luumo.gn
<span class="comment"># Renouvellement automatique testé via cron</span>
sudo certbot renew --dry-run
  </pre>

  <!-- SAUT DE PAGE -->
  <div class="page-break"></div>

  <!-- SECTION 7 : DISTRIBUTION MOBILE -->
  <h2>7. Distribution Mobile : Google Play Store & Déploiement Terrain</h2>

  <div class="card card-highlight">
    <strong>Réalité du terrain guinéen :</strong> En Guinée, la majorité des commerçants utilisent des téléphones Android (Tecno, Infinix, Itel, Samsung). La publication sur le Google Play Store apporte la crédibilité officielle, tandis que le <strong>téléchargement direct d'APK</strong> permet d'équiper immédiatement un commerçant sans qu'il ait besoin d'un compte Google Play configuré.
  </div>

  <h3>A. Ce que vous devez avoir (Prérequis Google Play)</h3>
  <ul>
    <li>Un <strong>Compte Google Play Console Développeur</strong> : Frais unique d'inscription de <strong>25 $ à vie</strong>, payable par carte bancaire internationale (Visa / Mastercard UBA, Vista Bank, Ecobank ou carte virtuelle).</li>
    <li>Un compte sur <strong>Expo Application Services (EAS)</strong> (<a href="https://expo.dev">https://expo.dev</a>) : Tiers gratuit largement suffisant pour compiler les applications dans le cloud.</li>
    <li><strong>Assets graphiques requis par Google :</strong>
      <ul>
        <li>Icône d'application : 512 x 512 pixels (PNG 32-bit sans transparence).</li>
        <li>Bannière promotionnelle (Feature Graphic) : 1024 x 500 pixels (JPG ou PNG sans transparence).</li>
        <li>Captures d'écran smartphone : Minimum 4 captures réelles de l'application (Caisse, Ventes, Stocks, Carnet de dettes).</li>
        <li>URL de la <strong>Politique de Confidentialité</strong> (Privacy Policy) : Obligatoire pour Google Play (ex: <code>https://luumo.gn/politique-confidentialite</code>).</li>
      </ul>
    </li>
  </ul>

  <h3>B. Procédure de Génération des Binaires avec Expo EAS</h3>
  <ol>
    <li>Installer l'outil CLI EAS globalement :
      <pre>npm install -g eas-cli && eas login</pre>
    </li>
    <li><strong>Génération du paquet officiel Google Play (.AAB signé) :</strong>
      <pre>
cd luumo_mobile
eas build --platform android --profile production
      </pre>
      Le fichier <code>.aab</code> résultant est directement téléchargeable et prêt à être soumis sur la Google Play Console.
    </li>
    <li><strong>Génération de l'APK direct (Pour installation terrain) :</strong>
      <pre>
cd luumo_mobile
eas build --platform android --profile preview
      </pre>
      Le fichier <code>.apk</code> généré peut être hébergé sur <code>https://luumo.gn/telecharger</code> et partagé facilement par WhatsApp, Bluetooth ou Xender par vos commerciaux lors des visites en boutique à Madina, Kaloum ou Cosa !
    </li>
  </ol>

  <!-- SECTION 8 : SAUVEGARDES HORS-SITE -->
  <h2>8. Sauvegardes Automatiques Cloud (Disaster Recovery)</h2>

  <div class="card card-danger">
    <strong>Sécurité vitale :</strong> Les données comptables et dettes clients des commerçants guinéens sont leur trésor le plus précieux. Une panne serveur ne doit jamais entraîner la moindre perte de données.
  </div>

  <h3>A. Solution Recommandée : Cloudflare R2 (Stockage Objet S3)</h3>
  <ul>
    <li><strong>Pourquoi Cloudflare R2 :</strong> <strong>10 Go gratuits à vie</strong>, <strong>0 frais de téléchargement</strong> (contrairement à AWS S3 qui facture la bande passante sortante).</li>
    <li><strong>Procédure de mise en place :</strong>
      <ol>
        <li>Se connecter sur Cloudflare > menu <em>"R2 Object Storage"</em> > Créer un bucket nommé <code>luumo-backups</code>.</li>
        <li>Créer une clé API R2 avec les droits d'écriture et noter l'<code>Access Key ID</code> et le <code>Secret Access Key</code>.</li>
        <li>Installer <code>rclone</code> sur le serveur Ubuntu pour synchroniser automatiquement les sauvegardes.</li>
      </ol>
    </li>
  </ul>

  <h3>B. Script Cron Quotidien Automatique (Chiffrement GPG)</h3>
  <pre>
<span class="comment"># Script exécuté tous les soirs à 03h00 du matin</span>
<span class="param">BACKUP_DATE</span>=$(date +%Y%m%d_%H%M%S)
<span class="comment"># 1. Dump SQL PostgreSQL</span>
docker exec luumo_postgres_db pg_dump -U odoo luumo | gzip > /tmp/luumo_db_$BACKUP_DATE.sql.gz
<span class="comment"># 2. Chiffrement de sécurité AES-256</span>
gpg --batch --yes --passphrase "CLE_DE_CHIFFREMENT_FORTE" -c /tmp/luumo_db_$BACKUP_DATE.sql.gz
<span class="comment"># 3. Synchronisation vers Cloudflare R2 distant</span>
rclone copy /tmp/luumo_db_$BACKUP_DATE.sql.gz.gpg r2:luumo-backups/daily/
rm -f /tmp/luumo_db_$BACKUP_DATE.sql.gz*
  </pre>

  <!-- SAUT DE PAGE -->
  <div class="page-break"></div>

  <!-- SECTION 9 : BUDGET & CHECKLIST -->
  <h2>9. Budget d'Exploitation Estimé & Checklist de Déploiement</h2>

  <h3>A. Budget Prévisionnel Mensuel & Annuel</h3>
  <table>
    <thead>
      <tr>
        <th>Poste de Dépense</th>
        <th>Fournisseur</th>
        <th>Coût Mensuel Estimé</th>
        <th>Coût Annuel Estimé</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Serveur VPS (4 vCPU / 8 Go RAM)</strong></td>
        <td>Hetzner Cloud</td>
        <td>~15 € (~142 000 GNF)</td>
        <td>~180 € (~1 700 000 GNF)</td>
      </tr>
      <tr>
        <td><strong>Nom de Domaine (.gn ou .com)</strong></td>
        <td>ARPT ou Cloudflare</td>
        <td>~20 000 GNF</td>
        <td>~250 000 GNF / an</td>
      </tr>
      <tr>
        <td><strong>Email Transactionnel</strong></td>
        <td>Gmail SMTP</td>
        <td><strong>0 GNF</strong></td>
        <td><strong>0 GNF</strong></td>
      </tr>
      <tr>
        <td><strong>SMS Transactionnels (Nimba)</strong></td>
        <td>Nimba SMS Guinée</td>
        <td>~50 000 GNF (recharge initiale)</td>
        <td>Selon volume réel (~350 GNF/sms)</td>
      </tr>
      <tr>
        <td><strong>Google Play Console</strong></td>
        <td>Google Inc.</td>
        <td>-</td>
        <td><strong>25 $ à vie</strong> (~215 000 GNF une fois)</td>
      </tr>
      <tr>
        <td><strong>Certificat SSL & Protection DDoS</strong></td>
        <td>Let's Encrypt + Cloudflare</td>
        <td><strong>0 GNF</strong></td>
        <td><strong>0 GNF</strong></td>
      </tr>
      <tr>
        <td><strong>Sauvegardes Cloud (R2)</strong></td>
        <td>Cloudflare R2 (10 Go)</td>
        <td><strong>0 GNF</strong></td>
        <td><strong>0 GNF</strong></td>
      </tr>
      <tr style="background-color: #E8F2EE; font-weight: bold;">
        <td>TOTAL ESTIMÉ DE DÉPART</td>
        <td>-</td>
        <td><strong>~212 000 GNF / mois</strong></td>
        <td><strong>~2 300 000 GNF pour l'An 1</strong></td>
      </tr>
    </tbody>
  </table>

  <h3>B. Checklist Opérationnelle Chronologique pour Thierno</h3>
  <ul class="checklist">
    <li><strong>Jour 1 :</strong> Activer la validation 2FA sur <code>luumo.guinee@gmail.com</code> et générer le mot de passe d'application Google (16 lettres).</li>
    <li><strong>Jour 1 :</strong> Créer le compte Nimba SMS sur <code>nimbasms.com</code>, soumettre la demande de Sender ID <code>Luumo</code> et recharger 50 000 GNF par Orange Money.</li>
    <li><strong>Jour 2 :</strong> Réserver le nom de domaine officiel (ex: <code>luumo.gn</code> ou <code>luumo.com</code>) et créer le compte Cloudflare gratuit pour gérer les DNS.</li>
    <li><strong>Jour 3 :</strong> Louer le serveur VPS Ubuntu (Hetzner Cloud <code>CPX31</code> ou OVH) et configurer l'accès sécurisé par clé SSH.</li>
    <li><strong>Jour 4 :</strong> Créer le compte développeur Google Play Console (25 $) et initialiser le projet Expo EAS pour compiler le premier APK de test.</li>
    <li><strong>Jour 5 :</strong> Contacter l'agrégateur de paiement Mobile Money (PayDunya ou Dexchange) pour ouvrir le compte marchand Guinée (fournir RCCM/NIF et RIB).</li>
    <li><strong>Jour 6 :</strong> Injecter les clés d'environnement (SMTP Gmail, Nimba SMS, Domaine) dans Luumo Odoo et lancer les conteneurs Docker en production.</li>
    <li><strong>Jour 7 :</strong> Générer le certificat SSL Let's Encrypt et tester un parcours complet d'inscription en direct sur smartphone avec un numéro guinéen (+224).</li>
  </ul>

  <!-- PIED DE PAGE -->
  <div class="footer-note">
    Document technique officiel LUUMO ERP • Conçu pour le déploiement opérationnel en République de Guinée • Confidentiel
  </div>

</body>
</html>
"""

print(f"Écriture du fichier HTML temporaire dans {HTML_TEMP_PATH}...")
with open(HTML_TEMP_PATH, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Génération du PDF avec wkhtmltopdf vers {PDF_OUTPUT_PATH}...")
cmd = [
    "wkhtmltopdf",
    "--enable-local-file-access",
    "--margin-top", "15mm",
    "--margin-bottom", "15mm",
    "--margin-left", "15mm",
    "--margin-right", "15mm",
    "--page-size", "A4",
    "--encoding", "UTF-8",
    "--footer-center", "[page] / [topage]",
    "--footer-font-size", "8",
    "--footer-font-name", "Segoe UI, Arial, sans-serif",
    HTML_TEMP_PATH,
    PDF_OUTPUT_PATH
]

res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
if res.returncode == 0:
    print(f"✓ PDF généré avec succès ({os.path.getsize(PDF_OUTPUT_PATH)} octets) !")
else:
    print(f"Avertissement / Erreur lors de la génération PDF :")
    print(res.stderr)
    if os.path.exists(PDF_OUTPUT_PATH) and os.path.getsize(PDF_OUTPUT_PATH) > 0:
        print(f"✓ PDF créé malgré des warnings ({os.path.getsize(PDF_OUTPUT_PATH)} octets).")
    else:
        sys.exit(1)

# Écriture de la version Markdown d'accompagnement
md_content = """# Guide Complet d'Intégration des Solutions Tiers — LUUMO ERP
**Architecture SaaS : Odoo 18 Headless • Next.js Web • React Native Mobile (Expo)**  
*Conçu pour le contexte terrain en République de Guinée (Conakry)*

---

## 1. Synthèse Globale des Solutions Tiers

| Solution / Rôle | Fournisseur Recommandé | Éléments Clés Requis | Coût Réel Estimé | Délai d'Obtention |
| :--- | :--- | :--- | :--- | :--- |
| **Email Transactionnel**<br>(OTP, reset mot de passe, factures) | **Gmail SMTP**<br>(`luumo.guinee@gmail.com`) | Compte Google + Mot de passe d'application (16 lettres) | **0 GNF** (jusqu'à 500 emails/jour) | **15 minutes** |
| **SMS Transactionnels & OTP**<br>(Secours après 45s) | **Nimba SMS Guinée**<br>(Passerelle locale leader) | Compte Nimba + Sender ID ("Luumo") + Token API | ~350 à 450 GNF / SMS (réduit de 80% via éco-routage) | **24h à 48h** |
| **Paiement Mobile Money**<br>(Abonnements SaaS & Caisse) | **PayDunya / Dexchange**<br>ou **OFMG / MTN Direct** | RCCM / NIF + Compte Marchand + Clés API Webhook | 1.5% à 2.5% par transaction reçue (aucun frais fixe) | **3 à 7 jours** |
| **Hébergement Cloud VPS**<br>(Odoo 18 + PostgreSQL + Nginx) | **Hetzner Cloud** (CPX31)<br>ou **OVH / DigitalOcean** | Compte Cloud + Serveur Ubuntu 22/24 + Clé SSH | ~15 € à 25 € / mois (~140 000 à 240 000 GNF/mois) | **30 minutes** |
| **Nom de Domaine & SSL**<br>(`luumo.gn` ou `luumo.com`) | **ARPT / Télécom Guinée**<br>+ **Cloudflare & Let's Encrypt** | Domaine `.gn` + Zone DNS Cloudflare + Certificat SSL | Domaine : ~250 000 GNF/an<br>SSL & Cloudflare : **0 GNF** | **24h à 72h** (.gn)<br>10 min (.com) |
| **Distribution Mobile**<br>(App Android Commerçants) | **Google Play Console**<br>+ Expo EAS Cloud (builds) | Compte Développeur Google + APK direct sur site | Google Play : 25 $ (à vie)<br>Expo EAS : **0 $** (gratuit) | **2 à 5 jours** |
| **Sauvegardes Hors-Site**<br>(Dumps PostgreSQL + Filestore) | **Cloudflare R2**<br>ou Backblaze B2 / AWS S3 | Bucket S3 chiffré + Clés d'accès API R2 | **0 GNF** (10 Go gratuits) puis ~0.01 $/Go | **15 minutes** |

---

## 2. Email Transactionnel : Gmail SMTP

### Éléments requis
1. Compte Google : `luumo.guinee@gmail.com`.
2. Validation en 2 étapes (2FA) activée sur le compte Google.
3. Mot de passe d'application dédié de 16 caractères généré depuis [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

### Procédure d'obtention
1. Rendez-vous sur [https://myaccount.google.com/security](https://myaccount.google.com/security).
2. Activez la **Validation en deux étapes** avec votre numéro de téléphone guinéen.
3. Rendez-vous ensuite sur [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
4. Nommez l'application `Luumo Backend Odoo` et cliquez sur **Créer**.
5. Notez le code de 16 caractères généré (ex: `abcd efgh ijkl mnop`).

### Paramètres Odoo (`ir.config_parameter`)
- `luumo_smtp_host` = `smtp.gmail.com`
- `luumo_smtp_port` = `587`
- `luumo_smtp_encryption` = `starttls`
- `luumo_smtp_user` = `luumo.guinee@gmail.com`
- `luumo_smtp_password` = `<16_caracteres_sans_espaces>`

---

## 3. SMS Transactionnels : Nimba SMS Guinée

### Éléments requis
1. Compte sur [nimbasms.com](https://nimbasms.com).
2. Pièce d'identité ou RCCM / NIF pour valider le profil entreprise.
3. Demande de Sender ID validée auprès des opérateurs guinéens : `Luumo`.
4. Recharge de crédits SMS en GNF (via Orange Money ou MTN MoMo).
5. Clés API : `Service ID` et `Secret Token`.

### Procédure étape par étape
1. S'inscrire sur [nimbasms.com](https://nimbasms.com).
2. Aller dans *Noms d'expéditeurs* > *Demander un Sender ID* : saisir `Luumo` (délai 24h-48h).
3. Acheter un pack de crédits (50 000 GNF ou 100 000 GNF) par Mobile Money.
4. Dans l'onglet *Développeur*, copier le **Service ID** et le **Secret Token**.

### Paramètres Odoo (`ir.config_parameter`)
- `luumo_nimba_service_id` = `<votre_service_id>`
- `luumo_nimba_secret_token` = `<votre_secret_token>`
- `luumo_nimba_sender_name` = `Luumo`

---

## 4. Encaissement Mobile Money : Orange Money & MTN MoMo

### Stratégie recommandée : Agrégateur Unique (PayDunya, Dexchange, TouchPay ou CinetPay)
- **Avantage :** 1 seul contrat, 1 seule API unifiée pour Orange Money + MTN MoMo Guinée.
- **Délai :** 3 à 5 jours ouvrés.
- **Documents requis :** RCCM / NIF, Pièce d'identité du gérant, RIB bancaire guinéen pour les virements automatiques.
- **Frais :** 1.5% à 2.5% par transaction reçue (0 frais fixe mensuel).

---

## 5. Serveur Cloud & Hébergement Production

### Spécifications recommandées
- **4 vCPU**, **8 Go RAM**, **80 à 160 Go SSD NVMe**.
- Hébergeur : **Hetzner Cloud** (modèle `CPX31` à ~15 € / mois) ou **OVH VPS Comfort** à ~20 € / mois.
- Système d'exploitation : **Ubuntu 22.04 LTS**.
- Ports pare-feu ouverts : `22/tcp` (SSH), `80/tcp` (HTTP), `443/tcp` (HTTPS).

---

## 6. Nom de Domaine & Sécurité SSL

- Nom de domaine `.gn` : auprès de l'ARPT / revendeur accrédité (~200 000 à 350 000 GNF/an) ou `.com` sur Cloudflare (~12 $/an).
- DNS gérés sur **Cloudflare** (gratuit, CDN mondial et protection anti-DDoS).
- Certificat SSL : **Let's Encrypt** généré gratuitement via Certbot (`certbot --nginx`).

---

## 7. Distribution Mobile : Google Play Store & Terrain

- Compte **Google Play Console** : 25 $ (paiement unique à vie par carte bancaire internationale).
- Compte **Expo** : gratuit sur [expo.dev](https://expo.dev).
- Compilation du binaire de production :
  - Pour Google Play : `eas build --platform android --profile production` (génère le `.aab`).
  - Pour distribution terrain directe : `eas build --platform android --profile preview` (génère l'`.apk` téléchargeable sur `luumo.gn/telecharger`).

---

## 8. Sauvegardes Automatiques Cloud (Disaster Recovery)

- Stockage S3 : **Cloudflare R2** (10 Go gratuits à vie, 0 frais de sortie).
- Sauvegarde quotidienne chiffrée par cron (dump PostgreSQL + archive filestore chiffrée avec GPG) et synchronisée vers le bucket `luumo-backups`.

---

## 9. Budget Récapitulatif Estimé
- **Démarrage :** ~25 $ (Google Play une fois) + ~50 000 GNF (recharge SMS Nimba) + ~250 000 GNF (domaine .gn annuel).
- **Mensuel récurrent :** ~15 € (~142 000 GNF/mois pour le VPS Hetzner).
- **Total An 1 :** ~2 300 000 GNF tout compris.
"""

print(f"Écriture de la version Markdown dans {MD_OUTPUT_PATH}...")
with open(MD_OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write(md_content)

print("✓ Terminé avec succès !")
