"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Receipt,
  LogOut,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Sparkles,
  Store,
  LayoutGrid,
  Ship,
  Briefcase,
  Truck,
  ArrowUpRight,
  Wifi,
  WifiOff,
  SlidersHorizontal,
  CreditCard,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { useSession } from "@/context/session";
import { useOfflineSync } from "@/lib/offline-sync";
import type { PaymentState } from "@/lib/types";

/**
 * Filet d'accent inspiré de l'onde dorée/ambrée du "L" et du vert pin "#115040" du logo LUUMO.
 */
export function BrandAccentBar({ className = "h-[3px]" }: { className?: string }) {
  return <div className={`w-full luumo-brand-bar ${className}`} aria-hidden="true" />;
}

/** Alias de compatibilité */
export const TricolorBar = BrandAccentBar;

/**
 * Logo officiel LUUMO (extrait du fichier fourni par l'utilisateur).
 */
export function LuumoLogo({
  variant = "dark-text",
  height = 34,
}: {
  variant?: "dark-text" | "light-text";
  height?: number;
}) {
  const src = variant === "light-text" ? "/luumo-logo-white.png" : "/luumo-logo.png";
  const width = Math.round(height * (807 / 211));
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="LUUMO"
      width={width}
      height={height}
      style={{ height: `${height}px`, width: "auto" }}
      className="select-none object-contain"
    />
  );
}

/**
 * Définition des 8 Applications Essentielles de Luumo (Architecture Odoo 360°).
 * L'écran d'accueil ("/") affiche uniquement la grille de ces icônes.
 * Cliquer sur une icône ouvre l'application et charge ses sous-menus dans l'unique barre supérieure.
 */
export interface LuumoAppSubMenu {
  label: string;
  href: string;
}

export interface LuumoAppDefinition {
  id: string;
  name: string;
  shortName: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  guineaUseCase: string;
  odooModules: string[];
  iconBg: string;
  iconColor: string;
  subMenus: LuumoAppSubMenu[];
}

