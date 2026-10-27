"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { BrandAccentBar, LUUMO_APPS, LuumoLogo } from "@/components/ui";
import { AppTotemIcon } from "@/components/app-totem-icon";
import { LuumoLandingPage } from "@/components/landing-page";
import { useSession } from "@/context/session";

const APP_TAGLINES: Record<string, string> = {
  pos: "Prêt à encaisser",
  orders: "Devis & Factures",
  inventory: "Articles & Dépôt",
  customers: "Dettes & Crédits",
  purchases: "Fournisseurs & Port",
  hr: "Salaires & Équipe",
  fleet: "Véhicules & Chauffeurs",
  dashboard: "Chiffres & Bilan",
};

export default function HomeAppSwitcherPage() {
  const { session, logout, ready } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (ready && session?.user?.is_admin) {
      router.replace("/admin");
    }
  }, [ready, session, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#071913]">
        <div className="w-8 h-8 rounded-full border-3 border-[#0B6E4F] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Visiteur non connecté : affichage de la Landing Page vitrine
  if (!session) {
    return <LuumoLandingPage />;
  }

  // Le Super-Admin est réorienté vers son Backoffice exclusif
  if (session.user.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#071913]">
        <div className="w-8 h-8 rounded-full border-3 border-[#F3BC33] border-t-transparent animate-spin" />
      </div>
    );
  }

  const userRoleApps = session.user?.allowed_apps;
  const currentPlan = session.user?.company?.plan;
  const allowedApps = userRoleApps ?? currentPlan?.allowed_apps ?? LUUMO_APPS.map((a) => a.id);
  const activeApps = LUUMO_APPS.filter((app) => allowedApps.includes(app.id));

  const filteredApps = activeApps.filter(
    (app) =>
      app.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      app.guineaUseCase.toLowerCase().includes(query.trim().toLowerCase()) ||
      app.description.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F9F8] text-[#0B2920]">
      {/* Barre de marque officielle dégradée (Vert Forêt -> Or), zéro rouge-jaune-vert */}
      <BrandAccentBar className="h-1.5" />

      {/* Barre supérieure épurée sur fond blanc avec Logo officiel Luumo */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <LuumoLogo variant="dark-text" height={34} />
          <span className="text-[#DCE5E1] text-xl font-light">|</span>
          <div>
            <div className="font-heading text-sm font-bold text-[#0B2920]">
              {session.user.company.name}
            </div>
            <div className="text-[11px] text-[#526B63] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Boutique active • Guinée</span>
            </div>
          </div>
        </div>

        {/* Actions : Typographie soignée, zéro capsule/pilule étouffante */}
        <div className="flex items-center gap-5 text-xs text-[#526B63]">
          {session.mode === "demo" && (
            <span className="text-[#F3BC33] font-bold">
              ★ Mode Démo
            </span>
          )}

          {session.user.is_admin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#071913] text-[#F3BC33] font-semibold text-xs border border-[#F3BC33]/40 hover:border-[#F3BC33] shadow-xs transition-all"
              title="Accéder au Backoffice Super-Admin Plateforme"
            >
              <span>👑 Backoffice Admin</span>
            </Link>
          )}

          {session.user.company.subscription?.status === "trial" && (
            <span className="text-[#0B6E4F] font-semibold bg-[#E8F5EE] px-2.5 py-0.5 rounded-full border border-[#C6E6D5] text-[11px]">
              Essai : {session.user.company.subscription.days_remaining}j restants
            </span>
          )}

          {currentPlan && (
            <div className="flex items-center gap-1">
              <span className="text-[#115040] font-bold">
                {currentPlan.name}
              </span>
            </div>
          )}

          <span className="text-[#DCE5E1]">•</span>

          <Link
            href="/apps"
            title="Gérer mon abonnement et factures"
            className="text-[#115040] hover:text-[#0B2920] font-semibold underline underline-offset-4 decoration-[#F3BC33] transition-colors"
          >
            Abonnement
          </Link>

          <span className="text-[#DCE5E1]">•</span>

          <button
            type="button"
            onClick={logout}
            title="Se déconnecter"
            className="text-[#526B63] hover:text-[#C8102E] font-medium transition-colors cursor-pointer"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Zone centrale : Grille des applications */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* En-tête de section avec barre de recherche intégrée */}
        <div className="bg-white rounded-2xl border border-[#DCE5E1] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#0B2920]">
              Applications de votre Entreprise
            </h1>
            <p className="text-xs text-[#526B63] mt-0.5">
              Sélectionnez une application pour commencer votre travail.
            </p>
          </div>

          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une application..."
              aria-label="Rechercher une application"
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F7F9F8] border border-[#DCE5E1] text-xs text-[#0B2920] placeholder:text-[#526B63] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115040] transition-all"
            />
          </div>
        </div>

        {/* Grille des 8 Applications (Option 2 : Totems libres sans boîtes dans la boîte) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredApps.map((app) => (
            <Link
              key={app.id}
              href={app.href}
              className="group p-5 rounded-2xl border border-[#E2EBE7] bg-white hover:border-[#115040] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Icône Totem : posée directement sur la carte blanche, sans boîte emprisonnante */}
                <div className="w-14 h-14 mb-4 flex items-center justify-start group-hover:scale-105 transition-transform">
                  <AppTotemIcon appId={app.id} size={50} />
                </div>

                <h2 className="font-heading font-bold text-base text-[#0B2920] group-hover:text-[#115040] transition-colors">
                  {app.name}
                </h2>
                <p className="text-xs text-[#526B63] mt-1.5 leading-snug">
                  {app.description}
                </p>
              </div>

              {/* Ligne inférieure de statut épurée avec flèche d'accès */}
              <div className="pt-4 mt-4 border-t border-[#EEF3F1] flex items-center justify-between text-[11px]">
                <span className="text-[#526B63] font-medium">
                  {APP_TAGLINES[app.id] ?? "Accéder"}
                </span>
                <span className="text-[#115040] font-bold group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {filteredApps.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#DCE5E1] p-12 text-center space-y-2">
            <p className="font-heading text-sm font-semibold text-[#0B2920]">
              Aucune application ne correspond à &quot;{query}&quot;
            </p>
            <p className="text-xs text-[#526B63]">
              Vérifiez l&apos;orthographe ou effacez la recherche pour réafficher toutes vos applications.
            </p>
          </div>
        )}
      </main>

      {/* Pied de page discret */}
      <footer className="w-full text-center py-4 text-xs text-[#526B63] border-t border-[#E5EBE8] bg-white/50">
        Luumo ERP Guinée • Devise {session.currency.symbol} • Plan comptable SYSCOHADA
      </footer>
    </div>
  );
}
