"use client";

import React, { useState } from "react";
import { useSession } from "@/context/session";
import { BrandAccentBar, LuumoLogo } from "@/components/ui";
import { formatGNF } from "@/lib/format";
import type { BusinessPlanId, CompanyPlan } from "@/lib/types";
import {
  Lock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Calendar,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export function TrialExpiredBlocker() {
  const { session, isTrialExpired, subscription, paySubscription, upgradePlan, logout } =
    useSession();

  const [provider, setProvider] = useState<"orange_money" | "mtn_momo">("orange_money");
  const [phone, setPhone] = useState("+224 620 00 00 00");
  const [months, setMonths] = useState<number>(1);
  const [selectedPlanId, setSelectedPlanId] = useState<BusinessPlanId>(
    (session?.user?.company?.plan?.id as BusinessPlanId) || "retail"
  );
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!session || !isTrialExpired) return null;

  const plans = subscription?.plans;
  const currentPlan =
    (plans && plans[selectedPlanId]) ||
    session.user?.company?.plan || {
      id: "retail",
      name: "Forfait Boutique",
      monthly_price: 150000,
      description: "Commerce de détail, supérettes et quincailleries.",
    };

  const calculateTotal = () => {
    const base = currentPlan.monthly_price;
    if (months === 12) {
      return base * 10; // 2 mois offerts
    }
    return base * months;
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPaying(true);

    try {
      if (selectedPlanId !== session.user?.company?.plan?.id) {
        await upgradePlan(selectedPlanId);
      }
      await paySubscription({
        provider,
        phone: phone.trim(),
        months,
      });
      setSuccess("Paiement validé avec succès ! Votre accès a été immédiatement débloqué.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Le paiement a échoué. Veuillez vérifier votre solde Mobile Money et réessayer."
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#06231A]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-[24px] border border-[#DCE5E1] shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <BrandAccentBar className="h-2" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <LuumoLogo variant="dark-text" height={28} />
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0F2] border border-[#FCDADF] text-[#C8102E] text-xs font-semibold">
                <Lock className="w-3.5 h-3.5" />
                <span>Période d'essai de 14 jours terminée</span>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 text-xs text-[#526B63] hover:text-[#0B2920] px-3 py-1.5 rounded-lg border border-[#DCE5E1] hover:bg-[#F7F9F8] transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter</span>
            </button>
          </div>

          {/* Reassurance Message */}
          <div className="bg-[#F7F9F8] border border-[#DCE5E1] rounded-2xl p-4 text-sm text-[#3E524C] space-y-1.5">
            <p className="font-semibold text-[#0B2920] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0B6E4F]" />
              Vos données commerciales sont en sécurité
            </p>
            <p className="text-xs text-[#526B63]">
              Votre catalogue produits, l'historique de vos ventes et votre carnet de crédit sont
              intacts. Activez votre forfait par <strong>Orange Money</strong> ou{" "}
              <strong>MTN MoMo</strong> pour débloquer votre accès immédiatement.
            </p>
          </div>

          {error && (
            <div className="bg-[#FFF0F2] border border-[#FCDADF] rounded-xl p-3.5 text-xs text-[#C8102E] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-[#E8F5EE] border border-[#C6E6D5] rounded-xl p-3.5 text-xs text-[#0B6E4F] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-5">
            {/* 1. Choix du Forfait */}
            <div>
              <label className="block text-xs font-bold text-[#0B2920] uppercase tracking-wider mb-2">
                1. Choisissez votre forfait
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(
                  [
                    { id: "retail", name: "Boutique", price: 150000 },
                    { id: "services", name: "Services", price: 250000 },
                    { id: "wholesale", name: "Grossiste", price: 450000 },
                  ] as const
                ).map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-3 rounded-xl border text-left transition ${
                      selectedPlanId === plan.id
                        ? "border-[#0B6E4F] bg-[#E8F5EE]/40 text-[#0B2920] ring-1 ring-[#0B6E4F]"
                        : "border-[#DCE5E1] bg-white text-[#526B63] hover:border-[#B5C9C1]"
                    }`}
                  >
                    <div className="text-xs font-semibold">{plan.name}</div>
                    <div className="text-sm font-bold text-[#0B2920] mt-1">
                      {formatGNF(plan.price)}
                    </div>
                    <div className="text-[10px] text-[#526B63]">/ mois</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Durée */}
            <div>
              <label className="block text-xs font-bold text-[#0B2920] uppercase tracking-wider mb-2">
                2. Durée d'abonnement
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 1, label: "1 mois" },
                  { value: 3, label: "3 mois" },
                  { value: 12, label: "1 an (2 mois offerts)", highlight: true },
                ].map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setMonths(d.value)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition ${
                      months === d.value
                        ? "border-[#0B6E4F] bg-[#0B6E4F] text-white shadow-sm"
                        : "border-[#DCE5E1] bg-white text-[#526B63] hover:border-[#B5C9C1]"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Opérateur & Téléphone */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#0B2920] uppercase tracking-wider">
                3. Règlement Mobile Money
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setProvider("orange_money")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                    provider === "orange_money"
                      ? "border-[#FF6600] bg-[#FFF5EE] text-[#D35400] ring-1 ring-[#FF6600]"
                      : "border-[#DCE5E1] bg-white text-[#526B63]"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF6600]" />
                  <span>Orange Money</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("mtn_momo")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                    provider === "mtn_momo"
                      ? "border-[#FFCC00] bg-[#FFFDF0] text-[#997A00] ring-1 ring-[#FFCC00]"
                      : "border-[#DCE5E1] bg-white text-[#526B63]"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFCC00]" />
                  <span>MTN MoMo</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-[#526B63] mb-1 font-medium">
                  Numéro de téléphone débité ({provider === "orange_money" ? "Orange" : "MTN"} Guinée)
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#526B63]" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+224 62x xx xx xx"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#DCE5E1] text-xs font-medium focus:outline-none focus:border-[#0B6E4F]"
                  />
                </div>
              </div>
            </div>

            {/* Total & Action */}
            <div className="pt-2 border-t border-[#DCE5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] text-[#526B63]">Total à régler :</div>
                <div className="text-xl font-extrabold text-[#0B2920]">
                  {formatGNF(calculateTotal())}
                </div>
              </div>
              <button
                type="submit"
                disabled={paying}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0B6E4F] hover:bg-[#09573E] text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {paying ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Validation Mobile Money...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Débloquer mon compte Luumo</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
