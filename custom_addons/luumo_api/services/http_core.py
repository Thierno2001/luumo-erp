# -*- coding: utf-8 -*-
"""
Socle HTTP & Base Controller pour Luumo REST API
================================================
Fournit :
- Le décorateur `@luumo_route`
- Le formatage standardisé des réponses JSON (`_ok`, `_error`)
- Les en-têtes de sécurité HTTP (OWASP A05)
- La gestion centralisée des erreurs transactionnelles (`_guard`)
"""
import logging

from odoo import http
from odoo.exceptions import AccessError, UserError, ValidationError
from odoo.http import request

_logger = logging.getLogger(__name__)

API_PREFIX = '/api/luumo/v1'
CORS_ORIGIN = '*'
MAX_JSON_BYTES = 64 * 1024  # 64 Ko max (Protection DoS OWASP)
LOW_STOCK_THRESHOLD = 5

SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
}


def luumo_route(path, methods, auth='public'):
    """Décorateur standardisé pour déclarer un endpoint JSON Luumo."""
    return http.route(
        f'{API_PREFIX}{path}',
        type='http',
        auth=auth,
        methods=list(methods) + ['OPTIONS'],
        csrf=False,
        cors=CORS_ORIGIN,
    )


class LuumoBaseController(http.Controller):
    """Contrôleur de base partagé par tous les contrôleurs métier Luumo."""

    def _client_ip(self):
        forwarded = request.httprequest.headers.get('X-Forwarded-For')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return request.httprequest.remote_addr or 'unknown'

    def _ok(self, data=None, status=200, **extra):
        payload = {'success': True, 'data': data}
        payload.update(extra)
        resp = request.make_json_response(payload, status=status)
        for k, v in SECURITY_HEADERS.items():
            resp.headers[k] = v
        return resp

    def _error(self, message, status=400, headers=None):
        resp = request.make_json_response({'success': False, 'error': message}, status=status)
        for k, v in SECURITY_HEADERS.items():
            resp.headers[k] = v
        if headers:
            for k, v in headers.items():
                resp.headers[k] = str(v)
        return resp

    def _is_authenticated(self):
        return bool(request.session.uid) and not request.env.user._is_public()

    def _payload(self):
        raw_len = request.httprequest.content_length or 0
        if raw_len > MAX_JSON_BYTES:
            raise ValidationError("Requête trop volumineuse (limite de 64 Ko dépassée).")
        try:
            data = request.get_json_data()
            return data if isinstance(data, dict) else {}
        except ValueError:
            return {}

    def _currency(self):
        currency = request.env.company.currency_id
        return {
            'name': currency.name,
            'symbol': currency.symbol,
            'decimals': currency.decimal_places,
            'position': currency.position,
        }

    @staticmethod
    def _int(value, default):
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    def _guard(self, func, *args, **kwargs):
        """Exécute `func` dans un bloc sécurisé avec rollback SQL automatique en cas d'erreur."""
        if not self._is_authenticated():
            return self._error('Session expirée ou non authentifiée', 401)
        try:
            return func(*args, **kwargs)
        except AccessError:
            return self._error("Accès refusé : vous n'avez pas les droits nécessaires.", 403)
        except (UserError, ValidationError) as e:
            request.env.cr.rollback()
            return self._error(str(e), 422)
        except Exception:  # noqa: BLE001
            request.env.cr.rollback()
            _logger.exception('Erreur interne sur Luumo API')
            return self._error(
                "Une erreur interne est survenue sur le serveur. Veuillez réessayer.",
                500,
            )
