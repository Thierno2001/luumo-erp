# -*- coding: utf-8 -*-
"""
Contrôleur Passerelle Mobile Money B2B & QR Code Dynamique
(`/payments/initiate`, `/payments/status/<tx_ref>`, `/payments/webhook`, `/payments/simulate-webhook/<tx_ref>`)

Persiste chaque intention de paiement dans le modèle PostgreSQL
`luumo.payment.transaction` (avec repli mémoire si la table n'est pas encore migrée),
ce qui rend le backend stateless et compatible multi-workers.
"""
import json
import logging
import secrets
import threading
import time
import urllib.error
import urllib.request
from datetime import timedelta

from odoo import SUPERUSER_ID, fields
from odoo.exceptions import ValidationError
from odoo.http import request

from ..services.http_core import API_PREFIX, MAX_JSON_BYTES, LuumoBaseController, luumo_route
from ..services.security_owasp import (
    clean_text,
    get_gateway_config,
    validate_phone,
    verify_hmac_signature,
)

_logger = logging.getLogger(__name__)

# Repli en mémoire uniquement si la table SQL n'est pas encore initialisée
_FALLBACK_LOCK = threading.Lock()
_FALLBACK_INTENTS = {}


class LuumoPaymentsController(LuumoBaseController):

    def _has_tx_model(self):
        return 'luumo.payment.transaction' in request.env

    @luumo_route('/payments/initiate', ['POST'])
    def initiate_payment(self):
        def _do():
            p = self._payload()
            amount = round(float(p.get('amount') or 0))
            if amount <= 0:
                raise ValidationError("Le montant à encaisser doit être supérieur à 0 GNF.")

            provider = clean_text(
                p.get('provider') or 'orange_money', 'Opérateur', max_len=32, required=True,
            ).lower()
            if provider not in ('orange_money', 'mtn_momo', 'paycard'):
                raise ValidationError("Opérateur Mobile Money non supporté.")

            customer_phone = validate_phone(p.get('customer_phone'), required=False)
            cfg = get_gateway_config(request.env.company)
            merchant_code = cfg['merchant_id']

            stamp = fields.Date.today().strftime('%Y%m%d')
            rand_hex = secrets.token_hex(3).upper()
            tx_ref = f'LUUMO-QR-{stamp}-{rand_hex}'

            if provider == 'orange_money':
                ussd_code = f'*144*4*1*{merchant_code}*{amount}#'
            elif provider == 'mtn_momo':
                ussd_code = f'*440*1*{merchant_code}*{amount}#'
            else:
                ussd_code = f'PAYCARD:{merchant_code}:{amount}'

            qr_payload = json.dumps({
                'type': 'LUUMO_MERCHANT_QR',
                'provider': provider,
                'merchant': merchant_code,
                'amount': amount,
                'currency': 'GNF',
                'tx_ref': tx_ref,
            })

            gateway_mode = 'local_qr'
            if cfg['api_url'] and cfg['api_secret']:
                try:
                    notif_url = (
                        f"{cfg['public_base_url'].rstrip('/')}{API_PREFIX}/payments/webhook"
                        if cfg['public_base_url'] else ''
                    )
                    req_body = json.dumps({
                        'merchant_id': merchant_code,
                        'order_id': tx_ref,
                        'amount': amount,
                        'currency': 'GNF',
                        'provider': provider,
                        'customer_phone': customer_phone,
                        'notif_url': notif_url,
                    }).encode('utf-8')
                    req = urllib.request.Request(
                        cfg['api_url'],
                        data=req_body,
                        headers={
                            'Content-Type': 'application/json',
                            'Authorization': f"Bearer {cfg['api_secret']}",
                        },
                        method='POST',
                    )
                    with urllib.request.urlopen(req, timeout=8) as resp:
                        ext_data = json.loads(resp.read().decode('utf-8'))
                        if ext_data.get('qr_data') or ext_data.get('payment_url'):
                            qr_payload = ext_data.get('qr_data') or ext_data.get('payment_url')
                            gateway_mode = 'live_api'
                except urllib.error.URLError as err:
                    _logger.warning('Passerelle Mobile Money externe injoignable (%s), repli QR local', err)

            if self._has_tx_model():
                tx = request.env['luumo.payment.transaction'].create({
                    'tx_ref': tx_ref,
                    'company_id': request.env.company.id,
                    'provider': provider,
                    'merchant_code': merchant_code,
                    'amount': amount,
                    'currency_code': 'GNF',
                    'customer_phone': customer_phone or False,
                    'qr_payload': qr_payload,
                    'ussd_code': ussd_code,
                    'state': 'pending',
                    'gateway_mode': gateway_mode,
                    'expires_at': fields.Datetime.now() + timedelta(minutes=10),
                })
                return self._ok(tx.to_api_dict(), status=201)

            now_ts = int(time.time())
            intent = {
                'tx_ref': tx_ref,
                'provider': provider,
                'merchant_code': merchant_code,
                'amount': amount,
                'currency': 'GNF',
                'customer_phone': customer_phone,
                'qr_payload': qr_payload,
                'ussd_code': ussd_code,
                'state': 'pending',
                'gateway_mode': gateway_mode,
                'operator_tx_id': None,
                'created_at': now_ts,
                'expires_at': now_ts + 600,
                'confirmed_at': None,
            }
            with _FALLBACK_LOCK:
                _FALLBACK_INTENTS[tx_ref] = intent
            return self._ok(intent, status=201)
        return self._guard(_do)

    @luumo_route('/payments/status/<string:tx_ref>', ['GET'])
    def payment_status(self, tx_ref):
        def _do():
            clean_ref = clean_text(tx_ref, 'Référence transaction', max_len=64, required=True)
            if self._has_tx_model():
                tx = request.env['luumo.payment.transaction'].search([('tx_ref', '=', clean_ref)], limit=1)
                if not tx:
                    return self._error('Transaction introuvable ou expirée.', 404)
                return self._ok(tx.to_api_dict())

            with _FALLBACK_LOCK:
                intent = _FALLBACK_INTENTS.get(clean_ref)
                if not intent:
                    return self._error('Transaction introuvable ou expirée.', 404)
                if intent['state'] == 'pending' and time.time() > intent['expires_at']:
                    intent['state'] = 'expired'
                return self._ok(dict(intent))
        return self._guard(_do)

    @luumo_route('/payments/webhook', ['POST'], auth='none')
    def payment_webhook(self):
        """Point d'entrée Webhook B2B appelé par Orange Money / MTN MoMo / PayCard / Djomi.
        Vérifie la signature HMAC-SHA256 en temps constant (`hmac.compare_digest`).
        """
        raw_body = request.httprequest.get_data() or b''
        if len(raw_body) > MAX_JSON_BYTES:
            return self._error('Payload trop volumineux', 413)

        provided_sig = (
            request.httprequest.headers.get('X-Luumo-Signature')
            or request.httprequest.headers.get('X-Webhook-Signature')
            or ''
        )
        if not verify_hmac_signature(raw_body, provided_sig):
            _logger.warning('Webhook paiement rejeté : signature HMAC invalide depuis %s', self._client_ip())
            return self._error('Signature HMAC invalide', 401)

        try:
            data = json.loads(raw_body.decode('utf-8'))
        except ValueError:
            return self._error('JSON invalide', 400)

        tx_ref = (data.get('tx_ref') or data.get('order_id') or '').strip()
        status = (data.get('status') or '').upper()
        paid_amount = round(float(data.get('amount') or 0))
        operator_tx_id = (data.get('operator_tx_id') or data.get('txnid') or '').strip()

        if self._has_tx_model():
            su_env = request.env(user=SUPERUSER_ID)
            tx = su_env['luumo.payment.transaction'].search([('tx_ref', '=', tx_ref)], limit=1)
            if not tx:
                return self._error('Transaction inconnue', 404)
            if paid_amount and paid_amount < tx.amount:
                tx.write({'state': 'failed'})
                return self._error('Montant payé inférieur au montant attendu', 422)

            if status in ('SUCCESS', 'PAID', 'COMPLETED', 'OK'):
                op_id = tx.mark_as_paid(operator_tx_id=operator_tx_id)
            elif status in ('FAILED', 'CANCELLED', 'EXPIRED'):
                tx.write({'state': 'failed'})
                op_id = tx.operator_tx_id
            else:
                op_id = tx.operator_tx_id

            return self._ok({
                'tx_ref': tx.tx_ref,
                'state': tx.state,
                'operator_tx_id': op_id,
            })

        with _FALLBACK_LOCK:
            intent = _FALLBACK_INTENTS.get(tx_ref)
            if not intent:
                return self._error('Transaction inconnue', 404)
            if paid_amount and paid_amount < intent['amount']:
                intent['state'] = 'failed'
                return self._error('Montant payé inférieur au montant attendu', 422)

            if status in ('SUCCESS', 'PAID', 'COMPLETED', 'OK'):
                intent['state'] = 'paid'
                intent['operator_tx_id'] = operator_tx_id or f"OP-{secrets.token_hex(4).upper()}"
                intent['confirmed_at'] = int(time.time())
            elif status in ('FAILED', 'CANCELLED', 'EXPIRED'):
                intent['state'] = 'failed'

            return self._ok({
                'tx_ref': tx_ref,
                'state': intent['state'],
                'operator_tx_id': intent['operator_tx_id'],
            })

    @luumo_route('/payments/simulate-webhook/<string:tx_ref>', ['POST'])
    def simulate_payment_webhook(self, tx_ref):
        def _do():
            clean_ref = clean_text(tx_ref, 'Référence transaction', max_len=64, required=True)
            if self._has_tx_model():
                tx = request.env['luumo.payment.transaction'].search([('tx_ref', '=', clean_ref)], limit=1)
                if not tx:
                    return self._error('Transaction introuvable', 404)
                tx.mark_as_paid()
                return self._ok(tx.to_api_dict())

            with _FALLBACK_LOCK:
                intent = _FALLBACK_INTENTS.get(clean_ref)
                if not intent:
                    return self._error('Transaction introuvable', 404)
                op_prefix = (
                    'OM' if intent['provider'] == 'orange_money'
                    else 'MOMO' if intent['provider'] == 'mtn_momo'
                    else 'PYC'
                )
                intent['state'] = 'paid'
                intent['operator_tx_id'] = f"{op_prefix}{fields.Date.today().strftime('%y%m%d')}.{secrets.token_hex(3).upper()}"
                intent['confirmed_at'] = int(time.time())
                return self._ok(dict(intent))
        return self._guard(_do)
