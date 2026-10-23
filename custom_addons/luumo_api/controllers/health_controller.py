# -*- coding: utf-8 -*-
"""
Contrôleur de Santé & Supervision Infrastructure (`/ping`, `/health`)
"""
from odoo.http import request

from ..services.http_core import LuumoBaseController, luumo_route


class LuumoHealthController(LuumoBaseController):

    @luumo_route('/ping', ['GET'], auth='none')
    def ping(self):
        return self._ok({
            'service': 'luumo-api',
            'version': '18.0.2.0.0',
            'region': "Guinée & Afrique de l'Ouest",
            'security': 'OWASP-ASVS-v4',
            'db': request.db,
        })

    @luumo_route('/health', ['GET'], auth='none')
    def health(self):
        """Endpoint de supervision profonde (Docker Healthcheck & Load Balancer)."""
        db_ok = False
        try:
            if request.db and request.env and request.env.cr:
                request.env.cr.execute('SELECT 1')
                db_ok = request.env.cr.fetchone() == (1,)
        except Exception:  # noqa: BLE001
            db_ok = False

        status = 200 if db_ok else 503
        return self._ok({
            'status': 'healthy' if db_ok else 'degraded',
            'service': 'luumo-api',
            'version': '18.0.2.0.0',
            'database': request.db or 'unconfigured',
            'database_connected': db_ok,
        }, status=status)
