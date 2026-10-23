"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  Wallet,
  Users,
  Phone,
  MapPin,
  Banknote,
  Smartphone,
  Landmark,
  Building2,
  User as UserIcon,
  AlertCircle,
  QrCode,
} from "lucide-react";
import {
  AppShell,
  ErrorBanner,
  KpiCard,
  Modal,
  PaymentStateBadge,
  StatusBadge,
} from "@/components/ui";
import { QrPaymentModal } from "@/components/qr-payment";
import { api } from "@/lib/api";
import { formatDate, formatDateTime, formatGNF, initials } from "@/lib/format";
import type { Customer, CustomerDetail, PaymentMethod } from "@/lib/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [debtorsOnly, setDebtorsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Détail client & remboursement
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<Exclude<PaymentMethod, "credit">>("cash");
  const [paying, setPaying] = useState(false);
  const [qrDebtOpen, setQrDebtOpen] = useState(false);

  // Création client / entreprise façon Odoo (res.partner + validation OWASP)
  const [showCreate, setShowCreate] = useState(false);
  const [companyType, setCompanyType] = useState<"person" | "company">("person");
  const [name, setName] = useState("");
  const [vat, setVat] = useState("");
  const [phone, setPhone] = useState("+224 ");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("Conakry");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.customers("");
      setCustomers(res.data);
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
    return customers.filter((c) => {
      if (debtorsOnly && c.credit <= 0) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        (c.vat && c.vat.toLowerCase().includes(q))
      );
    });
  }, [customers, debtorsOnly, search]);

  const stats = useMemo(() => {
    const debtors = customers.filter((c) => c.credit > 0);
    const totalCredit = debtors.reduce((s, c) => s + c.credit, 0);
    const companiesCount = customers.filter((c) => c.is_company).length;
    return {
      total: customers.length,
      companiesCount,
      debtorsCount: debtors.length,
      totalCredit,
    };
  }, [customers]);

  const openDetail = async (id: number) => {
    try {
      const detail = await api.customer(id);
      setSelected(detail);
      setPayAmount(detail.credit > 0 ? String(detail.credit) : "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ouvrir la fiche client");
    }
  };

  const executePayment = async () => {
    if (!selected) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return;
    setPaying(true);
    try {
      await api.customerPayment(selected.id, amt, payMethod);
      setQrDebtOpen(false);
      const refreshed = await api.customer(selected.id);
      setSelected(refreshed);
      setPayAmount(refreshed.credit > 0 ? String(refreshed.credit) : "");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'encaissement");
    } finally {
      setPaying(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return;
    if (payMethod === "mobile_money") {
      setQrDebtOpen(true);
      return;
    }
    await executePayment();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const created = await api.createCustomer({
        name,
        is_company: companyType === "company",
        company_type: companyType,
        phone,
        email,
        street,
        city: city || "Conakry",
        vat,
      });
      setCustomers((prev) => [created, ...prev]);
      setShowCreate(false);
      setName("");
      setVat("");
      setPhone("+224 ");
      setEmail("");
      setStreet("");
      setCity("Conakry");
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Impossible de créer la fiche client"
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell
      title="Clients & Carnet de Dettes"
      subtitle="Suivi des créances clients, historique d'achats et encaissement des remboursements"
      actions={
        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setShowCreate(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white font-heading font-semibold text-sm cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-[#F3BC33]" />
          <span>Nouveau client</span>
        </button>
      }
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} onRetry={load} />}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            tone="danger"
            label="Total Carnet de Dettes"
            value={formatGNF(stats.totalCredit)}
            sublabel={`${stats.debtorsCount} client(s) avec solde débiteur`}
            icon={<Wallet className="w-5 h-5" />}
          />
          <KpiCard
            label="Partenaires enregistrés"
            value={`${stats.total} fiches`}
            sublabel={`Dont ${stats.companiesCount} entreprise(s) B2B et ${stats.total - stats.companiesCount} particulier(s)`}
            icon={<Users className="w-5 h-5" />}
          />
          <KpiCard
            tone="ink"
            label="Taux de recouvrement"
            value={
              stats.total > 0
                ? `${Math.round(((stats.total - stats.debtorsCount) / stats.total) * 100)} %`
                : "100 %"
            }
            sublabel="Clients à jour de règlement"
            icon={<Banknote className="w-5 h-5" />}
          />
        </div>

        {/* Barre de recherche & filtre débiteurs */}
        <div className="bg-white rounded-[14px] border border-[#DCE5E1] p-4 card-shadow flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, entreprise, NIF/RCCM, téléphone (+224) ou quartier..."
              aria-label="Rechercher un client"
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F7F9F8] border border-[#DCE5E1] text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setDebtorsOnly((v) => !v)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
              debtorsOnly
                ? "bg-[#FFEDD5] border-[#C2410C] text-[#C2410C]"
                : "bg-white border-[#DCE5E1] text-[#0B2920] hover:bg-[#EEF3F1]"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Débiteurs uniquement ({stats.debtorsCount})</span>
          </button>
        </div>

        {/* Table Clients & Entreprises */}
        <div className="bg-white rounded-[14px] border border-[#DCE5E1] card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DCE5E1] bg-[#F7F9F8] text-[11px] font-semibold uppercase tracking-wider text-[#526B63]">
                  <th className="py-3.5 px-4">Client / Entreprise</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Téléphone</th>
                  <th className="py-3.5 px-4">Quartier / Ville</th>
                  <th className="py-3.5 px-4">Statut Compte</th>
                  <th className="py-3.5 px-4 text-right">Solde dû (Dette)</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5E1] text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#526B63]">
                      Chargement des clients...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#526B63]">
                      Aucun client trouvé.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-[#EEF3F1]/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg font-heading font-bold text-xs flex items-center justify-center shrink-0 ${
                              c.is_company
                                ? "bg-[#FEF6DF] text-[#8F5E00] border border-[#F3BC33]/60"
                                : "bg-[#115040] text-[#F3BC33]"
                            }`}
                          >
                            {c.is_company ? (
                              <Building2 className="w-4 h-4" />
                            ) : (
                              initials(c.name)
                            )}
                          </div>
                          <div>
                            <span className="font-heading font-semibold text-[#0B2920] block">
                              {c.name}
                            </span>
                            {c.email && (
                              <span className="text-[11px] text-[#526B63]">
                                {c.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {c.is_company ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FEF6DF] text-[#8F5E00] font-semibold text-[11px]">
                              Entreprise B2B
                            </span>
                            {c.vat && (
                              <div className="font-mono text-[11px] text-[#526B63]">
                                {c.vat}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EEF3F1] text-[#526B63] font-medium text-[11px]">
                            Particulier
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#526B63] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          {c.phone || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#526B63]">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {c.street ? `${c.street}, ` : ""}
                          {c.city || "Conakry"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {c.credit > 0 ? (
                          <StatusBadge variant="danger" label="Dette en cours" />
                        ) : (
                          <StatusBadge variant="success" label="À jour" />
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-heading font-bold tabular-nums ${
                          c.credit > 0 ? "text-[#C2410C]" : "text-[#526B63]"
                        }`}
                      >
                        {formatGNF(c.credit)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openDetail(c.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                            c.credit > 0
                              ? "bg-[#F3BC33] text-[#115040] hover:bg-[#E8A02B]"
                              : "bg-[#EEF3F1] text-[#0B2920] hover:bg-[#DCE5E1]"
                          }`}
                        >
                          {c.credit > 0 ? "Encaisser / Voir" : "Détails"}
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

      {/* Modal Détail Client & Encaissement Dette */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Fiche Partenaire — ${selected.name}` : "Client"}
        maxWidth="max-w-2xl"
      >
        {selected && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#115040] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-emerald-200/80">
                  {selected.is_company ? "Entreprise B2B" : "Client Particulier"}
                  {selected.vat ? ` • ${selected.vat}` : ""} •{" "}
                  {selected.phone || "Sans téléphone"} • {selected.city || "Conakry"}
                </p>
                <div className="font-heading text-2xl font-bold tabular-nums mt-1 text-[#F3BC33]">
                  Dette actuelle : {formatGNF(selected.credit)}
                </div>
              </div>
              {selected.credit === 0 && (
                <StatusBadge variant="success" label="Aucune dette" />
              )}
            </div>

            {selected.credit > 0 && (
              <form
                onSubmit={handlePayment}
                className="p-4 rounded-xl bg-[#F7F9F8] border border-[#DCE5E1] space-y-3"
              >
                <h3 className="font-heading font-bold text-sm text-[#0B2920]">
                  Enregistrer un remboursement client
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="repay-amount"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#526B63] mb-1"
                    >
                      Montant versé (GNF)
                    </label>
                    <input
                      id="repay-amount"
                      type="number"
                      min="1"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#DCE5E1] font-heading font-bold text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-[#526B63] mb-1">
                      Mode de règlement
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: "cash", label: "Espèces", icon: Banknote },
                          { id: "mobile_money", label: "Code QR / MoMo", icon: QrCode },
                          { id: "bank", label: "Banque", icon: Landmark },
                        ] as const
                      ).map((m) => {
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPayMethod(m.id)}
                            className={`py-2 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1 cursor-pointer ${
                              payMethod === m.id
                                ? "bg-[#115040] text-white border-[#115040]"
                                : "bg-white text-[#0B2920] border-[#DCE5E1]"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={paying}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#F3BC33] hover:bg-[#E8A02B] text-[#115040] font-heading font-bold text-sm cursor-pointer"
                >
                  {paying
                    ? "Enregistrement..."
                    : `Valider l'encaissement (${formatGNF(Number(payAmount) || 0)})`}
                </button>
              </form>
            )}

            <div>
              <h3 className="font-heading font-bold text-sm text-[#0B2920] mb-2">
                Derniers règlements reçus ({selected.payments.length})
              </h3>
              {selected.payments.length === 0 ? (
                <p className="text-xs text-[#526B63]">Aucun paiement enregistré.</p>
              ) : (
                <div className="divide-y divide-[#DCE5E1] border border-[#DCE5E1] rounded-xl overflow-hidden text-xs">
                  {selected.payments.map((pay) => (
                    <div
                      key={pay.id}
                      className="p-3 bg-white flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-[#0B2920]">{pay.name}</strong>
                        <span className="text-[#526B63] ml-2">
                          ({pay.journal} • {formatDate(pay.date)})
                        </span>
                      </div>
                      <span className="font-heading font-bold text-[#115040] tabular-nums">
                        + {formatGNF(pay.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-heading font-bold text-sm text-[#0B2920] mb-2">
                Historique des achats ({selected.orders.length})
              </h3>
              {selected.orders.length === 0 ? (
                <p className="text-xs text-[#526B63]">Aucune commande enregistrée.</p>
              ) : (
                <div className="divide-y divide-[#DCE5E1] border border-[#DCE5E1] rounded-xl overflow-hidden text-xs">
                  {selected.orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 bg-white flex items-center justify-between gap-2"
                    >
                      <div>
                        <strong className="text-[#0B2920]">{ord.name}</strong>
                        <span className="text-[#526B63] ml-2">
                          {formatDateTime(ord.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <PaymentStateBadge state={ord.payment_state} />
                        <span className="font-heading font-bold tabular-nums">
                          {formatGNF(ord.amount_total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Enregistrement Client / Entreprise */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouveau client"
      >
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-[#F7F9F8] border border-[#DCE5E1]">
            <button
              type="button"
              onClick={() => setCompanyType("person")}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                companyType === "person"
                  ? "bg-[#115040] text-white shadow-xs"
                  : "text-[#526B63] hover:text-[#0B2920]"
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Particulier</span>
            </button>
            <button
              type="button"
              onClick={() => setCompanyType("company")}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                companyType === "company"
                  ? "bg-[#115040] text-white shadow-xs"
                  : "text-[#526B63] hover:text-[#0B2920]"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Entreprise</span>
            </button>
          </div>

          {createError && (
            <div className="p-3 rounded-xl bg-[#FFEDD5] border border-[#EA580C]/30 text-[#C2410C] text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="cust-name"
              className="block text-xs font-semibold text-[#0B2920] mb-1"
            >
              {companyType === "company"
                ? "Nom de l'entreprise *"
                : "Nom complet du client *"}
            </label>
            <input
              id="cust-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                companyType === "company"
                  ? "Ex. Quincaillerie Le Bâtisseur"
                  : "Ex. Fatoumata Binta Bah"
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm"
            />
          </div>

          {companyType === "company" && (
            <div>
              <label
                htmlFor="cust-vat"
                className="block text-xs font-semibold text-[#0B2920] mb-1"
              >
                NIF / RCCM (Optionnel)
              </label>
              <input
                id="cust-vat"
                type="text"
                maxLength={32}
                value={vat}
                onChange={(e) => setVat(e.target.value)}
                placeholder="Ex. NIF-401928371-GN"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm font-mono"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="cust-phone"
                className="block text-xs font-semibold text-[#0B2920] mb-1"
              >
                Téléphone (+224)
              </label>
              <input
                id="cust-phone"
                type="tel"
                maxLength={22}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+224 622 00 00 00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="cust-city"
                className="block text-xs font-semibold text-[#0B2920] mb-1"
              >
                Quartier / Ville
              </label>
              <input
                id="cust-city"
                type="text"
                maxLength={80}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm"
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
              disabled={creating}
              className="px-5 py-2 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white font-heading font-semibold text-sm cursor-pointer disabled:opacity-50"
            >
              {creating ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Code QR pour remboursement de dette */}
      <QrPaymentModal
        open={qrDebtOpen}
        onClose={() => setQrDebtOpen(false)}
        amount={Number(payAmount) || 0}
        customerName={selected?.name}
        submitting={paying}
        onConfirm={() => executePayment()}
      />
    </AppShell>
  );
}
