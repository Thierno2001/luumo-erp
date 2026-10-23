"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LogOut, Search, Sparkles, Store } from "lucide-react";
import { BrandAccentBar, LUUMO_APPS, LuumoLogo } from "@/components/ui";
import { useSession } from "@/context/session";

/**
 * Écran d'accueil pur (App Switcher) façon Odoo :
 * - S'affiche immédiatement après la connexion (/login -> /).
 * - Ne contient AUCUNE barre latérale ni tableau complexe.
 * - Son unique rôle est de permettre de sélectionner l'application métier à ouvrir.
 */
export default function HomeAppSwitcherPage() {
  const { session, logout } = useSession();
  const [query, setQuery] = useState("");

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B2920]">
        <div className="w-8 h-8 rounded-full border-3 border-[#F3BC33] border-t-transparent animate-spin" />
      </div>
    );
  }

  const filteredApps = LUUMO_APPS.filter(
    (app) =>
      app.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      app.guineaUseCase.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div
      className="min-h-screen flex flex-col justify-between bg-[#0B2920] text-white relative overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(rgba(243, 188, 51, 0.14) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <BrandAccentBar className="h-1" />

      {/* Barre supérieure minimaliste (Logo à gauche, Boutique & Utilisateur à droite) */}
      <header className="w-full max-w-6xl mx-auto px-6 pt-5 pb-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LuumoLogo variant="light-text" height={34} />
        </div>

        <div className="flex items-center gap-3">
          {session.mode === "demo" && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3BC33]/15 border border-[#F3BC33]/40 text-[#F3BC33] text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mode Démo</span>
            </span>
          )}

          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs text-emerald-50">
            <Store className="w-3.5 h-3.5 text-[#F3BC33]" />
            <span className="font-medium">{session.user.company.name}</span>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Se déconnecter"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-emerald-100 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* Grille centrale d'applications (et uniquement les applications, comme sur Odoo) */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
          {/* Barre de recherche discrète d'application */}
          <div className="w-full max-w-sm mb-12 relative">
            <Search className="w-4 h-4 text-emerald-200/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une application..."
              aria-label="Rechercher une application"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-sm text-white placeholder:text-emerald-100/50 focus:outline-none focus:border-[#F3BC33] focus:bg-white/15 transition-all"
            />
          </div>

          {/* Grille d'icônes façon Odoo Home Menu */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-10 sm:gap-x-12 sm:gap-y-12 justify-items-center w-full">
            {filteredApps.map((app) => {
              const Icon = app.icon;
              return (
                <Link
                  key={app.id}
                  href={app.href}
                  className="group flex flex-col items-center text-center w-32 sm:w-36 focus:outline-none cursor-pointer"
                >
                  {/* Carré d'icône d'application */}
                  <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-[22px] bg-[#143D31] border border-white/12 group-hover:border-[#F3BC33] group-hover:bg-[#194B3C] group-hover:-translate-y-1.5 transition-all duration-200 shadow-lg flex items-center justify-center relative">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${app.iconBg} ${app.iconColor} shadow-xs`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Nom de l'application */}
                  <span className="mt-3 font-heading text-sm font-semibold text-white group-hover:text-[#F3BC33] transition-colors">
                    {app.shortName}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      {/* Pied de page discret */}
      <footer className="w-full text-center py-4 text-[11px] text-emerald-200/50">
        {session.user.name} • Devise {session.currency.symbol} • Plan comptable SYSCOHADA Guinée
      </footer>
    </div>
  );
}