export const LUUMO_APPS: LuumoAppDefinition[] = [
  {
    id: "pos",
    name: "Point de Vente",
    shortName: "Point de Vente",
    href: "/pos",
    icon: ShoppingBag,
    description: "Encaissement comptoir : Espèces GNF, Orange Money, MTN MoMo, Virement ou Crédit.",
    guineaUseCase: "Caisse boutique & demi-gros",
    odooModules: ["sale_management", "stock", "account"],
    iconBg: "bg-[#FEF6DF] border-[#F3BC33]/50",
    iconColor: "text-[#8F5E00]",
    subMenus: [
      { label: "Terminal de Caisse", href: "/pos" },
      { label: "Commandes & Tickets", href: "/orders" },
    ],
  },
  {
    id: "orders",
    name: "Ventes",
    shortName: "Ventes",
    href: "/orders",
    icon: Receipt,
    description: "Devis, factures proforma, bons de commande confirmés et suivi des règlements.",
    guineaUseCase: "Facturation clients, chantiers & grossistes",
    odooModules: ["sale_management", "sale_margin", "account"],
    iconBg: "bg-[#E8F2EE] border-[#115040]/20",
    iconColor: "text-[#115040]",
    subMenus: [
      { label: "Commandes & Factures", href: "/orders" },
      { label: "Clients", href: "/customers" },
    ],
  },
  {
    id: "dashboard",
    name: "Tableaux de bord",
    shortName: "Tableaux de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Indicateurs clés en temps réel : chiffre d'affaires, créances et alertes de stock.",
    guineaUseCase: "Pilotage quotidien du gérant",
    odooModules: ["base", "sale", "account", "stock"],
    iconBg: "bg-[#115040] border-[#0B382C]",
    iconColor: "text-[#F3BC33]",
    subMenus: [
      { label: "Vue d'ensemble", href: "/dashboard" },
    ],
  },
  {
    id: "inventory",
    name: "Inventaire",
    shortName: "Inventaire",
    href: "/products",
    icon: Package,
    description: "Catalogue d'articles, niveaux de stock, seuils d'alerte et ajustement d'inventaire.",
    guineaUseCase: "Gestion magasin & dépôt",
    odooModules: ["stock", "product", "sale_stock"],
    iconBg: "bg-[#E8F2EE] border-[#115040]/20",
    iconColor: "text-[#115040]",
    subMenus: [
      { label: "Articles & Stock", href: "/products" },
      { label: "Réceptions d'achats", href: "/purchases" },
    ],
  },
  {
    id: "purchases",
    name: "Achats",
    shortName: "Achats",
    href: "/purchases",
    icon: Ship,
    description: "Commandes fournisseurs et réception au dépôt en 1 clic avec entrée en stock automatique.",
    guineaUseCase: "Importations Port de Conakry & usines",
    odooModules: ["purchase", "purchase_stock", "stock"],
    iconBg: "bg-[#FEF6DF] border-[#F3BC33]/50",
    iconColor: "text-[#8F5E00]",
    subMenus: [
      { label: "Bons de commande", href: "/purchases" },
      { label: "Stock disponible", href: "/products" },
    ],
  },
  {
    id: "customers",
    name: "Clients & Dettes",
    shortName: "Clients & Dettes",
    href: "/customers",
    icon: Users,
    description: "Répertoire clients (+224), carnet de dettes et encaissement de remboursements partiels.",
    guineaUseCase: "Suivi des crédits clients SYSCOHADA",
    odooModules: ["contacts", "account", "l10n_gn"],
    iconBg: "bg-[#FFEDD5] border-[#EA580C]/30",
    iconColor: "text-[#C2410C]",
    subMenus: [
      { label: "Carnet de créances", href: "/customers" },
      { label: "Factures clients", href: "/orders" },
    ],
  },
  {
    id: "hr",
    name: "Employés & Frais",
    shortName: "Employés & Frais",
    href: "/hr",
    icon: Briefcase,
    description: "Équipe de la boutique et dépenses d'exploitation : gasoil groupe électrogène, dockers, EDG.",
    guineaUseCase: "Salaires & charges opérationnelles",
    odooModules: ["hr", "hr_expense", "account"],
    iconBg: "bg-[#E8F2EE] border-[#115040]/20",
    iconColor: "text-[#115040]",
    subMenus: [
      { label: "Dépenses & Équipe", href: "/hr" },
    ],
  },
  {
    id: "fleet",
    name: "Flotte",
    shortName: "Flotte",
    href: "/fleet",
    icon: Truck,
    description: "Parc de camions, tricycles « bombonnes », fourgonnettes, chauffeurs et budget carburant.",
    guineaUseCase: "Livraisons Conakry & intérieur",
    odooModules: ["fleet", "stock"],
    iconBg: "bg-[#EEF3F1] border-[#DCE5E1]",
    iconColor: "text-[#0B2920]",
    subMenus: [
      { label: "Véhicules & Chauffeurs", href: "/fleet" },
    ],
  },
];

export function getActiveApp(pathname: string | null): LuumoAppDefinition {
  if (!pathname) return LUUMO_APPS[2];
  if (pathname.startsWith("/apps")) {
    return {
      id: "apps",
      name: "Abonnement & Facturation",
      shortName: "Abonnement",
      href: "/apps",
      icon: CreditCard,
      description: "Suivi de votre forfait, règlement Mobile Money et factures acquittées",
      guineaUseCase: "Facturation SaaS",
      odooModules: [],
      iconBg: "bg-[#115040] border-[#0B382C]",
      iconColor: "text-[#F3BC33]",
      subMenus: [{ label: "Mon Abonnement & Factures", href: "/apps" }],
    };
  }
  const found = LUUMO_APPS.find((app) => pathname.startsWith(app.href));
  return found ?? LUUMO_APPS[2];
}

/**
 * Smart Button inspiré d'Odoo (`oe_stat_button`) : permet de naviguer en 1 clic
 * d'un enregistrement vers l'application liée.
 */
