# Guide Complet d'Intégration des Solutions Tiers — LUUMO ERP
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
