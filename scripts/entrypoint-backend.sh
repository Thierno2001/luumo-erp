#!/bin/bash
set -e

DB_HOST="${HOST:-db}"
DB_PORT="${PORT:-5432}"
DB_USER="${USER:-odoo}"
DB_NAME="${LUUMO_DB_NAME:-luumo}"

echo "[Luumo Infra] Attente de la base PostgreSQL (${DB_HOST}:${DB_PORT})..."
python3 - <<EOF
import socket, sys, time
host, port = "${DB_HOST}", int("${DB_PORT}")
for _ in range(30):
    try:
        with socket.create_connection((host, port), timeout=2):
            print("[Luumo Infra] PostgreSQL est prêt.")
            sys.exit(0)
    except OSError:
        time.sleep(1)
print("[Luumo Infra] Erreur : PostgreSQL injoignable après 30s.", file=sys.stderr)
sys.exit(1)
EOF

if [ "${LUUMO_AUTO_UPGRADE:-0}" = "1" ]; then
    echo "[Luumo Infra] Mise à jour automatique de luumo_base et luumo_api sur la base '${DB_NAME}'..."
    odoo -d "${DB_NAME}" -u luumo_base,luumo_api --without-demo=all --stop-after-init
fi

echo "[Luumo Infra] Démarrage du serveur API Luumo..."
exec /entrypoint.sh "$@"
