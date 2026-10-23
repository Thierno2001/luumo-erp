# LUUMO — Plateforme de Gestion 360° & Caisse Mobile Money (Guinée & Afrique de l'Ouest)

> **Plateforme ERP & Point de Vente 360°** pensée pour les commerçants, grossistes, importateurs et PME en Guinée (Conakry & intérieur).
> Architecture Headless modulaire avec **Application Web (`luumo_web`)**, **Application Mobile (`luumo_mobile`)**, **Passerelle REST sécurisée OWASP (`luumo_api`)** et **Socle Métier & Comptabilité SYSCOHADA (`luumo_base`)**.

---

## 1. Architecture Modulaire du Projet (`v2.0.0`)

```text
luumo_project/
├── .github/workflows/
│   └── ci-cd-containers.yml        # Pipeline CI/CD GitHub Actions -> GitHub Container Registry (ghcr.io)
├── config/
│   └── odoo.conf                   # Configuration serveur durcie (dbfilter=^luumo$, list_db=False)
├── scripts/
│   ├── entrypoint-backend.sh       # Sonde PostgreSQL + auto-upgrade des modules au démarrage
│   └── bump-version.py             # Synchronisation SemVer (VERSION, manifests, package.json)
├── custom_addons/
│   ├── luumo_base/                 # COUCHE 1 : DOMAINE, MODÈLES SQL & ISOLATION MULTI-SOCIÉTÉS
│   │   ├── data/                   # Devise GNF (Franc Guinéen, 0 décimale)
│   │   ├── security/               # ACL (ir.model.access.csv) & Règles Multi-Sociétés (ir.rule)
│   │   └── models/                 # luumo.payment.transaction (QR/Mobile Money) & res.company
│   └── luumo_api/                  # COUCHE 2 : SERVICES TRANSVERSES & CONTRÔLEURS REST DÉCOUPLÉS
│       ├── services/               # http_core, security_owasp, accounting_service, serializers
│       └── controllers/            # 10 contrôleurs indépendants (health, auth, pos, stock, dettes, achats, rh, flotte, paiements)
├── luumo_web/                      # COUCHE 3 : APPLICATION WEB 360° (Next.js 16 + Tailwind CSS + Dockerfile Standalone)
├── luumo_mobile/                   # COUCHE 4 : APPLICATION MOBILE TERRAIN (React Native + Expo)
├── Dockerfile.backend              # Image Docker immuable de production pour le Backend
├── docker-compose.yml              # Orchestration Développement (PostgreSQL 16 + Backend API)
├── docker-compose.prod.yml         # Orchestration Production (Images versionnées depuis ghcr.io)
├── Makefile                        # Commandes d'exploitation (make up, make check, make bump...)
└── VERSION                         # Version sémantique courante (2.0.0)
```

---

## 2. Fonctionnalités Clés

### Navigation 360° Épurée (8 Applications Métier)
L'écran d'accueil (`/`) présente uniquement le lanceur des **8 applications essentielles** :
1. **Point de Vente (`/pos`)** : Caisse comptoir rapide, scan code-barres, reçu thermique imprimable avec QR Code.
2. **Ventes (`/orders`)** : Historique des commandes et factures clients.
3. **Tableaux de bord (`/dashboard`)** : Chiffre d'affaires du jour/mois, créances dehors, alertes stock et évolution sur 7 jours.
4. **Inventaire (`/products`)** : Catalogue articles, seuils de rupture (`<= 5`), valorisation et ajustement de stock en 1 clic.
5. **Achats (`/purchases`)** : Commandes fournisseurs, importations et réception directe en stock.
6. **Clients & Dettes (`/customers`)** : Enregistrement **Particulier** ou **Entreprise B2B (NIF / RCCM)**, suivi du carnet de dettes et remboursements partiels ou totaux.
7. **Employés & Frais (`/hr`)** : Équipe et suivi des dépenses de fonctionnement (carburant groupe électrogène, manutention, transport).
8. **Flotte (`/fleet`)** : Gestion des camions, tricycles et motos de livraison.

### Encaissement par Code QR & Passerelle Mobile Money B2B
- Génération dynamique de **Codes QR Marchands** (**Orange Money Guinée**, **MTN MoMoPay**, **PayCard**) + **Code USSD de secours** (`*144*...#`, `*440*...#`).
- Récepteur **Webhook B2B** (`POST /api/luumo/v1/payments/webhook`) sécurisé par signature cryptographique **HMAC-SHA256** (`X-Luumo-Signature`) validant automatiquement la vente ou le règlement de dette en temps réel.

### Sécurité OWASP Top 10 & Isolation SaaS
- **Isolation Multi-Sociétés** : Chaque inscription (`/register`) crée une entreprise (`res.company`) cloisonnée.
- **Protection Anti-Brute-Force** : Rate-limiting par fenêtre glissante sur `/auth/login` et `/auth/register`.
- **Validation Stricte** : Politique de mot de passe 12+ caractères (OWASP ASVS), nettoyage anti-XSS et rotation du `session_id`.

---

## 3. Démarrage Rapide (Développement)

```bash
# 1. Vérifier la compilation Python (Backend) et TypeScript (Frontend)
make check

# 2. Démarrer les conteneurs PostgreSQL 16 + Backend API
make up

# 3. Initialiser la base 'luumo' (une seule fois au premier lancement)
make init-db

# 4. Lancer l'interface Web sur http://localhost:3000
cd luumo_web && npm run dev
```

---

## 4. Versioning SemVer, CI/CD GitHub Actions & Déploiement Production

```bash
# Incrémenter la version dans tout le projet (VERSION, manifests backend, package.json)
make bump V=2.1.0

# Construire les images immuables localement
make build-images

# Déployer une version précise en production depuis GitHub Container Registry (ghcr.io)
LUUMO_VERSION=2.1.0 docker compose -f docker-compose.prod.yml up -d
```
