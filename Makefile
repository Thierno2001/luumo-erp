# ==============================================================================
# LUUMO — Commandes d'exploitation Infrastructure, CI/CD & Versioning
# ==============================================================================
APP_VERSION ?= $(shell cat VERSION 2>/dev/null || echo "2.0.0")
GIT_COMMIT  ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "local")
BUILD_DATE  ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
GITHUB_ORG  ?= luumo

.PHONY: help up down restart logs status init-db upgrade check test version bump build-images

help:
	@echo "Commandes Luumo (v$(APP_VERSION)) :"
	@echo "  make up            - Démarre PostgreSQL et Backend API en mode développement"
	@echo "  make init-db       - Initialise la base 'luumo' avec luumo_base et luumo_api"
	@echo "  make upgrade       - Met à jour les modules luumo_base et luumo_api"
	@echo "  make restart       - Redémarre le serveur API"
	@echo "  make logs          - Affiche les journaux du backend en temps réel"
	@echo "  make status        - Vérifie l'état des conteneurs et la santé de l'API"
	@echo "  make check         - Vérifie la syntaxe Python (backend) et TypeScript (frontend)"
	@echo "  make test          - Exécute les tests unitaires et vérifications ECC (backend & web)"
	@echo "  make version       - Affiche la version courante du projet"
	@echo "  make bump V=x.y.z  - Met à jour la version SemVer partout (ex: make bump V=2.1.0)"
	@echo "  make build-images  - Construit les images Docker immuables (backend + web)"
	@echo "  make down          - Arrête les conteneurs"

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart web

logs:
	docker compose logs -f web

status:
	docker compose ps
	@curl -s http://127.0.0.1:8069/api/luumo/v1/health || echo "Backend API non démarré sur :8069"

init-db:
	docker compose stop web
	docker compose run --rm web odoo -d luumo -i luumo_base,luumo_api --without-demo=all --stop-after-init
	docker compose start web

upgrade:
	docker compose stop web
	docker compose run --rm web odoo -d luumo -u luumo_base,luumo_api --without-demo=all --stop-after-init
	docker compose start web

check:
	python3 -m py_compile custom_addons/luumo_base/models/*.py custom_addons/luumo_api/services/*.py custom_addons/luumo_api/controllers/*.py scripts/bump-version.py
	cd luumo_web && npx tsc --noEmit
	@echo "✓ Backend Python & Frontend TypeScript validés avec 0 erreur (v$(APP_VERSION))."

test:
	python3 -m unittest discover -s tests -p "test_*.py" -v
	cd luumo_web && npx tsc --noEmit
	@echo "✓ Suite de tests ECC validée avec succès (Backend & Web v$(APP_VERSION))."

version:
	@echo "Version courante Luumo : v$(APP_VERSION) (Backend Odoo : 18.0.$(APP_VERSION))"

bump:
	@if [ -z "$(V)" ]; then echo "Usage: make bump V=2.1.0"; exit 1; fi
	python3 scripts/bump-version.py $(V)

build-images:
	docker build -f Dockerfile.backend \
		--build-arg APP_VERSION=$(APP_VERSION) \
		--build-arg GIT_COMMIT=$(GIT_COMMIT) \
		--build-arg BUILD_DATE=$(BUILD_DATE) \
		-t ghcr.io/$(GITHUB_ORG)/luumo-backend:$(APP_VERSION) \
		-t ghcr.io/$(GITHUB_ORG)/luumo-backend:latest .
	docker build -f luumo_web/Dockerfile \
		--build-arg APP_VERSION=$(APP_VERSION) \
		--build-arg GIT_COMMIT=$(GIT_COMMIT) \
		--build-arg BUILD_DATE=$(BUILD_DATE) \
		-t ghcr.io/$(GITHUB_ORG)/luumo-web:$(APP_VERSION) \
		-t ghcr.io/$(GITHUB_ORG)/luumo-web:latest ./luumo_web
