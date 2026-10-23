"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  SlidersHorizontal,
  Package,
  AlertTriangle,
  Boxes,
} from "lucide-react";
import {
  AppShell,
  ErrorBanner,
  KpiCard,
  Modal,
  StockBadge,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatGNF } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal ajustement stock
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [newQty, setNewQty] = useState("");

  // Modal création produit
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [initialQty, setInitialQty] = useState("");
  const [barcode, setBarcode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.products("");
      setProducts(res.data);
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
    return products.filter((p) => {
      if (lowOnly && (p.qty_available ?? 0) >= 5) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.default_code.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
      );
    });
  }, [products, lowOnly, search]);

  const stats = useMemo(() => {
    const stockValue = products.reduce(
      (sum, p) => sum + Math.max(0, p.qty_available ?? 0) * p.list_price,
      0
    );
    const lowCount = products.filter((p) => (p.qty_available ?? 0) < 5).length;
    return { total: products.length, stockValue, lowCount };
  }, [products]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;
    try {
      const updated = await api.setStock(adjustProduct.id, Number(newQty));
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setAdjustProduct(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de mise à jour du stock");
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const created = await api.createProduct({
        name: name.trim(),
        list_price: Number(listPrice) || 0,
        standard_price: Number(costPrice) || 0,
        initial_qty: Number(initialQty) || 0,
        barcode: barcode.trim() || undefined,
      });
      setProducts((prev) => [created, ...prev]);
      setShowCreate(false);
      setName("");
      setListPrice("");
      setCostPrice("");
      setInitialQty("");
      setBarcode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de création de l'article");
    }
  };

  return (
    <AppShell
      title="Stock & Catalogue Articles"
      subtitle="Inventaire physique, valorisation en GNF et réapprovisionnements rapides"
      actions={
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white font-heading font-semibold text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvel article</span>
        </button>
      }
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} onRetry={load} />}

        {/* KPIs Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Références actives"
            value={`${stats.total} articles`}
            sublabel="Catalogue disponible à la vente"
            icon={<Package className="w-5 h-5" />}
          />
          <KpiCard
            tone="ink"
            label="Valeur marchande du stock"
            value={formatGNF(stats.stockValue)}
            sublabel="Valorisé au prix de vente TTC"
            icon={<Boxes className="w-5 h-5" />}
          />
          <KpiCard
            tone={stats.lowCount > 0 ? "danger" : "default"}
            label="Articles en alerte (< 5)"
            value={`${stats.lowCount} référence(s)`}
            sublabel="Ruptures ou stock critique"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-[14px] border border-[#DCE5E1] p-4 card-shadow flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, code article ou code-barres..."
              aria-label="Rechercher un article"
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F7F9F8] border border-[#DCE5E1] text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setLowOnly((v) => !v)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
              lowOnly
                ? "bg-[#FFEDD5] border-[#C2410C] text-[#C2410C]"
                : "bg-white border-[#DCE5E1] text-[#0B2920] hover:bg-[#EEF3F1]"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Ruptures & Stock bas uniquement ({stats.lowCount})</span>
          </button>
        </div>

        {/* Table des articles */}
        <div className="bg-white rounded-[14px] border border-[#DCE5E1] card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DCE5E1] bg-[#F7F9F8] text-[11px] font-semibold uppercase tracking-wider text-[#526B63]">
                  <th className="py-3.5 px-4">Réf / Code-barres</th>
                  <th className="py-3.5 px-4">Désignation</th>
                  <th className="py-3.5 px-4">Catégorie</th>
                  <th className="py-3.5 px-4 text-right">Coût d&apos;achat</th>
                  <th className="py-3.5 px-4 text-right">Prix de vente</th>
                  <th className="py-3.5 px-4">Disponibilité</th>
                  <th className="py-3.5 px-4 text-right">Inventaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5E1] text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#526B63]">
                      Chargement du catalogue...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#526B63]">
                      Aucun article ne correspond à votre filtre.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-[#EEF3F1]/50">
                      <td className="py-3 px-4 font-mono text-xs text-[#526B63]">
                        <div>{p.default_code || "—"}</div>
                        <div className="text-[11px] opacity-75">{p.barcode}</div>
                      </td>
                      <td className="py-3 px-4 font-heading font-semibold text-[#0B2920]">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#526B63]">
                        {p.category} • {p.uom}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[#526B63]">
                        {formatGNF(p.standard_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-heading font-bold tabular-nums text-[#0B2920]">
                        {formatGNF(p.list_price)}
                      </td>
                      <td className="py-3 px-4">
                        <StockBadge qty={p.qty_available} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustProduct(p);
                            setNewQty(String(p.qty_available ?? 0));
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#EEF3F1] hover:bg-[#DCE5E1] text-xs font-semibold text-[#0B2920] cursor-pointer"
                        >
                          Ajuster stock
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

      {/* Modal Ajustement de stock */}
      <Modal
        open={Boolean(adjustProduct)}
        onClose={() => setAdjustProduct(null)}
        title="Ajustement d'inventaire physique"
      >
        {adjustProduct && (
          <form onSubmit={handleAdjustStock} className="space-y-4">
            <p className="text-sm text-[#526B63]">
              Article :{" "}
              <strong className="text-[#0B2920]">{adjustProduct.name}</strong>
            </p>
            <div>
              <label
                htmlFor="stock-qty-input"
                className="block text-xs font-semibold uppercase tracking-wider text-[#526B63] mb-1"
              >
                Nouvelle quantité en stock ({adjustProduct.uom})
              </label>
              <input
                id="stock-qty-input"
                type="number"
                min="0"
                step="1"
                required
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-base font-heading font-bold tabular-nums"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustProduct(null)}
                className="px-4 py-2 rounded-xl border border-[#DCE5E1] text-sm font-medium cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#115040] text-white font-heading font-semibold text-sm cursor-pointer"
              >
                Valider l&apos;inventaire
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Création Article */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Ajouter un nouvel article au catalogue"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label
              htmlFor="prod-name"
              className="block text-xs font-semibold uppercase tracking-wider text-[#526B63] mb-1"
            >
              Désignation de l&apos;article
            </label>
            <input
              id="prod-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Farine de blé — sac 50 kg"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="prod-price"
                className="block text-xs font-semibold uppercase tracking-wider text-[#526B63] mb-1"
              >
                Prix de vente (GNF)
              </label>
              <input
                id="prod-price"
                type="number"
                required
                min="0"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                placeholder="420000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="prod-cost"
                className="block text-xs font-semibold uppercase tracking-wider text-[#526B63] mb-1"
              >
                Coût d&apos;achat (GNF)
              </label>
              <input
                id="prod-cost"
                type="number"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="375000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm tabular-nums"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="prod-qty"
                className="block text-xs font-semibold uppercase tracking-wider text-[#526B63] mb-1"
              >
                Stock initial
              </label>
              <input
                id="prod-qty"
                type="number"
                min="0"
                value={initialQty}
                onChange={(e) => setInitialQty(e.target.value)}
                placeholder="25"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="prod-barcode"
                className="block text-xs font-semibold uppercase tracking-wider text-[#526B63] mb-1"
              >
                Code-barres (optionnel)
              </label>
              <input
                id="prod-barcode"
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="620000..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl border border-[#DCE5E1] text-sm font-medium cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#115040] text-white font-heading font-semibold text-sm cursor-pointer"
            >
              Créer l&apos;article
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