export function SmartButton({
  href,
  label,
  value,
  icon,
}: {
  href: string;
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-[#DCE5E1] hover:border-[#115040] hover:bg-[#E8F2EE]/40 transition-all cursor-pointer group"
    >
      <div className="w-8 h-8 rounded-lg bg-[#E8F2EE] text-[#115040] flex items-center justify-center shrink-0 group-hover:bg-[#115040] group-hover:text-[#F3BC33] transition-colors">
        {icon}
      </div>
      <div className="text-left leading-tight">
        <div className="font-heading text-sm font-bold text-[#0B2920] tabular-nums flex items-center gap-1">
          <span>{value}</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#526B63] group-hover:text-[#115040]" />
        </div>
        <div className="text-[11px] font-medium text-[#526B63]">{label}</div>
      </div>
    </Link>
  );
}

type BadgeVariant = "success" | "warning" | "danger" | "neutral";

export function StatusBadge({
  variant,
  label,
  icon,
}: {
  variant: BadgeVariant;
  label: string;
  icon?: React.ReactNode;
}) {
  const styles: Record<BadgeVariant, string> = {
    success: "bg-[#E8F2EE] text-[#115040] border-[#115040]/20",
    warning: "bg-[#FEF6DF] text-[#8F5E00] border-[#F3BC33]/50",
    danger: "bg-[#FFEDD5] text-[#C2410C] border-[#EA580C]/30",
    neutral: "bg-[#EEF3F1] text-[#526B63] border-[#DCE5E1]",
  };
  const defaultIcons: Record<BadgeVariant, React.ReactNode> = {
    success: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    warning: <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    danger: <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    neutral: null,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-medium border whitespace-nowrap ${styles[variant]}`}
    >
      {icon ?? defaultIcons[variant]}
      <span>{label}</span>
    </span>
  );
}

export function PaymentStateBadge({ state }: { state: PaymentState }) {
  switch (state) {
    case "paid":
    case "in_payment":
      return <StatusBadge variant="success" label="Payé" />;
    case "partial":
      return <StatusBadge variant="warning" label="Partiel" />;
    case "not_paid":
      return <StatusBadge variant="danger" label="À crédit (Carnet)" />;
    default:
      return <StatusBadge variant="neutral" label="Non facturé" />;
  }
}

export function StockBadge({ qty }: { qty: number | null }) {
  if (qty === null) return <StatusBadge variant="neutral" label="Service" />;
  if (qty <= 0) return <StatusBadge variant="danger" label="Rupture (0)" />;
  if (qty < 5) return <StatusBadge variant="warning" label={`Stock bas (${qty})`} />;
  return <StatusBadge variant="success" label={`${qty} en stock`} />;
}

export function KpiCard({
  label,
  value,
  sublabel,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ReactNode;
  tone?: "default" | "gold" | "danger" | "ink";
}) {
  if (tone === "ink") {
    return (
      <div className="rounded-[16px] bg-[#115040] text-white p-5 card-shadow border border-[#0B382C] flex flex-col justify-between relative overflow-hidden">
        <div
          className="w-24 h-24 rounded-full bg-[#F3BC33]/15 blur-xl absolute -right-6 -top-6 pointer-events-none"
          aria-hidden="true"
        />
        <div className="flex items-center justify-between gap-3 relative z-10">
          <span className="text-xs uppercase tracking-wider text-emerald-100/85 font-medium">
            {label}
          </span>
          <div className="w-9 h-9 rounded-xl bg-white/10 text-[#F3BC33] flex items-center justify-center shrink-0">
            {icon}
          </div>
        </div>
        <div className="mt-3 relative z-10">
          <div className="font-heading text-2xl sm:text-[28px] font-bold tabular-nums tracking-tight text-white">
            {value}
          </div>
          {sublabel && <p className="text-xs text-emerald-100/80 mt-1">{sublabel}</p>}
        </div>
      </div>
    );
  }

  const iconStyles =
    tone === "danger"
      ? "bg-[#FFEDD5] text-[#C2410C]"
      : tone === "gold"
        ? "bg-[#FEF6DF] text-[#8F5E00]"
        : "bg-[#E8F2EE] text-[#115040]";

  return (
    <div className="rounded-[16px] bg-white p-5 card-shadow border border-[#DCE5E1] flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-[#526B63] font-medium">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconStyles}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="font-heading text-2xl sm:text-[28px] font-bold tabular-nums tracking-tight text-[#0B2920]">
          {value}
        </div>
        {sublabel && <p className="text-xs text-[#526B63] mt-1">{sublabel}</p>}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B382C]/60 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`bg-white rounded-[18px] border border-[#DCE5E1] card-shadow w-full ${maxWidth} overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
      >
        <BrandAccentBar />
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE5E1]">
          <h2 id="modal-title" className="font-heading text-lg font-bold text-[#0B2920]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="p-1.5 rounded-lg text-[#526B63] hover:text-[#0B2920] hover:bg-[#EEF3F1] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115040]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[14px] bg-[#FFEDD5] border border-[#EA580C]/30 p-4 flex items-center justify-between gap-4 text-[#C2410C]">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#C2410C] text-xs font-semibold border border-[#EA580C]/20 hover:bg-[#FFEDD5]/50 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Réessayer
        </button>
      )}
    </div>
  );
}

