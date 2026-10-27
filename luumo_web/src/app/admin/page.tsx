"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Store,
  CreditCard,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Phone,
  MapPin,
  TrendingUp,
  DollarSign,
  Smartphone,
  ChevronDown,
  Building2,
  Layers,
  Lock,
  Unlock,
  Check,
} from "lucide-react";
import { useSession } from "@/context/session";
import { BrandAccentBar, LuumoLogo } from "@/components/ui";
import { api } from "@/lib/api";
import { formatGNF } from "@/lib/format";
import type {
  AdminCompanyItem,
  AdminKpis,
  AdminPaymentItem,
  BusinessPlanId,
} from "@/lib/types";

export default function AdminBackofficePage() {
  const { session, logout, ready } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"companies" | "payments" | "plans">("companies");
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyItem[]>([]);
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "trial" | "active" | "expired">("all");

  // Notifications
  const [toastMsg, setToastMsg] = useState<{ text: string; tone: "success" | "danger" } | null>(
    null
  );

  // Modals
  const [selectedCompany, setSelectedCompany] = useState<AdminCompanyItem | null>(null);
  const [actionType, setActionType] = useState<"extend" | "activate" | "plan" | null>(null);
  const [extendDays, setExtendDays] = useState(7);
  const [activateMonths, setActivateMonths] = useState(1);
  const [activateProvider, setActivateProvider] = useState<"orange_money" | "mtn_momo">("orange_money");
  const [activatePhone, setActivatePhone] = useState("");
  const [newPlanId, setNewPlanId] = useState<BusinessPlanId>("retail");
  const [submittingAction, setSubmittingAction] = useState(false);

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToastMsg({ text, tone });
    setTimeout(() => setToastMsg(null), 5000);
  };

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [ovRes, compRes, payRes] = await Promise.all([
        api.getAdminOverview().catch(() => null),
        api.getAdminCompanies().catch(() => []),
        api.getAdminPayments().catch(() => []),
      ]);

      if (ovRes) setKpis(ovRes.kpis);
      setCompanies(compRes);
      setPayments(payRes);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur lors du chargement des données", "danger");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (ready && session) {
      loadData();
    }
  }, [ready, session, loadData]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#071913] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-[#0B6E4F] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#071913] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <LuumoLogo variant="light-text" height={32} />
        <h1 className="text-xl font-bold">Session requise</h1>
        <p className="text-xs text-[#8FAEA1]">Veuillez vous connecter avec votre compte administrateur.</p>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-xl bg-[#0B6E4F] text-white text-xs font-bold"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  // Contrôle des droits : seul un super-administrateur (is_admin) peut gérer le backoffice
  const isSuperAdmin = session.user?.is_admin || session.mode === "demo";
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#071913] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#3E1116] border border-[#7A232D] text-[#FFA1A8] flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold">Accès réservé aux Super-Admins</h1>
        <p className="text-xs sm:text-sm text-[#8FAEA1] max-w-md">
          Ce backoffice supervise l&apos;ensemble des commerces abonnés à Luumo en Guinée. Votre compte
          est configuré comme compte boutique commerçant.
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-[#0B6E4F] text-white text-xs font-bold"
        >
          Retour à mon espace boutique
        </Link>
      </div>
    );
  }

  // Filtrage des commerces
  const filteredCompanies = companies.filter((c) => {
    const matchQuery =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.admin_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);

    if (!matchQuery) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "trial") return c.status === "trial";
    if (statusFilter === "active") return c.status === "active";
    if (statusFilter === "expired") return c.status === "expired" || c.status === "past_due";
    return true;
  });

  // Action : Prolonger l'essai
  const handleExtendTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setSubmittingAction(true);
    try {
      await api.extendTrial(selectedCompany.id, extendDays);
      showToast(`Période d'essai prolongée de ${extendDays} jours pour ${selectedCompany.name} !`);
      setSelectedCompany(null);
      setActionType(null);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Échec de la prolongation", "danger");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Action : Activer / Valider paiement
  const handleActivateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setSubmittingAction(true);
    try {
      await api.activateCompany(selectedCompany.id, {
        provider: activateProvider,
        phone: activatePhone || selectedCompany.phone,
        months: activateMonths,
      });
      showToast(`Abonnement validé (${activateMonths} mois) pour ${selectedCompany.name} !`);
      setSelectedCompany(null);
      setActionType(null);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Échec de l'activation", "danger");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Action : Changer de forfait
  const handleChangePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setSubmittingAction(true);
    try {
      await api.changeCompanyPlan(selectedCompany.id, newPlanId);
      showToast(`Forfait mis à jour vers "${newPlanId}" pour ${selectedCompany.name} !`);
      setSelectedCompany(null);
      setActionType(null);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Échec du changement de forfait", "danger");
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071913] text-white flex flex-col selection:bg-[#0B6E4F] selection:text-white">
      {/* Barre de marque officielle Luumo dégradée (Vert Forêt -> Or) */}
      <BrandAccentBar className="h-1.5" />

      {/* Barre supérieure Opérateur */}
      <header className="w-full bg-[#0B231B] border-b border-[#18392D] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <LuumoLogo variant="light-text" height={26} />
            </Link>
            <span className="text-[#1E4D3B]">|</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#11382A] border border-[#1E523F] text-[11px] font-bold text-[#F3BC33]">
              <Sparkles className="w-3 h-3 text-[#F3BC33]" />
              <span>Backoffice Opérateur Luumo</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={loadData}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1E4D3B] text-[#8FAEA1] hover:text-white hover:bg-[#11382A] transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg border border-[#2B6651] bg-[#12382C] text-white font-semibold hover:bg-[#1A4C3C] transition"
            >
              Vue Commerçant (POS)
            </Link>

            <button
              onClick={logout}
              className="text-[#8FAEA1] hover:text-[#C8102E] transition font-medium"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {toastMsg && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl border text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${
            toastMsg.tone === "success"
              ? "bg-[#0E3526] border-[#1D5E44] text-[#7EE7B8]"
              : "bg-[#3E1116] border-[#7A232D] text-[#FFA1A8]"
          }`}
        >
          {toastMsg.tone === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#C8102E]" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Contenu Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Ligne des Métriques & KPIs Globaux */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-[#0B231B] border border-[#18392D] space-y-1">
            <div className="text-[11px] font-semibold text-[#8FAEA1] flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Commerces Total</span>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {kpis?.total_companies ?? companies.length}
            </div>
            <div className="text-[10px] text-[#708F83]">Boutiques inscrites</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B231B] border border-[#18392D] space-y-1">
            <div className="text-[11px] font-semibold text-[#8FAEA1] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Abonnés Payants</span>
            </div>
            <div className="text-2xl font-extrabold text-[#34D399]">
              {kpis?.active_subscribers ?? 0}
            </div>
            <div className="text-[10px] text-[#708F83]">Comptes actifs</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B231B] border border-[#18392D] space-y-1">
            <div className="text-[11px] font-semibold text-[#8FAEA1] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#F3BC33]" />
              <span>En Essai (14j)</span>
            </div>
            <div className="text-2xl font-extrabold text-[#F3BC33]">
              {kpis?.trial_subscribers ?? 0}
            </div>
            <div className="text-[10px] text-[#708F83]">Prospects à convertir</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B231B] border border-[#18392D] space-y-1">
            <div className="text-[11px] font-semibold text-[#8FAEA1] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#C8102E]" />
              <span>Expirés / Bloqués</span>
            </div>
            <div className="text-2xl font-extrabold text-[#FFA1A8]">
              {kpis?.expired_subscribers ?? 0}
            </div>
            <div className="text-[10px] text-[#708F83]">En attente Orange Money</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B231B] border border-[#18392D] space-y-1 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-semibold text-[#8FAEA1] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#34D399]" />
              <span>MRR Luumo (GNF)</span>
            </div>
            <div className="text-xl font-extrabold text-white">
              {formatGNF(kpis?.mrr ?? 0)}
            </div>
            <div className="text-[10px] text-[#708F83]">Revenu récurrent / mois</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B231B] border border-[#18392D] space-y-1 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-semibold text-[#8FAEA1] flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#F3BC33]" />
              <span>Volume Ventes (GMV)</span>
            </div>
            <div className="text-xl font-extrabold text-[#F3BC33]">
              {formatGNF(kpis?.gmv ?? 0)}
            </div>
            <div className="text-[10px] text-[#708F83]">Transigé en Guinée</div>
          </div>
        </div>

        {/* Navigation des Onglets */}
        <div className="flex items-center gap-2 border-b border-[#18392D] pb-3">
          <button
            onClick={() => setActiveTab("companies")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "companies"
                ? "bg-[#0B6E4F] text-white shadow-sm"
                : "text-[#8FAEA1] hover:text-white hover:bg-[#0B231B]"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Commerces &amp; Tenants ({companies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "payments"
                ? "bg-[#0B6E4F] text-white shadow-sm"
                : "text-[#8FAEA1] hover:text-white hover:bg-[#0B231B]"
            }`}
          >
            <Smartphone className="w-4 h-4 text-[#FF6600]" />
            <span>Flux Mobile Money ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("plans")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "plans"
                ? "bg-[#0B6E4F] text-white shadow-sm"
                : "text-[#8FAEA1] hover:text-white hover:bg-[#0B231B]"
            }`}
          >
            <Layers className="w-4 h-4 text-[#F3BC33]" />
            <span>Grille des Forfaits</span>
          </button>
        </div>

        {/* TAB 1 : Commerces & Tenants */}
        {activeTab === "companies" && (
          <div className="space-y-4">
            {/* Barre de Recherche & Filtres */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0B231B] p-3 rounded-2xl border border-[#18392D]">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#708F83]" />
                <input
                  type="text"
                  placeholder="Rechercher boutique, ville, gérant, téléphone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#071913] border border-[#1E4D3B] text-xs text-white placeholder-[#526B63] focus:outline-none focus:border-[#34D399]"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {(
                  [
                    { id: "all", label: "Tous" },
                    { id: "trial", label: "En essai 14j" },
                    { id: "active", label: "Actifs" },
                    { id: "expired", label: "Expirés / Bloqués" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      statusFilter === f.id
                        ? "bg-[#11382A] border border-[#34D399] text-[#7EE7B8]"
                        : "text-[#708F83] hover:text-white hover:bg-[#071913]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table des Boutiques */}
            <div className="bg-[#0B231B] rounded-2xl border border-[#18392D] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#071913] text-[#8FAEA1] font-bold uppercase tracking-wider border-b border-[#18392D]">
                    <tr>
                      <th className="py-3 px-4">Commerce / Boutique</th>
                      <th className="py-3 px-4">Gérant &amp; Contact</th>
                      <th className="py-3 px-4">Ville</th>
                      <th className="py-3 px-4">Forfait</th>
                      <th className="py-3 px-4">Statut Abonnement</th>
                      <th className="py-3 px-4">Échéance</th>
                      <th className="py-3 px-4 text-right">Actions Opérateur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#133328]">
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-[#708F83]">
                          Aucun commerce ne correspond à votre recherche.
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((c) => {
                        const isExpired = c.status === "expired" || c.status === "past_due";
                        const isTrial = c.status === "trial";
                        return (
                          <tr key={c.id} className="hover:bg-[#0E2D23] transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-white">{c.name}</div>
                              <div className="text-[10px] text-[#708F83]">ID: #{c.id}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-white font-medium">{c.admin_name}</div>
                              <div className="text-[11px] text-[#8FAEA1] flex items-center gap-1">
                                <Phone className="w-3 h-3 text-[#708F83]" />
                                <span>{c.phone || "Non renseigné"}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 text-[#D1E2DB]">
                                <MapPin className="w-3 h-3 text-[#34D399]" />
                                {c.city || "Conakry"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-white">{c.plan?.name}</span>
                              <div className="text-[10px] text-[#708F83]">
                                {formatGNF(c.plan?.monthly_price ?? 0)}/m
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {isTrial ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#3B2D05] border border-[#7A5B0B] text-[#F3BC33] text-[11px] font-bold">
                                  <Clock className="w-3 h-3" />
                                  <span>Essai ({c.days_remaining}j restants)</span>
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#3E1116] border border-[#7A232D] text-[#FFA1A8] text-[11px] font-bold">
                                  <Lock className="w-3 h-3" />
                                  <span>Expiré / Bloqué</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0E3526] border border-[#1D5E44] text-[#7EE7B8] text-[11px] font-bold">
                                  <Check className="w-3 h-3" />
                                  <span>Actif (Payant)</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-[#8FAEA1] text-[11px]">
                              {c.current_period_end}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCompany(c);
                                    setActionType("extend");
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-[#1E4D3B] text-[#F3BC33] hover:bg-[#11382A] text-[11px] font-semibold transition"
                                  title="Prolonger l'essai gratuit"
                                >
                                  +7j
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCompany(c);
                                    setActivatePhone(c.phone);
                                    setActionType("activate");
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#0B6E4F] hover:bg-[#0E8A63] text-white text-[11px] font-bold transition flex items-center gap-1"
                                  title="Valider un paiement Orange Money / MTN"
                                >
                                  <Unlock className="w-3 h-3" />
                                  <span>Activer</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCompany(c);
                                    setNewPlanId(c.plan?.id || "retail");
                                    setActionType("plan");
                                  }}
                                  className="px-2 py-1 rounded-lg border border-[#18392D] text-[#8FAEA1] hover:text-white text-[11px] transition"
                                  title="Changer de forfait"
                                >
                                  Forfait
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2 : Flux Mobile Money */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            <div className="bg-[#0B231B] rounded-2xl border border-[#18392D] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#071913] text-[#8FAEA1] font-bold uppercase tracking-wider border-b border-[#18392D]">
                    <tr>
                      <th className="py-3 px-4">Réf. Transaction</th>
                      <th className="py-3 px-4">Commerce / Boutique</th>
                      <th className="py-3 px-4">Opérateur</th>
                      <th className="py-3 px-4">Montant</th>
                      <th className="py-3 px-4">Téléphone Client</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#133328]">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-[#708F83]">
                          Aucun flux Mobile Money enregistré pour l&apos;instant.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-[#0E2D23] transition-colors">
                          <td className="py-3 px-4 font-mono text-white font-bold">{p.tx_ref}</td>
                          <td className="py-3 px-4 text-white">{p.company_name}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                p.provider === "orange_money"
                                  ? "bg-[#3B1E05] border border-[#7A3E0B] text-[#FF8533]"
                                  : "bg-[#3B2D05] border border-[#7A5B0B] text-[#F3BC33]"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {p.provider === "orange_money" ? "Orange Money" : "MTN MoMo"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-white">{formatGNF(p.amount)}</td>
                          <td className="py-3 px-4 text-[#8FAEA1]">{p.customer_phone || "—"}</td>
                          <td className="py-3 px-4">
                            {p.state === "paid" ? (
                              <span className="text-[#34D399] font-bold">✓ Réglé</span>
                            ) : p.state === "pending" ? (
                              <span className="text-[#F3BC33] font-bold">⏳ En attente</span>
                            ) : (
                              <span className="text-[#FFA1A8] font-bold">✕ Échoué</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#708F83] text-[11px]">{p.created_at}</td>
                          <td className="py-3 px-4 text-right">
                            {p.state !== "paid" && (
                              <button
                                onClick={async () => {
                                  try {
                                    await api.forceConfirmPayment(p.id);
                                    showToast(`Paiement ${p.tx_ref} validé manuellement !`);
                                    await loadData();
                                  } catch (err) {
                                    showToast(
                                      err instanceof Error ? err.message : "Erreur de validation",
                                      "danger"
                                    );
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg border border-[#1E4D3B] text-[#7EE7B8] hover:bg-[#11382A] text-[11px] font-semibold"
                              >
                                Forcer validation
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3 : Grille des Forfaits */}
        {activeTab === "plans" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#0B231B] border border-[#18392D] space-y-4">
              <div className="text-xs font-bold text-[#7EE7B8] uppercase tracking-wider">
                Commerce de détail
              </div>
              <h3 className="text-xl font-bold text-white">Forfait Boutique</h3>
              <div className="text-2xl font-extrabold text-white">{formatGNF(150000)} / mois</div>
              <p className="text-xs text-[#8FAEA1]">
                Idéal pour les supérettes, pharmacies, quincailleries et magasins de Madina.
              </p>
              <div className="pt-2 border-t border-[#18392D] text-xs text-[#D1E2DB] space-y-2">
                <div>✓ Caisse tactile POS</div>
                <div>✓ Stocks &amp; Alertes rupture</div>
                <div>✓ Carnet de crédit clients</div>
                <div>✓ Dashboard de vente</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0B231B] border-2 border-[#34D399] space-y-4 shadow-xl">
              <div className="text-xs font-bold text-[#34D399] uppercase tracking-wider">
                Distribution &amp; Transport
              </div>
              <h3 className="text-xl font-bold text-white">Forfait Grossiste &amp; Flotte</h3>
              <div className="text-2xl font-extrabold text-[#34D399]">{formatGNF(450000)} / mois</div>
              <p className="text-xs text-[#8FAEA1]">
                Grossistes de ciment, riz, boisson, conteneurs avec gestion de camions et motos.
              </p>
              <div className="pt-2 border-t border-[#18392D] text-xs text-[#D1E2DB] space-y-2">
                <div>✓ Tout le Forfait Boutique</div>
                <div>✓ Flotte de livraison (camions/motos)</div>
                <div>✓ Achats fournisseurs &amp; dépotages</div>
                <div>✓ Gestion de l&apos;équipe RH &amp; salaires</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0B231B] border border-[#18392D] space-y-4">
              <div className="text-xs font-bold text-[#7EE7B8] uppercase tracking-wider">
                Cabinets &amp; Ateliers
              </div>
              <h3 className="text-xl font-bold text-white">Forfait Services</h3>
              <div className="text-2xl font-extrabold text-white">{formatGNF(250000)} / mois</div>
              <p className="text-xs text-[#8FAEA1]">
                Agences de prestation, cabinets comptables, maintenance et ateliers.
              </p>
              <div className="pt-2 border-t border-[#18392D] text-xs text-[#D1E2DB] space-y-2">
                <div>✓ Devis &amp; Facturation normalisée</div>
                <div>✓ Suivi des clients &amp; créances</div>
                <div>✓ Ressources Humaines</div>
                <div>✓ Bilan financier</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1 : Prolonger Essai (+7j / +14j) */}
      {selectedCompany && actionType === "extend" && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B231B] border border-[#18392D] rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-white">
              Prolonger l&apos;essai gratuit
            </h3>
            <p className="text-xs text-[#8FAEA1]">
              Entreprise : <strong className="text-white">{selectedCompany.name}</strong> ({selectedCompany.city})
            </p>

            <form onSubmit={handleExtendTrial} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                  Nombre de jours à ajouter :
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtendDays(d)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        extendDays === d
                          ? "bg-[#0B6E4F] border-[#34D399] text-white"
                          : "border-[#1E4D3B] text-[#708F83] hover:text-white"
                      }`}
                    >
                      +{d} jours
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompany(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#18392D] text-xs text-[#8FAEA1]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 rounded-xl bg-[#0B6E4F] text-white text-xs font-bold"
                >
                  {submittingAction ? "Application..." : "Confirmer la prolongation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 : Activer / Valider Paiement Orange Money */}
      {selectedCompany && actionType === "activate" && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B231B] border border-[#18392D] rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">
              Validation manuelle d&apos;abonnement
            </h3>
            <p className="text-xs text-[#8FAEA1]">
              Boutique : <strong className="text-white">{selectedCompany.name}</strong> • Forfait :{" "}
              {selectedCompany.plan?.name}
            </p>

            <form onSubmit={handleActivateCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                  Durée à créditer :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActivateMonths(1)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      activateMonths === 1
                        ? "bg-[#0B6E4F] border-[#34D399] text-white"
                        : "border-[#1E4D3B] text-[#708F83]"
                    }`}
                  >
                    1 mois ({formatGNF(selectedCompany.plan?.monthly_price ?? 0)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivateMonths(12)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      activateMonths === 12
                        ? "bg-[#0B6E4F] border-[#34D399] text-white"
                        : "border-[#1E4D3B] text-[#708F83]"
                    }`}
                  >
                    1 an ({formatGNF((selectedCompany.plan?.monthly_price ?? 0) * 10)})
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                  Opérateur Mobile Money :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActivateProvider("orange_money")}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      activateProvider === "orange_money"
                        ? "border-[#FF6600] bg-[#3B1E05] text-[#FF8533]"
                        : "border-[#1E4D3B] text-[#708F83]"
                    }`}
                  >
                    Orange Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivateProvider("mtn_momo")}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      activateProvider === "mtn_momo"
                        ? "border-[#FFCC00] bg-[#3B2D05] text-[#F3BC33]"
                        : "border-[#1E4D3B] text-[#708F83]"
                    }`}
                  >
                    MTN MoMo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                  Numéro débité :
                </label>
                <input
                  type="text"
                  value={activatePhone}
                  onChange={(e) => setActivatePhone(e.target.value)}
                  placeholder="+224 6xx xx xx xx"
                  className="w-full px-3 py-2 rounded-xl bg-[#071913] border border-[#1E4D3B] text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompany(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#18392D] text-xs text-[#8FAEA1]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 rounded-xl bg-[#0B6E4F] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{submittingAction ? "Déblocage..." : "Valider & Débloquer la caisse"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3 : Changer de forfait */}
      {selectedCompany && actionType === "plan" && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B231B] border border-[#18392D] rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-white">Changer de forfait</h3>
            <p className="text-xs text-[#8FAEA1]">
              Entreprise : <strong className="text-white">{selectedCompany.name}</strong>
            </p>

            <form onSubmit={handleChangePlan} className="space-y-4">
              <div className="space-y-2">
                {[
                  { id: "retail", name: "Forfait Boutique (150 000 GNF)" },
                  { id: "services", name: "Forfait Services (250 000 GNF)" },
                  { id: "wholesale", name: "Forfait Grossiste (450 000 GNF)" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setNewPlanId(p.id as BusinessPlanId)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold text-left border transition ${
                      newPlanId === p.id
                        ? "bg-[#0B6E4F] border-[#34D399] text-white"
                        : "border-[#1E4D3B] text-[#708F83] hover:text-white"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompany(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#18392D] text-xs text-[#8FAEA1]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 rounded-xl bg-[#0B6E4F] text-white text-xs font-bold"
                >
                  {submittingAction ? "Enregistrement..." : "Appliquer le forfait"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
