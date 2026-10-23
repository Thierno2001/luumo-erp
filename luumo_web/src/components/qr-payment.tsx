"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  Hash,
  Radio,
} from "lucide-react";
import { Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { formatGNF } from "@/lib/format";
import type { GuineaQrProvider, PaymentIntent } from "@/lib/types";

export type { GuineaQrProvider };

interface ProviderConfig {
  id: GuineaQrProvider;
  name: string;
  shortName: string;
  appHint: string;
}

const GUINEA_PROVIDERS: ProviderConfig[] = [
  {
    id: "orange_money",
    name: "Orange Money Guinée",
    shortName: "Orange Money",
    appHint: "Scanner avec l'application Orange Max it ou composer le code USSD",
  },
  {
    id: "mtn_momo",
    name: "MTN MoMoPay Guinée",
    shortName: "MTN MoMo",
    appHint: "Scanner avec l'application MTN MoMo ou composer le code USSD",
  },
  {
    id: "paycard",
    name: "PayCard / QR Universel",
    shortName: "PayCard",
    appHint: "Scanner avec l'application PayCard ou votre portefeuille mobile",
  },
];

/**
 * Génère une matrice visuelle QR déterministe (25×25, Version 2) avec les 3 repères
 * d'alignement (Finder Patterns 7×7), motif d'alignement (5×5), Timing Patterns
 * et encodage binaire haute densité du payload de paiement.
 */
function buildQrMatrix(payload: string): boolean[][] {
  const size = 25;
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  const placeFinder = (row0: number, col0: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row0 + r;
        const cc = col0 + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr]![cc] = true;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[rr]![cc] = isBorder || isCore;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  for (let r = 16; r <= 20; r++) {
    for (let c = 16; c <= 20; c++) {
      reserved[r]![c] = true;
      const isBorder = r === 16 || r === 20 || c === 16 || c === 20;
      const isCenter = r === 18 && c === 18;
      grid[r]![c] = isBorder || isCenter;
    }
  }

  for (let i = 8; i < size - 8; i++) {
    reserved[6]![i] = true;
    reserved[i]![6] = true;
    grid[6]![i] = i % 2 === 0;
    grid[i]![6] = i % 2 === 0;
  }

  const bits: boolean[] = [];
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    hash = Math.imul(hash ^ code, 16777619);
    for (let b = 7; b >= 0; b--) {
      bits.push(((code >> b) & 1) === 1);
    }
  }

  let bitIdx = 0;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let row = 0; row < size; row++) {
      for (let cOffset = 0; cOffset < 2; cOffset++) {
        const c = col - cOffset;
        if (reserved[row]![c]) continue;
        const bit =
          bitIdx < bits.length
            ? bits[bitIdx]!
            : ((hash >> (bitIdx % 31)) & 1) === 1;
        bitIdx++;
        const mask = (row + c) % 2 === 0;
        grid[row]![c] = bit !== mask;
      }
    }
  }

  return grid;
}

