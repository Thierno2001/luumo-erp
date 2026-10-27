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
  UserPlus,
  KeyRound,
  UserCheck,
  UserX,
} from "lucide-react";
import { useSession } from "@/context/session";
import { BrandAccentBar, LuumoLogo } from "@/components/ui";
import { api } from "@/lib/api";
import { formatGNF } from "@/lib/format";
import type {
  AdminCompanyItem,
  AdminKpis,
  AdminPaymentItem,
  AdminUserItem,
  BusinessPlanId,
  LuumoRole,
  RoleDefinition,
} from "@/lib/types";

export default function AdminBackofficePage() {
  const { session, logout, ready } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"companies" | "payments" | "plans" | "users">("companies");
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyItem[]>([]);
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "trial" | "active" | "expired">("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | LuumoRole>("all");

  // Notifications
  const [toastMsg, setToastMsg] = useState<{ text: string; tone: "success" | "danger" } | null>(
    null
  );

  // Modals Sociétés
  const [selectedCompany, setSelectedCompany] = useState<AdminCompanyItem | null>(null);
  const [actionType, setActionType] = useState<"extend" | "activate" | "plan" | null>(null);
  const [extendDays, setExtendDays] = useState(7);
  const [activateMonths, setActivateMonths] = useState(1);
  const [activateProvider, setActivateProvider] = useState<"orange_money" | "mtn_momo">("orange_money");
  const [activatePhone, setActivatePhone] = useState("");
  const [newPlanId, setNewPlanId] = useState<BusinessPlanId>("retail");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Modals Utilisateurs
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [userModalType, setUserModalType] = useState<"create" | "role" | "password" | null>(null);
  const [createUserName, setCreateUserName] = useState("");
  const [createUserLogin, setCreateUserLogin] = useState("");
  const [createUserPhone, setCreateUserPhone] = useState("");
  const [createUserPassword, setCreateUserPassword] = useState("");
  const [createUserCompanyId, setCreateUserCompanyId] = useState<number>(1);
  const [createUserRole, setCreateUserRole] = useState<LuumoRole>("cashier");
  const [updateRole, setUpdateRole] = useState<LuumoRole>("cashier");
  const [resetPasswordVal, setResetPasswordVal] = useState("");

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToastMsg({ text, tone });
    setTimeout(() => setToastMsg(null), 5000);
  };

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [ovRes, compRes, payRes, usersRes, rolesRes] = await Promise.all([
        api.getAdminOverview().catch(() => null),
        api.getAdminCompanies().catch(() => []),
        api.getAdminPayments().catch(() => []),
        api.getAdminUsers().catch(() => []),
        api.getAdminRoles().catch(() => []),
      ]);

      if (ovRes) setKpis(ovRes.kpis);
      setCompanies(compRes);
      setPayments(payRes);
      setUsers(usersRes);
      setRoles(rolesRes);
      if (compRes.length > 0) {
        setCreateUserCompanyId((prev) => prev || compRes[0].id);
      }
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

  // Filtrage des utilisateurs
  const filteredUsers = users.filter((u) => {
    const matchQuery =
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.login.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.company_name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(userSearchQuery));

    if (!matchQuery) return false;
    if (userRoleFilter === "all") return true;
    return u.role === userRoleFilter;
  });

  // Action : Créer un utilisateur
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      await api.createAdminUser({
        name: createUserName,
        login: createUserLogin,
        phone: createUserPhone,
        password: createUserPassword,
        company_id: createUserCompanyId,
        role: createUserRole,
      });
      showToast(`Utilisateur "${createUserName}" créé avec succès !`);
      setUserModalType(null);
      setCreateUserName("");
      setCreateUserLogin("");
      setCreateUserPhone("");
      setCreateUserPassword("");
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Échec de création de l'utilisateur", "danger");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Action : Mettre à jour le rôle / profil
  const handleUpdateUserRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmittingAction(true);
    try {
      await api.updateAdminUserRole(selectedUser.id, updateRole);
      showToast(`Profil mis à jour pour ${selectedUser.name} !`);
      setSelectedUser(null);
      setUserModalType(null);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Échec de mise à jour du rôle", "danger");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Action : Activer / Désactiver un utilisateur
  const handleToggleUserActive = async (u: AdminUserItem) => {
    try {
      const res = await api.toggleAdminUserActive(u.id);
      showToast(
        res.active
          ? `Compte de ${u.name} réactivé.`
          : `Compte de ${u.name} suspendu.`
      );
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Échec de modification du statut", "danger");
    }
  };

  // Action : Réinitialiser le mot de passe
  const handleResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmittingAction(true);
    try {
      await api.resetAdminUserPassword(selectedUser.id, resetPasswordVal);
      showToast(`Mot de passe réinitialisé pour ${selectedUser.name} !`);
      setSelectedUser(null);
      setUserModalType(null);
      setResetPasswordVal("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Échec de réinitialisation du mot de passe", "danger");
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

          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "users"
                ? "bg-[#0B6E4F] text-white shadow-sm"
                : "text-[#8FAEA1] hover:text-white hover:bg-[#0B231B]"
            }`}
          >
            <Users className="w-4 h-4 text-[#34D399]" />
            <span>Utilisateurs &amp; Privilèges ({users.length})</span>
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

        {/* TAB 4 : Utilisateurs & Privilèges */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Barre d'outils Utilisateurs */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0B231B] p-3 rounded-2xl border border-[#18392D]">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#708F83]" />
                <input
                  type="text"
                  placeholder="Rechercher utilisateur, email, commerce..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#071913] border border-[#1E4D3B] text-xs text-white placeholder-[#526B63] focus:outline-none focus:border-[#34D399]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Filtre par Profil */}
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#071913] border border-[#1E4D3B] text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">Tous les profils</option>
                  <option value="platform_admin">👑 Super-Admin Plateforme</option>
                  <option value="manager">🏢 Gérants / Propriétaires</option>
                  <option value="cashier">🛒 Caissiers / Vendeurs</option>
                  <option value="stock_keeper">📦 Magasiniers</option>
                  <option value="accountant">📊 Comptables</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setUserModalType("create");
                    setCreateUserName("");
                    setCreateUserLogin("");
                    setCreateUserPhone("");
                    setCreateUserPassword("");
                    setCreateUserRole("cashier");
                    if (companies.length > 0) setCreateUserCompanyId(companies[0].id);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0B6E4F] hover:bg-[#0E8A63] text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Nouvel Utilisateur</span>
                </button>
              </div>
            </div>

            {/* Table des Utilisateurs & Droits */}
            <div className="overflow-x-auto rounded-2xl border border-[#18392D] bg-[#0B231B]">
              <table className="w-full text-left text-xs text-[#D1E2DB]">
                <thead className="bg-[#071913] text-[#708F83] font-semibold border-b border-[#18392D]">
                  <tr>
                    <th className="py-3 px-4">Utilisateur</th>
                    <th className="py-3 px-4">Commerce / Établissement</th>
                    <th className="py-3 px-4">Profil &amp; Privilèges</th>
                    <th className="py-3 px-4">Applications Autorisées</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18392D]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#708F83]">
                        Aucun utilisateur trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isAdm = u.role === "platform_admin";
                      const roleBadgeColor = isAdm
                        ? "bg-[#FEF6DF] text-[#8F5E00] border-[#F3BC33]"
                        : u.role === "manager"
                        ? "bg-[#E8F2EE] text-[#115040] border-[#115040]/30"
                        : u.role === "cashier"
                        ? "bg-blue-950/60 text-blue-300 border-blue-700/40"
                        : u.role === "stock_keeper"
                        ? "bg-purple-950/60 text-purple-300 border-purple-700/40"
                        : "bg-amber-950/60 text-amber-300 border-amber-700/40";

                      return (
                        <tr key={u.id} className="hover:bg-[#0E2C22] transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{u.name}</span>
                              {isAdm && <span title="Super-Admin">👑</span>}
                            </div>
                            <div className="text-[11px] text-[#708F83]">{u.login}</div>
                            {u.phone && (
                              <div className="text-[10px] text-[#526B63] flex items-center gap-1 mt-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{u.phone}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-white font-medium">{u.company_name}</div>
                            <div className="text-[10px] text-[#708F83]">ID #{u.company_id}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleBadgeColor}`}
                            >
                              {u.role_name}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isAdm ? (
                              <span className="text-[11px] text-[#F3BC33] font-semibold">
                                Tour de contrôle globale (/admin)
                              </span>
                            ) : u.allowed_apps.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {u.allowed_apps.map((app) => (
                                  <span
                                    key={app}
                                    className="px-2 py-0.5 rounded bg-[#071913] text-[#7EE7B8] text-[10px] font-medium border border-[#1E4D3B]"
                                  >
                                    {app}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#708F83]">Aucune</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {u.active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#11382A] text-[#34D399] border border-[#1E523F]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                                Actif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3E1116] text-[#FFA1A8] border border-[#7A232D]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FFA1A8]" />
                                Suspendu
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Changer le rôle */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setUpdateRole(u.role);
                                  setUserModalType("role");
                                }}
                                title="Modifier le profil et privilèges"
                                className="px-2 py-1 rounded-lg bg-[#071913] hover:bg-[#11382A] text-[#D1E2DB] hover:text-[#34D399] border border-[#18392D] text-[11px] font-semibold transition"
                              >
                                Profil
                              </button>

                              {/* Réinitialiser mot de passe */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setResetPasswordVal("");
                                  setUserModalType("password");
                                }}
                                title="Réinitialiser le mot de passe"
                                className="p-1 rounded-lg bg-[#071913] hover:bg-[#11382A] text-[#D1E2DB] hover:text-[#F3BC33] border border-[#18392D] transition"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              {/* Activer / Désactiver */}
                              <button
                                type="button"
                                onClick={() => handleToggleUserActive(u)}
                                title={u.active ? "Suspendre ce compte" : "Réactiver ce compte"}
                                className={`p-1 rounded-lg border transition ${
                                  u.active
                                    ? "bg-[#071913] text-[#708F83] hover:text-[#FFA1A8] hover:border-[#7A232D]"
                                    : "bg-[#071913] text-[#34D399] hover:bg-[#11382A] border-[#1E523F]"
                                }`}
                              >
                                {u.active ? (
                                  <UserX className="w-3.5 h-3.5" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
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

      {/* MODAL 4 : Créer un utilisateur */}
      {userModalType === "create" && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B231B] border border-[#18392D] rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#34D399]" />
              <span>Créer un nouvel utilisateur</span>
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                  Nom complet :
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Oumar Camara"
                  value={createUserName}
                  onChange={(e) => setCreateUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#071913] border border-[#1E4D3B] text-xs text-white placeholder-[#526B63] focus:outline-none focus:border-[#34D399]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                  Email / Identifiant de connexion :
                </label>
                <input
                  type="email"
                  required
                  placeholder="oumar@entreprise.gn"
                  value={createUserLogin}
                  onChange={(e) => setCreateUserLogin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#071913] border border-[#1E4D3B] text-xs text-white placeholder-[#526B63] focus:outline-none focus:border-[#34D399]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                  Téléphone (+224) :
                </label>
                <input
                  type="tel"
                  placeholder="+224 620 00 00 00"
                  value={createUserPhone}
                  onChange={(e) => setCreateUserPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#071913] border border-[#1E4D3B] text-xs text-white placeholder-[#526B63] focus:outline-none focus:border-[#34D399]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                  Commerce / Établissement rattaché :
                </label>
                <select
                  value={createUserCompanyId}
                  onChange={(e) => setCreateUserCompanyId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#071913] border border-[#1E4D3B] text-xs text-white focus:outline-none cursor-pointer"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                  Profil &amp; Privilèges :
                </label>
                <select
                  value={createUserRole}
                  onChange={(e) => setCreateUserRole(e.target.value as LuumoRole)}
                  className="w-full px-3 py-2 rounded-xl bg-[#071913] border border-[#1E4D3B] text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="cashier">Caissier / Vendeur (Caisse &amp; Clients)</option>
                  <option value="stock_keeper">Magasinier (Inventaire &amp; Achats)</option>
                  <option value="accountant">Comptable (Factures, Dettes, Salaires)</option>
                  <option value="manager">Gérant / Propriétaire (Accès complet)</option>
                  <option value="platform_admin">Super-Admin Plateforme (Tour de contrôle)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                  Mot de passe temporaire (12+ caractères) :
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min. 12 car., Maj, Min, Chiffre, Symbole"
                  value={createUserPassword}
                  onChange={(e) => setCreateUserPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#071913] border border-[#1E4D3B] text-xs text-white placeholder-[#526B63] focus:outline-none focus:border-[#34D399]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setUserModalType(null)}
                  className="px-4 py-2 rounded-xl border border-[#18392D] text-xs text-[#8FAEA1]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 rounded-xl bg-[#0B6E4F] text-white text-xs font-bold"
                >
                  {submittingAction ? "Création..." : "Créer l'utilisateur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5 : Changer de rôle / profil */}
      {userModalType === "role" && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B231B] border border-[#18392D] rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-white">Changer le profil &amp; privilèges</h3>
            <p className="text-xs text-[#8FAEA1]">
              Utilisateur : <strong className="text-white">{selectedUser.name}</strong> ({selectedUser.login})
            </p>

            <form onSubmit={handleUpdateUserRole} className="space-y-3">
              <div className="space-y-2">
                {[
                  {
                    id: "cashier",
                    name: "Caissier / Vendeur",
                    desc: "Restreint à la caisse /pos et clients.",
                  },
                  {
                    id: "stock_keeper",
                    name: "Magasinier",
                    desc: "Restreint à l'inventaire /products et achats.",
                  },
                  {
                    id: "accountant",
                    name: "Comptable",
                    desc: "Accès factures, dettes, RH et bilan.",
                  },
                  {
                    id: "manager",
                    name: "Gérant / Propriétaire",
                    desc: "Accès complet aux applications de la boutique.",
                  },
                  {
                    id: "platform_admin",
                    name: "Super-Admin Plateforme",
                    desc: "Accès exclusif au Backoffice Plateforme (/admin).",
                  },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setUpdateRole(r.id as LuumoRole)}
                    className={`w-full p-2.5 rounded-xl text-left border transition ${
                      updateRole === r.id
                        ? "bg-[#0B6E4F] border-[#34D399] text-white"
                        : "border-[#1E4D3B] text-[#708F83] hover:text-white"
                    }`}
                  >
                    <div className="text-xs font-bold">{r.name}</div>
                    <div className="text-[10px] text-[#A7F3D0]/80">{r.desc}</div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setUserModalType(null);
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
                  {submittingAction ? "Mise à jour..." : "Enregistrer le profil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6 : Réinitialiser mot de passe */}
      {userModalType === "password" && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B231B] border border-[#18392D] rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#F3BC33]" />
              <span>Réinitialiser le mot de passe</span>
            </h3>
            <p className="text-xs text-[#8FAEA1]">
              Utilisateur : <strong className="text-white">{selectedUser.name}</strong> ({selectedUser.login})
            </p>

            <form onSubmit={handleResetUserPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                  Nouveau mot de passe (min. 12 car.) :
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min. 12 car., Maj, Min, Chiffre, Symbole"
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#071913] border border-[#1E4D3B] text-xs text-white placeholder-[#526B63] focus:outline-none focus:border-[#34D399]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setUserModalType(null);
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
                  {submittingAction ? "Réinitialisation..." : "Valider le nouveau mot de passe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
