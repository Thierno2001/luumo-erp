"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag, Eye } from "lucide-react";
import {
  AppShell,
  ErrorBanner,
  Modal,
  PaymentStateBadge,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatDateTime, formatGNF } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.orders();
      setOrders(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.partner.name.toLowerCase().includes(q)
    );
  }, [orders, search]);

  return (
    <AppShell
      title="Ventes & Factures"
      subtitle="Historique complet des bons de commande, sorties de stock et états de règlement"
      actions={
        <Link
          href="/pos"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F3BC33] hover:bg-[#E8A02B] text-[#115040] font-heading font-bold text-sm cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Nouvelle vente</span>
        </Link>
      }
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} onRetry={load} />}

        <div className="bg-white rounded-[14px] border border-[#DCE5E1] p-4 card-shadow">
          <div className="relative">
            <Search className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par numéro de bon (ex: S00255) ou par nom de client..."
              aria-label="Rechercher une vente"
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F7F9F8] border border-[#DCE5E1] text-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-[14px] border border-[#DCE5E1] card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DCE5E1] bg-[#F7F9F8] text-[11px] font-semibold uppercase tracking-wider text-[#526B63]">
                  <th className="py-3.5 px-4">N° Bon</th>
                  <th className="py-3.5 px-4">Date & Heure</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Articles</th>
                  <th className="py-3.5 px-4">Règlement</th>
                  <th className="py-3.5 px-4 text-right">Montant TTC</th>
                  <th className="py-3.5 px-4 text-right">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5E1] text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#526B63]">
                      Chargement des ventes...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#526B63]">
                      Aucune vente trouvée.
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => (
                    <tr key={o.id} className="hover:bg-[#EEF3F1]/50">
                      <td className="py-3 px-4 font-heading font-bold text-[#0B2920]">
                        {o.name}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#526B63] whitespace-nowrap">
                        {formatDateTime(o.date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#0B2920]">
                        {o.partner.name}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#526B63]">
                        {o.lines.length} ligne(s)
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStateBadge state={o.payment_state} />
                      </td>
                      <td className="py-3 px-4 text-right font-heading font-bold tabular-nums text-[#0B2920]">
                        {formatGNF(o.amount_total)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(o)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EEF3F1] hover:bg-[#DCE5E1] text-xs font-semibold text-[#0B2920] cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Voir</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Bon de vente ${selectedOrder.name}` : "Détail"}
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#526B63]">
              <span>Client : {selectedOrder.partner.name}</span>
              <span>{formatDateTime(selectedOrder.date)}</span>
            </div>
            <div className="divide-y divide-[#DCE5E1] border-y border-[#DCE5E1] text-sm">
              {selectedOrder.lines.map((l, idx) => (
                <div key={idx} className="py-2.5 flex justify-between gap-4">
                  <div>
                    <div className="font-medium text-[#0B2920]">{l.name}</div>
                    <div className="text-xs text-[#526B63] tabular-nums">
                      {l.qty} × {formatGNF(l.price_unit)}
                    </div>
                  </div>
                  <div className="font-heading font-semibold tabular-nums">
                    {formatGNF(l.subtotal)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              <PaymentStateBadge state={selectedOrder.payment_state} />
              <div className="font-heading text-xl font-bold tabular-nums text-[#115040]">
                {formatGNF(selectedOrder.amount_total)}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