/**
 * Badge de connectivité et de synchronisation pour le mode Hybride B2B
 */
export function NetworkSyncBadge() {
  const { isOnline, pendingCount, isSyncing, triggerSync, clearPending } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return (
      <span
        title="Connecté au serveur Luumo (Toutes les ventes sont synchronisées)"
        className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-100 text-[11px] font-medium border border-emerald-400/30"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="hidden xl:inline">En ligne</span>
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => triggerSync()}
        disabled={isSyncing}
        title={
          !isOnline
            ? `Mode Hors-Ligne actif : ${pendingCount} vente(s) enregistrée(s) localement`
            : `${pendingCount} vente(s) hors-ligne prêtes à être synchronisées. Cliquez pour synchroniser maintenant.`
        }
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FEF6DF] text-[#8F5E00] hover:bg-[#F3BC33] hover:text-[#0B2920] text-[11px] font-semibold border border-[#F3BC33]/60 transition-all cursor-pointer shadow-sm animate-pulse"
      >
        {!isOnline ? (
          <WifiOff className="w-3.5 h-3.5 text-[#C2410C]" />
        ) : (
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
        )}
        <span>
          {isSyncing
            ? "Synchronisation..."
            : !isOnline
              ? `Hors-ligne (${pendingCount})`
              : `Sync (${pendingCount})`}
        </span>
      </button>
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Voulez-vous réinitialiser et vider la file locale d'attente ?")) {
              clearPending();
            }
          }}
          title="Vider la file d'attente locale"
          className="p-1 text-slate-300 hover:text-red-300 hover:bg-white/10 rounded transition-colors text-xs cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Coquille d'application (AppShell) épurée façon Odoo WebClient :
 * - AUCUNE barre latérale gauche encombrante.
 * - Une seule barre supérieure (NavBar) avec :
 *   1. Le bouton `[☷]` (retour immédiat à l'écran d'accueil `/` des applications).
 *   2. Le nom de l'application active (ex. "Inventaire").
 *   3. Les sous-menus appartenant uniquement à cette application.
 *   4. La boutique active et le profil à droite.
 */
