"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AppShell,
  LUUMO_APPS,
  type LuumoAppDefinition,
} from "@/components/ui";
import { useSession } from "@/context/session";
import {
  Store,
  Building2,
  Briefcase,
  Check,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Info,
} from "lucide-react";

const PROFILES = [
  {
    id: "retail",
    label: "Boutique & Caisse",
    subtitle: "Détail, superette, pharmacie, quincaillerie",
    icon: Store,
    apps: ["pos", "inventory", "customers", "dashboard"],
  },
  {
    id: "wholesale",
    label: "Grossiste & Import",
    subtitle: "Madina, dépôt, matériaux, camions",
    icon: Building2,
    apps: [
      "pos",
      "orders",
      "dashboard",
      "inventory",
      "purchases",
      "customers",
      "hr",
      "fleet",
    ],
  },
  {
    id: "services",
    label: "Prestations & B2B",
    subtitle: "Services, agence, transit, atelier",
    icon: Briefcase,
    apps: ["orders", "customers", "hr", "dashboard"],
  },
];

export default function AppsManagerPage() {
  const { session, updateEnabledApps } = useSession();
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const enabledApps =
    session?.user?.company?.enabled_apps ?? LUUMO_APPS.map((a) => a.id);

  const handleToggle = async (appId: string) => {
    if (appId === "dashboard") return; // Dashboard toujours actif

    const isCurrentlyActive = enabledApps.includes(appId);
    let next: string[];
    if (isCurrentlyActive) {
      next = enabledApps.filter((id) => id !== appId);
    } else {
      next = [...enabledApps, appId];
    }
    if (!next.includes("dashboard")) next.push("dashboard");

    setSaving(true);
    setSuccessMsg(null);
    try {
      await updateEnabledApps(next);
      setSuccessMsg(
        isCurrentlyActive
          ? "Application masquée de votre écran d'accueil."
          : "Application activée et ajoutée à votre écran d'accueil."
      );
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // Ignoré ou affiché
    } finally {
      setSaving(false);
    }
  };

  const handleApplyProfile = async (apps: string[]) => {
    setSaving(true);
    setSuccessMsg(null);
    try {
      await updateEnabledApps(apps);
      setSuccessMsg("Profil appliqué avec succès !");
      setTimeout(() => setSuccessMsg(null), 3500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Mes Applications"
      subtitle="Activez ou masquez les applications selon les activités réelles de votre entreprise. Vos données restent conservées à 100%."
      actions={
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#F3BC33]" />
          <span>Retour à l&apos;accueil</span>
        </Link>
      }
    >
      <div className="space-y-6 max-w-5xl">
        {successMsg && (
          <div className="p-4 rounded-xl bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] text-sm font-medium flex items-center gap-3">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Encadré pédagogique */}
        <div className="p-4 rounded-2xl bg-[#F6F8F7] border border-[#DCE5E1] flex items-start gap-3.5">
          <Info className="w-5 h-5 text-[#115040] shrink-0 mt-0.5" />
          <div className="text-xs text-[#526B63] space-y-1">
            <strong className="text-[#0B2920] block font-semibold">
              Comment fonctionne la personnalisation modulaire ?
            </strong>
            <p>
              Désactiver une application la masque simplement de votre écran d&apos;accueil
              pour garder une interface propre et rapide. Vos données ne sont jamais supprimées.
              Si votre activité évolue (achat d&apos;un camion, recrutement d&apos;employés),
              vous pouvez réactiver le module en 1 clic sans aucune migration technique.
            </p>
          </div>
        </div>

        {/* Niveau 1 : Raccourcis de profils métiers */}
        <div className="space-y-3">
          <h2 className="font-heading text-sm font-bold text-[#0B2920] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F3BC33]" />
            <span>Préréglages par métier (1 clic)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROFILES.map((p) => {
              const Icon = p.icon;
              const isMatch =
                p.apps.length === enabledApps.length &&
                p.apps.every((id) => enabledApps.includes(id));

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={saving}
                  onClick={() => handleApplyProfile(p.apps)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer disabled:opacity-60 ${
                    isMatch
                      ? "border-[#115040] bg-[#E8F2EE] shadow-xs"
                      : "border-[#DCE5E1] bg-white hover:border-[#115040]/40 hover:bg-[#F7F9F8]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-white border border-[#DCE5E1] flex items-center justify-center text-[#115040]">
                      <Icon className="w-4 h-4" />
                    </div>
                    {isMatch && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#115040] bg-white px-2 py-0.5 rounded-full border border-[#115040]/20">
                        <CheckCircle2 className="w-3 h-3 text-[#115040]" />
                        Actif
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-[#0B2920]">{p.label}</h3>
                  <p className="text-[11px] text-[#526B63] mt-0.5 leading-snug">
                    {p.subtitle}
                  </p>
                  <div className="mt-3 text-[10px] font-semibold text-[#115040] uppercase tracking-wider">
                    {p.apps.length} modules inclus
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Niveau 2 : Grille détaillée des 8 applications avec interrupteurs */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold text-[#0B2920]">
              Applications Luumo disponibles ({enabledApps.length} activée{enabledApps.length > 1 ? "s" : ""})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LUUMO_APPS.map((app: LuumoAppDefinition) => {
              const Icon = app.icon;
              const isEnabled = enabledApps.includes(app.id);
              const isLocked = app.id === "dashboard";

              return (
                <div
                  key={app.id}
                  className={`rounded-2xl border p-4.5 transition-all flex items-start justify-between gap-4 ${
                    isEnabled
                      ? "bg-white border-[#DCE5E1] card-shadow"
                      : "bg-[#F7F9F8] border-[#E5ECE9] opacity-75"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${app.iconBg} ${app.iconColor}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading text-sm font-bold text-[#0B2920]">
                          {app.name}
                        </h3>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#EEF3F1] text-[#115040]">
                          {app.guineaUseCase}
                        </span>
                      </div>
                      <p className="text-xs text-[#526B63] mt-1 line-clamp-2 leading-relaxed">
                        {app.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    {isLocked ? (
                      <span className="text-[11px] font-bold text-[#526B63] bg-[#EEF3F1] px-2.5 py-1 rounded-lg">
                        Toujours actif
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleToggle(app.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isEnabled ? "bg-[#115040]" : "bg-[#DCE5E1]"
                        }`}
                        title={
                          isEnabled
                            ? "Cliquer pour masquer cette application de l'accueil"
                            : "Cliquer pour activer cette application sur l'accueil"
                        }
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
