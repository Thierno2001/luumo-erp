"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Calendar,
  Wallet,
  AlertTriangle,
  ShoppingBag,
  ArrowUpRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  AppShell,
  ErrorBanner,
  KpiCard,
  PaymentStateBadge,
  StockBadge,
} from "@/components/ui";
import { api } from "@/lib/api";
import {
  formatCompact,
  formatDateTime,
  formatGNF,
  formatWeekday,
} from "@/lib/format";
import type { Dashboard } from "@/lib/types";

export default function DashboardAppPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.dashboard();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sym = data?.currency.symbol ?? "GNF";
  const maxDay = Math.max(1, ...(data?.sales_7d.map((d) => d.total) ?? [1]));

  return (
    <AppShell
      title="Tableaux de bord"
      subtitle="Indicateurs clés en temps réel : chiffre d'affaires, créances et alertes de stock"
      actions={
        <>
          <button
            type="button"
            onClick={load}
            title="Actualiser"
            aria-label="Actualiser les données"
            className="p-2.5 rounded-xl bg-white border border-[#DCE5E1] text-[#526B63] hover:text-[#0B2920] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/pos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl luumo-gold-gradient hover:opacity-95 text-[#0B2920] font-heading font-bold text-sm cursor-pointer shadow-xs"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Ouvrir le Point de Vente</span>
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} onRetry={load} />}

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            tone="ink"
            label="Ventes du jour"
            value={data ? formatGNF(data.kpis.sales_today, sym) : "—"}
            sublabel={
              data
                ? `${data.kpis.orders_today} commande(s) validée(s) aujourd'hui`
                : "Chargement..."
            }
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <KpiCard
            label="Chiffre du mois"
            value={data ? formatGNF(data.kpis.sales_month, sym) : "—"}
            sublabel={
              data ? `${data.kpis.orders_month} vente(s) sur le mois en cours` : "Chargement..."
            }
            icon={<Calendar className="w-5 h-5" />}
          />
          <KpiCard
            tone="danger"
            label="Encours Clients (Crédits)"
            value={data ? formatGNF(data.kpis.receivables, sym) : "—"}
            sublabel={
              data ? `${data.kpis.debtors} client(s) avec solde ouvert` : "Chargement..."
            }
            icon={<Wallet className="w-5 h-5" />}
          />
          <KpiCard
            tone="gold"
            label="Ruptures & Stock bas"
            value={data ? `${data.kpis.low_stock_count} article(s)` : "—"}
            sublabel="Seuil d'alerte : moins de 5 unités"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
        </div>

        {/* Milieu : Courbe 7 jours + Top Débiteurs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#DCE5E1] card-shadow p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-heading text-lg font-bold text-[#0B2920]">
                  Évolution des ventes (7 derniers jours)
                </h2>
                <p className="text-xs text-[#526B63]">
                  Montants journaliers confirmés en {sym}
                </p>
              </div>
              <Link
                href="/orders"
                className="text-xs font-semibold text-[#115040] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Voir les ventes</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-52 pt-6 border-b border-[#DCE5E1] pb-3">
              {(data?.sales_7d ?? []).map((item, idx, arr) => {
                const pct = Math.max(6, Math.round((item.total / maxDay) * 100));
                const isToday = idx === arr.length - 1;
                return (
                  <div
                    key={item.date}
                    className="flex flex-col items-center justify-end h-full group"
                  >
                    <span className="text-[11px] font-semibold tabular-nums text-[#526B63] mb-1.5">
                      {item.total > 0 ? formatCompact(item.total) : "0"}
                    </span>
                    <div className="w-full max-w-[44px] bg-[#EEF3F1] rounded-t-lg h-36 flex items-end overflow-hidden">
                      <div
                        style={{ height: `${pct}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          isToday
                            ? "luumo-gold-gradient"
                            : "bg-[#115040] group-hover:bg-[#0B382C]"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs mt-2 capitalize ${
                        isToday ? "font-bold text-[#0B2920]" : "text-[#526B63]"
                      }`}
                    >
                      {isToday ? "Auj." : formatWeekday(item.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-[16px] border border-[#DCE5E1] card-shadow p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-heading text-lg font-bold text-[#0B2920]">
                    Soldes clients à encaisser
                  </h2>
                  <p className="text-xs text-[#526B63]">Principaux comptes à crédit</p>
                </div>
                <Link
                  href="/customers"
                  className="text-xs font-semibold text-[#115040] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Tous</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-[#DCE5E1]">
                {(data?.top_debtors ?? []).length === 0 ? (
                  <p className="text-sm text-[#526B63] py-8 text-center">
                    Aucune créance client en attente.
                  </p>
                ) : (
                  data?.top_debtors.map((c) => (
                    <div
                      key={c.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0B2920] truncate">
                          {c.name}
                        </p>
                        <p className="text-xs text-[#526B63] truncate">
                          {c.phone || c.city || "Conakry"}
                        </p>
                      </div>
                      <span className="font-heading text-sm font-bold tabular-nums text-[#C2410C] shrink-0">
                        {formatGNF(c.credit, sym)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Link
              href="/customers"
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-[#E8F2EE] hover:bg-[#DCE5E1] text-[#115040] font-heading font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Encaisser un règlement client</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Bas : Alertes stock + Dernières ventes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-[16px] border border-[#DCE5E1] card-shadow p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-[#0B2920]">
                  Articles à réapprovisionner
                </h2>
                <p className="text-xs text-[#526B63]">Quantité inférieure à 5 unités</p>
              </div>
              <Link
                href="/products"
                className="text-xs font-semibold text-[#115040] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Gérer</span>
                <Plus className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#DCE5E1]">
              {(data?.low_stock ?? []).length === 0 ? (
                <p className="text-sm text-[#526B63] py-8 text-center">
                  Tous les articles ont un stock suffisant.
                </p>
              ) : (
                data?.low_stock.map((p) => (
                  <div
                    key={p.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0B2920] truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-[#526B63] tabular-nums">
                        {formatGNF(p.list_price, sym)} / {p.uom}
                      </p>
                    </div>
                    <StockBadge qty={p.qty_available} />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#DCE5E1] card-shadow overflow-hidden">
            <div className="p-6 pb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-[#0B2920]">
                  Dernières ventes confirmées
                </h2>
                <p className="text-xs text-[#526B63]">
                  Opérations comptoir et commandes clients récentes
                </p>
              </div>
              <Link
                href="/orders"
                className="text-xs font-semibold text-[#115040] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Toutes les ventes</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-[#DCE5E1] bg-[#F7F9F8] text-[11px] font-semibold uppercase tracking-wider text-[#526B63]">
                    <th className="py-3 px-4">N° Bon</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Montant Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE5E1] text-sm">
                  {(data?.recent_orders ?? []).map((o) => (
                    <tr key={o.id} className="hover:bg-[#EEF3F1]/60 transition-colors">
                      <td className="py-3 px-4 font-heading font-semibold text-[#0B2920]">
                        {o.name}
                      </td>
                      <td className="py-3 px-4 text-[#0B2920]">{o.partner.name}</td>
                      <td className="py-3 px-4 text-xs text-[#526B63] whitespace-nowrap">
                        {formatDateTime(o.date)}
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStateBadge state={o.payment_state} />
                      </td>
                      <td className="py-3 px-4 text-right font-heading font-bold tabular-nums text-[#0B2920] whitespace-nowrap">
                        {formatGNF(o.amount_total, sym)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
