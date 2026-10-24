"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  Banknote,
  Smartphone,
  Landmark,
  BookOpen,
  CheckCircle2,
  Printer,
  ShoppingBag,
  QrCode,
  WifiOff,
} from "lucide-react";
import { AppShell, ErrorBanner, Modal, StockBadge } from "@/components/ui";
import { QrCodeVisual, QrPaymentModal } from "@/components/qr-payment";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatGNF } from "@/lib/format";
import { offlineSyncManager, useOfflineSync } from "@/lib/offline-sync";
import type { Customer, Order, PaymentMethod, Product } from "@/lib/types";

type CartItem = {
  product: Product;
  qty: number;
  price_unit: number;
};

const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "cash", label: "Espèces", sub: "Caisse GNF", icon: Banknote },
  { id: "mobile_money", label: "Code QR / MoMo", sub: "Orange / MTN / PayCard", icon: QrCode },
  { id: "bank", label: "Banque", sub: "Virement / Chèque", icon: Landmark },
  { id: "credit", label: "À Crédit", sub: "Carnet de dette", icon: BookOpen },
];

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tous");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [lastQrRef, setLastQrRef] = useState<string | null>(null);

  // Création rapide client
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("+224 ");
  const [newCustCity, setNewCustCity] = useState("Conakry");

  // Sortie directe de caisse physique (décaissement immédiat)
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [cashOutReason, setCashOutReason] = useState("Gasoil Groupe Électrogène");
  const [cashOutAmount, setCashOutAmount] = useState("");
  const [cashOutBeneficiary, setCashOutBeneficiary] = useState("");
  const [submittingCashOut, setSubmittingCashOut] = useState(false);
  const [cashOutFeedback, setCashOutFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, custRes] = await Promise.all([
        api.products(""),
        api.customers(""),
      ]);
      setProducts(prodRes.data);
      setCustomers(custRes.data);
      offlineSyncManager.cacheCatalog(prodRes.data);
      offlineSyncManager.cacheCustomers(custRes.data);
    } catch (err) {
      // En cas de coupure réseau, on charge immédiatement le catalogue local en cache
      const cachedProds = offlineSyncManager.getCachedCatalog();
      const cachedCusts = offlineSyncManager.getCachedCustomers();
      if (cachedProds.length) {
        setProducts(cachedProds);
        setCustomers(cachedCusts);
        setError("Mode hors-ligne : catalogue local chargé depuis la mémoire de l'appareil.");
      } else {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categories = useMemo(() => {
    const set = new Set<string>(["Tous"]);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (category !== "Tous" && p.category !== category) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.default_code.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
      );
    });
  }, [products, category, search]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx]!, qty: next[idx]!.qty + 1 };
        return next;
      }
      return [...prev, { product, qty: 1, price_unit: product.list_price }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, qty: Math.max(0, item.qty + delta) }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const removeItem = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty * item.price_unit, 0),
    [cart]
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      const exactBarcode = products.find((p) => p.barcode === search.trim());
      if (exactBarcode) {
        addToCart(exactBarcode);
        setSearch("");
      }
    }
  };

  const executeOrderCreation = async (qrRef?: string) => {
    setError(null);
    setSubmitting(true);
    const selectedCustomer = customers.find((c) => c.id === partnerId);
    const partnerName = selectedCustomer ? selectedCustomer.name : "Client comptoir";

    // Mode Hors-ligne immédiat si aucune connexion détectée
    if (!offlineSyncManager.isOnline()) {
      const offlineOrder = offlineSyncManager.queueOfflineOrder({
        partner_id: partnerId,
        partner_name: partnerName,
        payment,
        lines: cart.map((item) => ({
          product_id: item.product.id,
          name: item.product.name,
          qty: item.qty,
          price_unit: item.price_unit,
        })),
      });

      const mockOrder: Order = {
        id: Math.floor(Math.random() * 1000) + 9000,
        name: offlineOrder.offline_uuid,
        date: offlineOrder.created_at,
        partner: { id: partnerId ?? 0, name: partnerName },
        state: "sale",
        amount_total: offlineOrder.amount_total,
        amount_untaxed: offlineOrder.amount_total,
        invoice_status: "invoiced",
        payment_state: payment === "credit" ? "not_paid" : "paid",
        lines: offlineOrder.lines,
      };

      setLastQrRef(qrRef ?? null);
      setQrModalOpen(false);
      setCompletedOrder(mockOrder);
      setCart([]);
      setPartnerId(null);
      setPayment("cash");
      setSubmitting(false);
      return;
    }

    try {
      const order = await api.createOrder({
        partner_id: partnerId,
        payment,
        deliver: true,
        lines: cart.map((item) => ({
          product_id: item.product.id,
          qty: item.qty,
          price_unit: item.price_unit,
        })),
      });
      setLastQrRef(qrRef ?? null);
      setQrModalOpen(false);
      setCompletedOrder(order);
      setCart([]);
      setPartnerId(null);
      setPayment("cash");
      await loadData();
    } catch (err) {
      const isNetworkError =
        !offlineSyncManager.isOnline() ||
        (err instanceof ApiError && (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504)) ||
        (err instanceof TypeError && err.message.toLowerCase().includes("fetch"));

      if (isNetworkError) {
        // Coupure de réseau pendant l'envoi : bascule automatique sur la file hors-ligne
        console.warn("Échec réseau lors de la vente, bascule hors-ligne :", err);
        const offlineOrder = offlineSyncManager.queueOfflineOrder({
          partner_id: partnerId,
          partner_name: partnerName,
          payment,
          lines: cart.map((item) => ({
            product_id: item.product.id,
            name: item.product.name,
            qty: item.qty,
            price_unit: item.price_unit,
          })),
        });

        const mockOrder: Order = {
          id: Math.floor(Math.random() * 1000) + 9000,
          name: offlineOrder.offline_uuid,
          date: offlineOrder.created_at,
          partner: { id: partnerId ?? 0, name: partnerName },
          state: "sale",
          amount_total: offlineOrder.amount_total,
          amount_untaxed: offlineOrder.amount_total,
          invoice_status: "invoiced",
          payment_state: payment === "credit" ? "not_paid" : "paid",
          lines: offlineOrder.lines,
        };

        setLastQrRef(qrRef ?? null);
        setQrModalOpen(false);
        setCompletedOrder(mockOrder);
        setCart([]);
        setPartnerId(null);
        setPayment("cash");
      } else {
        // Vrai problème applicatif ou de validation serveur
        console.error("Erreur serveur lors de la vente :", err);
        setError(err instanceof Error ? err.message : "Erreur lors de la validation de la vente");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (payment === "credit" && !partnerId) {
      setError("Veuillez sélectionner un client identifié pour enregistrer une vente à crédit.");
      return;
    }
    if (payment === "mobile_money") {
      setQrModalOpen(true);
      return;
    }
    await executeOrderCreation();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    try {
      const created = await api.createCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        city: newCustCity.trim() || "Conakry",
      });
      setCustomers((prev) => [created, ...prev]);
      setPartnerId(created.id);
      setShowNewCustomer(false);
      setNewCustName("");
      setNewCustPhone("+224 ");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le client");
    }
  };

  const handleCashOut = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(cashOutAmount);
    if (!cashOutReason.trim() || amount <= 0) return;

    setSubmittingCashOut(true);
    try {
      await api.createExpense({
        name: cashOutReason.trim(),
        total_amount: amount,
        employee: cashOutBeneficiary.trim() || "Caisse Comptoir",
        from_cash: true,
      });
      setCashOutOpen(false);
      setCashOutAmount("");
      setCashOutBeneficiary("");
      setCashOutFeedback(`Sortie de caisse de ${formatGNF(amount)} enregistrée.`);
      setTimeout(() => setCashOutFeedback(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du décaissement.");
    } finally {
      setSubmittingCashOut(false);
    }
  };

  return (
    <AppShell
      title="Caisse Comptoir"
      subtitle="Prise de commande instantanée, sortie de stock et encaissement en 1 clic"
      actions={
        <button
          type="button"
          onClick={() => setCashOutOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#DCE5E1] hover:border-[#C2410C] hover:bg-orange-50 text-[#C2410C] text-xs font-semibold shadow-xs cursor-pointer transition-colors"
        >
          <Banknote className="w-3.5 h-3.5 text-[#C2410C]" />
          <span>Sortie de caisse</span>
        </button>
      }
    >
      {cashOutFeedback && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{cashOutFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setCashOutFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Gauche : Catalogue Produits (7 colonnes) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Barre de recherche & code-barres */}
          <div className="bg-white rounded-[14px] border border-[#DCE5E1] p-3 card-shadow flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Rechercher un article ou scanner un code-barres (Entrée)..."
                aria-label="Rechercher un article ou scanner un code-barres"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#F7F9F8] border border-[#DCE5E1] text-sm text-[#0B2920] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
              />
              <Barcode
                className="w-4 h-4 text-[#526B63] absolute right-3.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Filtres de catégories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    active
                      ? "bg-[#115040] text-[#F3BC33]"
                      : "bg-white border border-[#DCE5E1] text-[#526B63] hover:text-[#0B2920]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Grille Produits */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-36 rounded-[14px] bg-[#EEF3F1] animate-pulse border border-[#DCE5E1]"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredProducts.map((p) => {
                const inCart = cart.find((c) => c.product.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className={`text-left rounded-[14px] bg-white p-4 border transition-all cursor-pointer flex flex-col justify-between card-shadow hover:border-[#115040] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115040] ${
                      inCart
                        ? "border-[#115040] ring-2 ring-[#115040]/20"
                        : "border-[#DCE5E1]"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-mono text-[#526B63]">
                          {p.default_code || p.category}
                        </span>
                        <StockBadge qty={p.qty_available} />
                      </div>
                      <h3 className="font-heading font-semibold text-sm text-[#0B2920] mt-2 line-clamp-2">
                        {p.name}
                      </h3>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#DCE5E1]/70 flex items-center justify-between">
                      <div>
                        <span className="font-heading text-base font-bold tabular-nums text-[#115040]">
                          {formatGNF(p.list_price)}
                        </span>
                        <span className="text-[11px] text-[#526B63] block">
                          par {p.uom}
                        </span>
                      </div>
                      {inCart ? (
                        <span className="px-2.5 py-1 rounded-lg bg-[#115040] text-white font-heading font-bold text-xs tabular-nums">
                          × {inCart.qty}
                        </span>
                      ) : (
                        <span className="w-8 h-8 rounded-lg bg-[#E8F2EE] text-[#115040] flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Droite : Ticket de caisse & Encaissement (5 colonnes) */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 bg-white rounded-[16px] border border-[#DCE5E1] card-shadow overflow-hidden flex flex-col">
          <div className="bg-[#115040] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-[#F3BC33]" />
              <h2 className="font-heading font-bold text-base">Ticket en cours</h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-200 tabular-nums">
              {cart.reduce((s, i) => s + i.qty, 0)} unité(s)
            </span>
          </div>

          <div className="p-5 space-y-5 flex-1">
            {/* Sélection du client */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="pos-customer"
                  className="text-xs font-semibold uppercase tracking-wider text-[#526B63]"
                >
                  Client
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(true)}
                  className="text-xs font-semibold text-[#115040] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Nouveau client</span>
                </button>
              </div>
              <select
                id="pos-customer"
                value={partnerId ?? ""}
                onChange={(e) =>
                  setPartnerId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F9F8] border border-[#DCE5E1] text-sm text-[#0B2920] focus:outline-none focus:ring-2 focus:ring-[#115040]"
              >
                <option value="">Client comptoir (Anonyme)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                    {c.credit > 0 ? ` — Dette: ${formatGNF(c.credit)}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Lignes du panier */}
            <div className="border-y border-[#DCE5E1] py-3 max-h-72 overflow-y-auto divide-y divide-[#DCE5E1]">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#526B63]">
                  Cliquez sur un article à gauche pour l&apos;ajouter au ticket.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#0B2920] truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[11px] text-[#526B63] tabular-nums">
                        {formatGNF(item.price_unit)} × {item.qty}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQty(item.product.id, -1)}
                        aria-label={`Diminuer quantité de ${item.product.name}`}
                        className="w-7 h-7 rounded-lg bg-[#EEF3F1] hover:bg-[#DCE5E1] text-[#0B2920] flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center font-heading font-bold text-xs tabular-nums">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.product.id, 1)}
                        aria-label={`Augmenter quantité de ${item.product.name}`}
                        className="w-7 h-7 rounded-lg bg-[#EEF3F1] hover:bg-[#DCE5E1] text-[#0B2920] flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        aria-label={`Retirer ${item.product.name}`}
                        className="w-7 h-7 rounded-lg text-[#C2410C] hover:bg-[#FFEDD5] flex items-center justify-center cursor-pointer ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mode de règlement */}
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-[#526B63] mb-2">
                Mode de règlement
              </span>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = payment === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPayment(opt.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        active
                          ? opt.id === "credit"
                            ? "bg-[#FFEDD5] border-[#C2410C] text-[#C2410C]"
                            : "bg-[#E8F2EE] border-[#115040] text-[#0B382C]"
                          : "bg-[#F7F9F8] border-[#DCE5E1] text-[#0B2920] hover:bg-[#EEF3F1]"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-heading font-bold text-xs leading-tight">
                          {opt.label}
                        </div>
                        <div className="text-[10px] opacity-75 truncate">{opt.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {payment === "credit" && !partnerId && (
                <p className="text-xs text-[#C2410C] font-medium mt-2">
                  Sélectionnez un client ci-dessus pour autoriser la vente à crédit.
                </p>
              )}
            </div>

            {/* Total & Bouton Or d'encaissement */}
            <div className="pt-2 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#526B63]">
                  Net à payer
                </span>
                <span className="font-heading text-2xl font-bold tabular-nums text-[#0B2920]">
                  {formatGNF(cartTotal)}
                </span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0 || submitting}
                onClick={handleCheckout}
                className="w-full py-3.5 px-5 rounded-xl bg-[#F3BC33] hover:bg-[#E8A02B] disabled:opacity-50 text-[#115040] font-heading font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                {payment === "mobile_money" && <QrCode className="w-5 h-5" />}
                <span>
                  {submitting
                    ? "Validation en cours..."
                    : payment === "credit"
                      ? `Inscrire au carnet (${formatGNF(cartTotal)})`
                      : payment === "mobile_money"
                        ? `Afficher le Code QR (${formatGNF(cartTotal)})`
                        : `Encaisser ${formatGNF(cartTotal)}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Nouveau Client */}
      <Modal
        open={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        title="Nouveau client"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div>
            <label
              htmlFor="new-cust-name"
              className="block text-xs font-semibold uppercase tracking-wider text-[#526B63] mb-1"
            >
              Nom complet ou Boutique
            </label>
            <input
              id="new-cust-name"
              type="text"
              required
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              placeholder="ex: Mamadou Sylla — Boutique Kaloum"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="new-cust-phone"
              className="block text-xs font-semibold uppercase tracking-wider text-[#526B63] mb-1"
            >
              Téléphone (+224)
            </label>
            <input
              id="new-cust-phone"
              type="tel"
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              placeholder="+224 622 00 00 00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="new-cust-city"
              className="block text-xs font-semibold uppercase tracking-wider text-[#526B63] mb-1"
            >
              Quartier / Ville
            </label>
            <input
              id="new-cust-city"
              type="text"
              value={newCustCity}
              onChange={(e) => setNewCustCity(e.target.value)}
              placeholder="Conakry - Madina"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowNewCustomer(false)}
              className="px-4 py-2 rounded-xl border border-[#DCE5E1] text-sm font-medium cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#115040] text-white font-heading font-semibold text-sm cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Reçu de vente */}
      <Modal
        open={Boolean(completedOrder)}
        onClose={() => setCompletedOrder(null)}
        title="Vente confirmée avec succès"
      >
        {completedOrder && (
          <div className="space-y-5">
            {completedOrder.name.startsWith("LUUMO-OFFLINE") && (
              <div className="p-3.5 rounded-xl bg-[#FEF6DF] border border-[#F3BC33]/60 text-[#8F5E00] text-xs flex items-center gap-2.5">
                <WifiOff className="w-5 h-5 text-[#C2410C] shrink-0" />
                <span>
                  <strong>Vente enregistrée en mode hors-ligne.</strong> Le reçu est certifié localement et sera synchronisé automatiquement vers votre serveur Cloud dès le rétablissement de la connexion.
                </span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-[#E8F2EE] border border-[#115040]/30 flex items-center gap-3 text-[#0B382C]">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <div className="font-heading font-bold text-base">
                  Bon N° {completedOrder.name}
                </div>
                <div className="text-xs">
                  {formatDateTime(completedOrder.date)} • Client :{" "}
                  {completedOrder.partner.name}
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#DCE5E1] border-y border-[#DCE5E1] text-sm">
              {completedOrder.lines.map((line, idx) => (
                <div key={idx} className="py-2.5 flex justify-between gap-4">
                  <span>
                    {line.name}{" "}
                    <strong className="text-[#526B63]">× {line.qty}</strong>
                  </span>
                  <span className="font-heading font-semibold tabular-nums">
                    {formatGNF(line.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-lg font-heading font-bold">
              <span>Total</span>
              <span className="tabular-nums text-[#115040]">
                {formatGNF(completedOrder.amount_total)}
              </span>
            </div>

            {/* Code QR de certification sur le reçu */}
            <div className="p-3.5 rounded-xl bg-[#F7F9F8] border border-[#DCE5E1] flex items-center justify-between gap-4">
              <div className="text-xs space-y-1">
                <strong className="block text-[#0B2920]">
                  Preuve numérique du ticket
                </strong>
                <span className="text-[#526B63] block">
                  N° {completedOrder.name}
                  {lastQrRef ? ` • Réf : ${lastQrRef}` : ""}
                </span>
              </div>
              <QrCodeVisual
                payload={`LUUMO-RECEIPT:${completedOrder.name}:${completedOrder.amount_total}:GNF`}
                size={76}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#DCE5E1] text-sm font-medium hover:bg-[#EEF3F1] cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer le reçu</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-[#115040] text-white font-heading font-semibold text-sm cursor-pointer"
              >
                Nouvelle vente
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal d'encaissement par Code QR dynamique */}
      <QrPaymentModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        amount={cartTotal}
        customerName={
          partnerId
            ? customers.find((c) => c.id === partnerId)?.name
            : "Client comptoir"
        }
        submitting={submitting}
        onConfirm={({ reference }) => executeOrderCreation(reference)}
      />

      {/* Modal Sortie de caisse physique immédiate */}
      <Modal
        open={cashOutOpen}
        onClose={() => setCashOutOpen(false)}
        title="Sortie de caisse (Décaissement espèces)"
      >
        <form onSubmit={handleCashOut} className="space-y-4">
          <p className="text-xs text-[#526B63]">
            Enregistrez tout retrait d&apos;espèces du tiroir-caisse (gasoil, dockers, petites courses) pour maintenir le solde théorique exact lors du décompte du soir.
          </p>

          <div>
            <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
              Motif précis du retrait *
            </label>
            <input
              type="text"
              value={cashOutReason}
              onChange={(e) => setCashOutReason(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] focus:outline-none focus:ring-2 focus:ring-[#115040]"
              placeholder="Ex. Gasoil Groupe Électrogène, Dockers déchargement..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Montant retiré (GNF) *
              </label>
              <input
                type="number"
                min={1000}
                step={1000}
                value={cashOutAmount}
                onChange={(e) => setCashOutAmount(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#115040]"
                placeholder="Ex. 100000"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Bénéficiaire / Donné à
              </label>
              <input
                type="text"
                value={cashOutBeneficiary}
                onChange={(e) => setCashOutBeneficiary(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] focus:outline-none focus:ring-2 focus:ring-[#115040]"
                placeholder="Ex. Chauffeur, Dockers, Vendeur"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setCashOutOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#DCE5E1] text-xs font-semibold text-[#526B63] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingCashOut}
              className="px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {submittingCashOut ? "Enregistrement..." : "Confirmer la sortie de caisse"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