export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { session, logout } = useSession();
  const pathname = usePathname();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9F8]">
        <div className="w-8 h-8 rounded-full border-3 border-[#115040] border-t-transparent animate-spin" />
      </div>
    );
  }

  // 1. Protection Super-Admin : se concentre exclusivement sur le Backoffice Plateforme
  if (session.user.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#071913] p-4">
        <div className="max-w-md w-full bg-[#0B231B] border border-[#F3BC33]/40 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#F3BC33]/20 text-[#F3BC33] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-heading text-lg font-bold text-white">Espace Super-Admin Plateforme</h2>
          <p className="text-xs text-[#8FAEA1] leading-relaxed">
            Votre compte est dédié à la gestion globale du SaaS Luumo (MRR, supervision multi-commerces, validation Mobile Money). Les applications de caisse et stock sont réservées aux commerçants.
          </p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F3BC33] text-[#071913] font-bold text-xs hover:bg-[#E5A812] transition shadow-md"
          >
            Accéder au Backoffice Plateforme →
          </Link>
        </div>
      </div>
    );
  }

  const activeApp = getActiveApp(pathname);

  // 2. Vérification des Privilèges de Rôle (RBAC) pour les utilisateurs de boutique
  const userAllowedApps = session.user.allowed_apps;
  if (
    userAllowedApps &&
    userAllowedApps.length > 0 &&
    activeApp.id !== "apps" &&
    !userAllowedApps.includes(activeApp.id)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9F8] p-4">
        <div className="max-w-md w-full bg-white border border-[#DCE5E1] rounded-2xl p-6 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#FFEDD5] text-[#C2410C] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-heading text-lg font-bold text-[#0B2920]">Privilège insuffisant</h2>
          <p className="text-xs text-[#526B63] leading-relaxed">
            Votre profil « {session.user.role_name || session.user.role || "Utilisateur"} » n&apos;a pas les privilèges requis pour accéder à l&apos;application « {activeApp.name} ».
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#115040] text-white font-bold text-xs hover:bg-[#0B382C] transition shadow-md"
          >
            Retour aux applications autorisées →
          </Link>
        </div>
      </div>
    );
  }

  const ActiveAppIcon = activeApp.icon;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9F8]">
      {/* Barre de navigation supérieure unique (façon Odoo NavBar) */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE5E1]">
        <div className="px-4 sm:px-8 h-14 bg-[#115040] text-white flex items-center justify-between gap-4">
          {/* Gauche : Bouton [☷] Écran d'accueil + Nom de l'application active + Sous-menus */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              title="Retour à l'écran d'accueil des applications"
              aria-label="Retour à l'écran d'accueil des applications"
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-[#F3BC33] text-white hover:text-[#0B2920] transition-colors shrink-0 cursor-pointer"
            >
              <LayoutGrid className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-2 pr-2 border-r border-white/20 shrink-0">
              <ActiveAppIcon className="w-4 h-4 text-[#F3BC33]" />
              <span className="font-heading text-sm sm:text-base font-bold tracking-tight text-white">
                {activeApp.name}
              </span>
            </div>

            {/* Sous-menus contextuels de l'application active uniquement */}
            <nav
              className="hidden md:flex items-center gap-1 overflow-x-auto"
              aria-label="Menus de l'application"
            >
              {activeApp.subMenus.map((sub) => {
                const isSubActive = pathname === sub.href;
                return (
                  <Link
                    key={sub.href + sub.label}
                    href={sub.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      isSubActive
                        ? "bg-white/15 text-[#F3BC33] font-semibold"
                        : "text-emerald-100/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Droite : Indicateur Réseau/Sync + Boutique + Mode Démo + Utilisateur */}
          <div className="flex items-center gap-2.5 shrink-0">
            <NetworkSyncBadge />

            {session.mode === "demo" && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FEF6DF] text-[#8F5E00] text-[11px] font-semibold">
                <Sparkles className="w-3 h-3 text-[#E8A02B]" />
                <span>Mode Démo</span>
              </span>
            )}

            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 text-xs text-emerald-50">
              <Store className="w-3.5 h-3.5 text-[#F3BC33]" />
              <span className="font-medium truncate max-w-[180px]">
                {session.user.company.name}
              </span>
            </div>

            <Link
              href="/apps"
              title="Mon Abonnement & Factures"
              aria-label="Mon Abonnement & Factures"
              className="p-2 rounded-lg text-emerald-100 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-[#F3BC33]" />
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-white/15">
              <span className="hidden sm:inline text-xs font-medium text-emerald-100">
                {session.user.name}
              </span>
              <button
                type="button"
                onClick={logout}
                title="Se déconnecter"
                aria-label="Se déconnecter"
                className="p-2 rounded-lg text-emerald-100 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* En-tête de la vue courante (Control Panel Odoo) */}
        <div className="px-4 sm:px-8 py-3.5 bg-white flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-heading text-lg sm:text-xl font-bold text-[#0B2920] truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-[#526B63] truncate mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {actions}
            </div>
          )}
        </div>
      </header>

      {/* Zone de travail principale */}
      <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1440px] w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
