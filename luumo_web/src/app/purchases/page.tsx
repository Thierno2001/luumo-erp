"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AppShell,
  ErrorBanner,
  KpiCard,
  Modal,
  SmartButton,
  StatusBadge,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatDateTime, formatGNF } from "@/lib/format";
import type { Product, PurchaseOrder } from "@/lib/types";
import {
  Ship,
  PackageCheck,
  Clock,
  Plus,
  Package,
  CheckCircle2,
  ArrowDownToLine,
  Building2,
} from "lucide-react";

const GUINEA_SUPPLIERS = [
  "Importateur Riz & Denrées — Port Autonome de Conakry",
  "Ciments de Guinée (CIMGUINÉE) — Kagbelen",
  "Grossiste Huile & Sucre — Marché Madina",
  "SOGUIPAH & Savonnerie Industrielle",
  "Distributeur Boissons & Agroalimentaire — Sonfonia",
];

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receivingId, setReceivingId] = useState<number | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Modal Nouvelle Commande Fournisseur
  const [createOpen, setCreateOpen] = useState(false);
  const [supplierName, setSupplierName] = useState(GUINEA_SUPPLIERS[0]);
  const [selectedProductId, setSelectedProductId] = useState<number>(101);
  const [qty, setQty] = useState<string>("50");
  const [priceUnit, setPriceUnit] = useState<string>("395000");
  const [receiveNow, setReceiveNow] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [poRes, prodRes] = await Promise.all([
        api.purchases(),
        api.products(),
      ]);
      setPurchases(poRes.data);
      setProducts(prodRes.data);
      if (prodRes.data.length > 0) {
        setSelectedProductId((prev) =>
          prodRes.data.some((p) => p.id === prev) ? prev : prodRes.data[0].id
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les commandes fournisseurs."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProductSelect = (productId: number) => {
    setSelectedProductId(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setPriceUnit(String(prod.standard_price || Math.round(prod.list_price * 0.85)));
    }
  };

  const handleReceive = async (po: PurchaseOrder) => {
    setReceivingId(po.id);
    setError(null);
    try {
      await api.receivePurchase(po.id);
      setBannerMessage(
        `Arrivage ${po.name} réceptionné au dépôt ! Les quantités ont été automatiquement ajoutées dans l'Inventaire (stock.quant).`
      );
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la réception en stock."
      );
    } finally {
      setReceivingId(null);
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericQty = Number(qty);
    const numericPrice = Number(priceUnit);
    if (!supplierName.trim() || numericQty <= 0 || numericPrice < 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createPurchase({
        supplier_name: supplierName.trim(),
        product_id: selectedProductId,
        qty: numericQty,
        price_unit: numericPrice,
        receive_now: receiveNow,
      });
      setCreateOpen(false);
      setBannerMessage(
        receiveNow
          ? `Bon d'achat ${created.name} validé et réceptionné au dépôt (+${numericQty} unités ajoutées au stock).`
          : `Bon de commande fournisseur ${created.name} enregistré (en attente d'arrivage au dépôt).`
      );
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer la commande fournisseur."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalPurchasesAmount = purchases.reduce((s, p) => s + p.amount_total, 0);
  const pendingCount = purchases.filter((p) => !p.received).length;
  const receivedCount = purchases.filter((p) => p.received).length;

  return (
    <AppShell
      title="Achats & Importations"
      subtitle="Commandes fournisseurs (Port de Conakry, usines locales, grossistes) et réception directe dans l'Inventaire."
      actions={
        <div className="flex items-center gap-2.5 flex-wrap">
          <SmartButton
            href="/products"
            label="Articles en Dépôt"
            value={`${products.length} réf.`}
            icon={<Package className="w-4 h-4" />}
          />
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#F3BC33]" />
            <span>Nouvelle commande fournisseur</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} onRetry={loadData} />}

        {bannerMessage && (
          <div className="rounded-2xl bg-[#E8F2EE] border border-[#115040]/30 p-4 flex items-center justify-between gap-4 text-[#115040]">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-[#115040]" />
              <span className="text-sm font-medium">{bannerMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-xs font-bold underline cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* KPIs Achats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            tone="ink"
            label="Volume d'achats & import"
            value={formatGNF(totalPurchasesAmount)}
            sublabel={`${purchases.length} bons de commande fournisseurs`}
            icon={<Ship className="w-5 h-5" />}
          />
          <KpiCard
            tone={pendingCount > 0 ? "gold" : "default"}
            label="Arrivages à réceptionner"
            value={`${pendingCount} commande(s)`}
            sublabel="En transit vers le dépôt (1 clic pour entrer en stock)"
            icon={<Clock className="w-5 h-5" />}
          />
          <KpiCard
            tone="default"
            label="Réceptions dépôt validées"
            value={`${receivedCount} arrivage(s)`}
            sublabel="Stock incrémenté automatiquement dans stock.quant"
            icon={<PackageCheck className="w-5 h-5" />}
          />
        </div>

        {/* Liste des Commandes Fournisseurs */}
        <div className="rounded-[18px] bg-white border border-[#DCE5E1] card-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-[#DCE5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-heading text-base font-bold text-[#0B2920]">
                Bons de commande fournisseurs &amp; Arrivages
              </h2>
              <p className="text-xs text-[#526B63]">
                La validation d&apos;un arrivage met automatiquement à jour votre stock disponible en caisse.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-[#526B63]">
              Chargement des commandes fournisseurs...
            </div>
          ) : purchases.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#526B63]">
              Aucune commande fournisseur enregistrée.
            </div>
          ) : (
            <div className="divide-y divide-[#EEF3F1]">
              {purchases.map((po) => (
                <div
                  key={po.id}
                  className="p-5 hover:bg-[#F7F9F8]/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-heading text-sm font-bold text-[#115040] px-2.5 py-0.5 rounded-lg bg-[#E8F2EE]">
                        {po.name}
                      </span>
                      <span className="font-semibold text-sm text-[#0B2920] flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-[#526B63]" />
                        {po.partner.name}
                      </span>
                      {po.received ? (
                        <StatusBadge
                          variant="success"
                          label="Entré au dépôt (+Stock)"
                        />
                      ) : (
                        <StatusBadge
                          variant="warning"
                          label="En transit / À réceptionner"
                        />
                      )}
                      <span className="text-xs text-[#526B63]">
                        {formatDateTime(po.date)}
                      </span>
                    </div>

                    {/* Lignes d'articles */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {po.lines.map((line, idx) => (
                        <span
                          key={`${po.id}-${line.product_id}-${idx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F7F9F8] border border-[#DCE5E1] text-xs text-[#0B2920]"
                        >
                          <strong className="font-semibold text-[#115040]">
                            +{line.qty}
                          </strong>
                          <span>{line.name}</span>
                          <span className="text-[#526B63]">
                            ({formatGNF(line.price_unit)}/u)
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#EEF3F1]">
                    <div className="text-right">
                      <span className="block text-[11px] uppercase tracking-wider text-[#526B63]">
                        Total Achat
                      </span>
                      <span className="font-heading text-lg font-bold text-[#0B2920] tabular-nums">
                        {formatGNF(po.amount_total)}
                      </span>
                    </div>

                    {!po.received && (
                      <button
                        type="button"
                        disabled={receivingId === po.id}
                        onClick={() => handleReceive(po)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F3BC33] hover:bg-[#E8A02B] text-[#0B2920] text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <ArrowDownToLine className="w-4 h-4" />
                        <span>
                          {receivingId === po.id
                            ? "Réception..."
                            : "Réceptionner au dépôt (+Stock)"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nouvelle Commande Fournisseur */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvelle commande d'achat / réapprovisionnement"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
              Fournisseur / Importateur (Guinée)
            </label>
            <input
              type="text"
              list="guinea-suppliers"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] focus:outline-none focus:ring-2 focus:ring-[#115040]"
              placeholder="Ex. Importateur Riz — Port de Conakry"
            />
            <datalist id="guinea-suppliers">
              {GUINEA_SUPPLIERS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
              Article à réapprovisionner (`product.product`)
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductSelect(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock actuel : {p.qty_available ?? 0} {p.uom})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Quantité commandée
              </label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#115040]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Coût d&apos;achat unitaire (GNF)
              </label>
              <input
                type="number"
                min={0}
                step={500}
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#115040]"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#E8F2EE]/70 border border-[#115040]/20 cursor-pointer">
            <input
              type="checkbox"
              checked={receiveNow}
              onChange={(e) => setReceiveNow(e.target.checked)}
              className="mt-1 accent-[#115040]"
            />
            <div className="text-xs">
              <strong className="block font-semibold text-[#0B2920]">
                Réceptionner immédiatement au dépôt (`stock.picking`)
              </strong>
              <span className="text-[#526B63]">
                Incrémente tout de suite le stock disponible pour la Caisse Comptoir et met à jour le coût d&apos;achat unitaire.
              </span>
            </div>
          </label>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#DCE5E1] text-xs font-semibold text-[#526B63] hover:text-[#0B2920] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {submitting
                ? "Enregistrement..."
                : `Valider (${formatGNF(Number(qty || 0) * Number(priceUnit || 0))})`}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
