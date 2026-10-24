"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AppShell,
  LUUMO_APPS,
  Modal,
  type LuumoAppDefinition,
} from "@/components/ui";
import { useSession } from "@/context/session";
import { formatGNF } from "@/lib/format";
import type { BusinessPlanId, CompanyPlan } from "@/lib/types";
import {
  Store,
  Building2,
  Briefcase,
  Check,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Lock,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

const PLANS_CONFIG: Record<BusinessPlanId, CompanyPlan> = {
  retail: {
    id: "retail",
    name: "Forfait Boutique & Caisse",
    allowed_apps: ["pos", "inventory", "customers", "dashboard"],
    monthly_price: 150000,
    description: "Commerce de détail, supérettes, pharmacies et quincailleries.",
    badge: "Starter",
  },
  services: {
    id: "services",
    name: "Forfait Pro Services & B2B",
    allowed_apps: ["orders", "customers", "hr", "dashboard"],
    monthly_price: 250000,
    description: "Prestataires, cabinets, transitaires et agences de service.",
    badge: "Pro B2B",
  },
  wholesale: {
    id: "wholesale",
    name: "Forfait Grossiste & Entreprise",
    allowed_apps: [
      "pos",
      "orders",
      "dashboard",
      "inventory",
      "purchases",
      "customers",
      "hr",
      "fleet",
    ],
    monthly_price: 450000,
    description: "Suite complète 360° avec livraisons, camions, achats import et RH.",
    badge: "Illimité 360°",
  },
};

export default function AppsManagerPage() {
  const { session, updateEnabledApps, upgradePlan } = useSession();
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal de surclassement
  const [upgradeTarget, setUpgradeTarget] = useState<CompanyPlan | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const currentPlan: CompanyPlan =
    session?.user?.company?.plan ?? PLANS_CONFIG.wholesale;

  const allowedApps = currentPlan.allowed_apps;

  const enabledApps = (
    session?.user?.company?.enabled_apps ?? allowedApps
  ).filter((id) => allowedApps.includes(id));

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
          : "Application activée sur votre écran d'accueil."
      );
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // Ignoré
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmUpgrade = async () => {
    if (!upgradeTarget) return;
    setUpgrading(true);
    setSuccessMsg(null);
    try {
      await upgradePlan(upgradeTarget.id);
      setSuccessMsg(
        `Félicitations ! Vous êtes passé au « ${upgradeTarget.name} ». Toutes les applications associées sont débloquées.`
      );
      setUpgradeTarget(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch {
      // Ignoré
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <AppShell
      title="Mon Forfait & Mes Applications"
      subtitle="Gérez les applications incluses dans votre formule et découvrez les fonctionnalités pour développer votre activité."
      actions={
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#F3BC33]" />
          <span>Voir mon accueil</span>
        </Link>
      }
    >
      <div className="space-y-8 max-w-5xl">
        {successMsg && (
          <div className="p-4 rounded-xl bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] text-sm font-medium flex items-center gap-3">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Carte Forfait Actif */}
        <div className="rounded-[22px] bg-gradient-to-br from-[#0B2920] to-[#143D31] text-white p-6 sm:p-7 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-0.5 rounded-full bg-[#F3BC33] text-[#0B2920] font-heading text-xs font-bold uppercase tracking-wider">
                  {currentPlan.badge ?? "Forfait Actif"}
                </span>
                <span className="text-xs text-emerald-200">
                  {session?.user?.company?.name}
                </span>
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-white">
                {currentPlan.name}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl">
                {currentPlan.description}
              </p>
            </div>

            <div className="sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
              <div className="text-[11px] uppercase tracking-wider text-emerald-200/70 font-semibold">
                Tarif Forfait
              </div>
              <div className="font-heading text-2xl font-bold text-[#F3BC33] tabular-nums">
                {formatGNF(currentPlan.monthly_price)}
                <span className="text-xs text-emerald-100/70 font-normal"> /mois</span>
              </div>
              <div className="text-xs text-emerald-200/90 mt-1 flex items-center sm:justify-end gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#F3BC33]" />
                <span>{allowedApps.length} applications incluses</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1 : Applications incluses dans votre forfait */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-base font-bold text-[#0B2920] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#115040]" />
              <span>Applications incluses dans votre forfait ({allowedApps.length})</span>
            </h3>
            <span className="text-xs text-[#526B63]">
              Activez ou masquez les icônes sur votre écran d&apos;accueil
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LUUMO_APPS.filter((app) => allowedApps.includes(app.id)).map(
              (app: LuumoAppDefinition) => {
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
                          <h4 className="font-heading text-sm font-bold text-[#0B2920]">
                            {app.name}
                          </h4>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#EEF3F1] text-[#115040]">
                            Inclus
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
                              ? "Masquer de mon écran d'accueil"
                              : "Afficher sur mon écran d'accueil"
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
              }
            )}
          </div>
        </div>

        {/* Section 2 : Applications verrouillées (Forfaits supérieurs / Paywall) */}
        {LUUMO_APPS.filter((app) => !allowedApps.includes(app.id)).length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-[#0B2920] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#C87A00]" />
                <span>Modules disponibles en option supérieure</span>
              </h3>
              <span className="text-xs text-[#526B63]">
                Passez au forfait adapté pour débloquer ces outils
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LUUMO_APPS.filter((app) => !allowedApps.includes(app.id)).map(
                (app: LuumoAppDefinition) => {
                  const Icon = app.icon;

                  // Identifier le forfait qui débloque cette app
                  const requiredPlanId: BusinessPlanId =
                    app.id === "fleet" || app.id === "purchases"
                      ? "wholesale"
                      : app.id === "orders" || app.id === "hr"
                        ? "services"
                        : "wholesale";
                  const targetPlan = PLANS_CONFIG[requiredPlanId];

                  return (
                    <div
                      key={app.id}
                      className="rounded-2xl border border-[#F3BC33]/30 bg-[#FEFBF2] p-4.5 flex items-start justify-between gap-4 transition-all hover:border-[#F3BC33]"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${app.iconBg} ${app.iconColor} opacity-90`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-heading text-sm font-bold text-[#0B2920]">
                              {app.name}
                            </h4>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FFF3D6] text-[#8F5E00] border border-[#F3BC33]/40">
                              <Lock className="w-2.5 h-2.5" />
                              <span>{targetPlan.badge}</span>
                            </span>
                          </div>
                          <p className="text-xs text-[#526B63] mt-1 leading-relaxed">
                            {app.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 pt-1">
                        <button
                          type="button"
                          onClick={() => setUpgradeTarget(targetPlan)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0B2920] hover:bg-[#115040] text-[#F3BC33] text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          <span>Débloquer</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* Section 3 : Tableau comparatif des 3 forfaits */}
        <div className="space-y-4 pt-4 border-t border-[#DCE5E1]">
          <h3 className="font-heading text-base font-bold text-[#0B2920] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F3BC33]" />
            <span>Tous les Forfaits Luumo disponibles</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.values(PLANS_CONFIG) as CompanyPlan[]).map((p) => {
              const isCurrent = p.id === currentPlan.id;

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                    isCurrent
                      ? "border-[#115040] bg-[#E8F2EE]/50 shadow-sm ring-1 ring-[#115040]"
                      : "border-[#DCE5E1] bg-white hover:border-[#115040]/40"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#115040]/10 text-[#115040]">
                        {p.badge}
                      </span>
                      {isCurrent && (
                        <span className="text-[11px] font-bold text-[#115040] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Actuel
                        </span>
                      )}
                    </div>

                    <h4 className="font-heading text-sm font-bold text-[#0B2920]">
                      {p.name}
                    </h4>
                    <p className="text-[11px] text-[#526B63] leading-snug">
                      {p.description}
                    </p>

                    <div className="pt-2 font-heading text-lg font-bold text-[#0B2920] tabular-nums">
                      {formatGNF(p.monthly_price)}
                      <span className="text-xs font-normal text-[#526B63]"> /mois</span>
                    </div>

                    <div className="pt-2 border-t border-[#EEF3F1] space-y-1.5">
                      <div className="text-[11px] font-semibold text-[#115040]">
                        {p.allowed_apps.length} modules inclus :
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.allowed_apps.map((appId) => {
                          const appDef = LUUMO_APPS.find((a) => a.id === appId);
                          return (
                            <span
                              key={appId}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#DCE5E1] text-[#0B2920]"
                            >
                              {appDef?.shortName ?? appId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    {isCurrent ? (
                      <div className="w-full py-2 rounded-xl bg-[#115040]/10 text-[#115040] text-xs font-bold text-center">
                        Forfait Actif
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setUpgradeTarget(p)}
                        className="w-full py-2 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        Passer à ce forfait
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Surclassement Forfait */}
      <Modal
        open={upgradeTarget !== null}
        onClose={() => setUpgradeTarget(null)}
        title={
          upgradeTarget
            ? `Passer au ${upgradeTarget.name}`
            : "Changer de forfait"
        }
      >
        {upgradeTarget && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FEFBF2] border border-[#F3BC33]/40 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#8F5E00]">
                  {upgradeTarget.name}
                </span>
                <span className="font-heading text-sm font-bold text-[#0B2920]">
                  {formatGNF(upgradeTarget.monthly_price)} /mois
                </span>
              </div>
              <p className="text-[#526B63]">{upgradeTarget.description}</p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#0B2920]">
                Applications débloquées immédiatement :
              </div>
              <div className="grid grid-cols-2 gap-2">
                {upgradeTarget.allowed_apps.map((appId) => {
                  const appDef = LUUMO_APPS.find((a) => a.id === appId);
                  const isNew = !allowedApps.includes(appId);
                  return (
                    <div
                      key={appId}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        isNew
                          ? "border-[#115040] bg-[#E8F2EE] font-semibold text-[#115040]"
                          : "border-[#DCE5E1] bg-[#F7F9F8] text-[#526B63]"
                      }`}
                    >
                      <span>{appDef?.name ?? appId}</span>
                      {isNew && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#115040] text-[#F3BC33]">
                          NOUVEAU
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#EEF3F1] text-xs text-[#115040] flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0 text-[#F3BC33]" />
              <span>
                Activation instantanée sans interruption de service ni migration technique.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUpgradeTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-[#DCE5E1] text-xs font-semibold text-[#526B63] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={upgrading}
                onClick={handleConfirmUpgrade}
                className="px-5 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-bold cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 shadow-xs"
              >
                {upgrading ? (
                  "Activation en cours..."
                ) : (
                  <>
                    <span>Confirmer le surclassement</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#F3BC33]" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