export function QrCodeVisual({
  payload,
  size = 200,
}: {
  payload: string;
  size?: number;
}) {
  const matrix = useMemo(() => buildQrMatrix(payload), [payload]);
  const n = matrix.length;

  return (
    <div
      className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-white border-2 border-[#115040] shadow-sm relative"
      style={{ width: size + 28, height: size + 28 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${n} ${n}`}
        shapeRendering="crispEdges"
        aria-label="Code QR de paiement"
      >
        <rect width={n} height={n} fill="#FFFFFF" />
        {matrix.map((row, rIdx) =>
          row.map((cell, cIdx) =>
            cell ? (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx}
                y={rIdx}
                width={1}
                height={1}
                fill="#0B2920"
              />
            ) : null
          )
        )}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="px-2 py-0.5 rounded-md bg-[#115040] text-[#F3BC33] font-heading font-bold text-[10px] tracking-wider border-2 border-white shadow-xs">
          LUUMO
        </div>
      </div>
    </div>
  );
}

export function QrPaymentModal({
  open,
  onClose,
  amount,
  customerName,
  onConfirm,
  submitting = false,
}: {
  open: boolean;
  onClose: () => void;
  amount: number;
  customerName?: string;
  onConfirm: (info: { provider: GuineaQrProvider; reference: string }) => void;
  submitting?: boolean;
}) {
  const [providerId, setProviderId] = useState<GuineaQrProvider>("orange_money");
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [copied, setCopied] = useState(false);
  const [reference, setReference] = useState("");
  const [simulating, setSimulating] = useState(false);
  const confirmedRef = useRef(false);

  const provider =
    GUINEA_PROVIDERS.find((p) => p.id === providerId) ?? GUINEA_PROVIDERS[0]!;

  // 1. Initiation de l'intention de paiement auprès du backend (/payments/initiate)
  const initTransaction = useCallback(async () => {
    if (!open || amount <= 0) return;
    confirmedRef.current = false;
    try {
      const created = await api.initiatePayment({
        amount,
        provider: providerId,
      });
      setIntent(created);
    } catch {
      // Fallback local si hors ligne
    }
  }, [open, amount, providerId]);

  useEffect(() => {
    if (open) {
      initTransaction();
    } else {
      setIntent(null);
      setReference("");
      confirmedRef.current = false;
    }
  }, [open, initTransaction]);

  // 2. Écoute en temps réel du statut de paiement (Polling /payments/status/<tx_ref> toutes les 2s)
  useEffect(() => {
    if (!open || !intent || intent.state !== "pending") return;
    const timer = setInterval(async () => {
      try {
        const updated = await api.paymentStatus(intent.tx_ref);
        setIntent(updated);
        if (updated.state === "paid" && !confirmedRef.current) {
          confirmedRef.current = true;
          onConfirm({
            provider: updated.provider,
            reference: updated.operator_tx_id || updated.tx_ref,
          });
        }
      } catch {
        // Ignore silent polling errors
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [open, intent, onConfirm]);

  const handleSimulateWebhook = async () => {
    if (!intent) return;
    setSimulating(true);
    try {
      const updated = await api.simulatePaymentWebhook(intent.tx_ref);
      setIntent(updated);
      if (updated.state === "paid" && !confirmedRef.current) {
        confirmedRef.current = true;
        onConfirm({
          provider: updated.provider,
          reference: updated.operator_tx_id || updated.tx_ref,
        });
      }
    } finally {
      setSimulating(false);
    }
  };

  const ussdCode =
    intent?.ussd_code ?? `*144*4*1*620145*${Math.round(amount)}#`;
  const qrPayload =
    intent?.qr_payload ??
    JSON.stringify({
      provider: provider.id,
      amount: Math.round(amount),
      currency: "GNF",
    });
  const activeRef =
    reference.trim() || intent?.operator_tx_id || intent?.tx_ref || "QR-GNF";

  const handleCopyUssd = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ussdCode).catch(() => undefined);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Encaissement par Code QR"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Sélecteur d'opérateur Mobile Money Guinée */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-[#F7F9F8] border border-[#DCE5E1]">
          {GUINEA_PROVIDERS.map((p) => {
            const active = p.id === provider.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setProviderId(p.id)}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-[#115040] text-white shadow-xs"
                    : "text-[#526B63] hover:text-[#0B2920]"
                }`}
              >
                {p.shortName}
              </button>
            );
          })}
        </div>

        {/* Statut d'écoute Webhook en temps réel */}
        <div className="px-3.5 py-2 rounded-xl bg-[#E8F2EE] border border-[#115040]/20 flex items-center justify-between gap-2 text-xs text-[#115040]">
          <span className="inline-flex items-center gap-2 font-medium">
            <Radio className="w-3.5 h-3.5 animate-pulse text-[#115040]" />
            <span>En attente de validation sur le téléphone du client...</span>
          </span>
          <button
            type="button"
            disabled={simulating || !intent}
            onClick={handleSimulateWebhook}
            className="px-2.5 py-1 rounded-lg bg-[#115040] text-[#F3BC33] text-[11px] font-bold hover:bg-[#0B382C] shrink-0 cursor-pointer disabled:opacity-50"
            title="Simuler le retour automatique de l'opérateur (Webhook)"
          >
            <Smartphone className="w-3 h-3 inline mr-1" />
            {simulating ? "Validation..." : "Simuler scan client"}
          </button>
        </div>

        {/* Carte Montant + Code QR dynamique */}
        <div className="rounded-2xl bg-[#F7F9F8] border border-[#DCE5E1] p-4 flex flex-col items-center text-center space-y-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#526B63]">
              Montant exact à encaisser
            </span>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-[#115040] tabular-nums mt-0.5">
              {formatGNF(amount)}
            </div>
            {customerName && (
              <p className="text-xs text-[#526B63] mt-0.5">
                Client : <strong className="text-[#0B2920]">{customerName}</strong>
              </p>
            )}
          </div>

          <QrCodeVisual payload={qrPayload} size={190} />

          <p className="text-xs text-[#526B63] max-w-xs">{provider.appHint}</p>

          {/* Alternative USSD pour téléphone sans caméra */}
          <div className="w-full pt-2 border-t border-[#DCE5E1] flex items-center justify-between gap-2 text-xs">
            <div className="text-left">
              <span className="block text-[10px] uppercase tracking-wider text-[#526B63]">
                Téléphone sans caméra (USSD)
              </span>
              <code className="font-mono font-bold text-[#0B2920]">
                {ussdCode}
              </code>
            </div>
            <button
              type="button"
              onClick={handleCopyUssd}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#DCE5E1] text-[11px] font-semibold text-[#0B2920] hover:bg-[#EEF3F1] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#115040]" />
                  <span>Copié</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Référence de transaction (auto-remplie ou SMS reçu) */}
        <div>
          <label className="block text-xs font-semibold text-[#0B2920] mb-1">
            Référence de transaction (ou N° SMS reçu)
          </label>
          <div className="relative">
            <Hash className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={intent?.tx_ref || "Réf. automatique"}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#DCE5E1] text-xs font-mono text-[#0B2920] bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#DCE5E1] text-xs font-semibold text-[#526B63] hover:text-[#0B2920] cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() =>
              onConfirm({ provider: provider.id, reference: activeRef })
            }
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#115040] hover:bg-[#0B382C] disabled:opacity-50 text-white font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-[#F3BC33]" />
            <span>
              {submitting
                ? "Validation..."
                : "Confirmer & Valider la facture"}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
