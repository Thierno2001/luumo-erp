"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AppShell,
  Modal,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatGNF } from "@/lib/format";
import type {
  BusinessPlanId,
  CompanyPlan,
  CompanySubscriptionInfo,
  SubscriptionInvoice,
} from "@/lib/types";
import {
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  Smartphone,
  Printer,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";

export default function SubscriptionBillingPage() {
  const [subInfo, setSubInfo] = useState<CompanySubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal de paiement Mobile Money
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [provider, setProvider] = useState<"orange_money" | "mtn_momo">("orange_money");
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [phoneNumber, setPhoneNumber] = useState("+224 620 00 00 00");

  // Modal Surclassement Forfait
  const [upgradeTarget, setUpgradeTarget] = useState<CompanyPlan | null>(null);

  // Modal Détail / Reçu Facture
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionInvoice | null>(null);

  const loadSubscription = useCallback(async () => {
    try {
      const data = await api.getCompanySubscription();
      setSubInfo(data);
    } catch {
      // Ignoré
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const handlePaySubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaying(true);
    setSuccessMsg(null);
    try {
      const updated = await api.payCompanySubscription({
        provider,
        phone: phoneNumber.trim(),
        months: durationMonths,
      });
      setSubInfo(updated);
      setPayModalOpen(false);
      setSuccessMsg(
        `Paiement de ${formatGNF(
          durationMonths === 12
            ? updated.current_plan.monthly_price * 10
            : updated.current_plan.monthly_price * durationMonths
        )} validé avec succès par ${
          provider === "orange_money" ? "Orange Money" : "MTN Mobile Money"
        }. Votre abonnement a été prolongé !`
      );
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch {
      // Ignoré
    } finally {
      setPaying(false);
    }
  };

  const handleConfirmUpgrade = async () => {
    if (!upgradeTarget) return;
    setUpgrading(true);
    setSuccessMsg(null);
    try {
      const updated = await api.upgradeCompanyPlan(upgradeTarget.id);
      setSubInfo(updated);
      setUpgradeTarget(null);
      setSuccessMsg(
        `Félicitations ! Vous êtes passé au « ${upgradeTarget.name} ». Vos nouvelles applications sont débloquées.`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch {
      // Ignoré
    } finally {
      setUpgrading(false);
    }
  };

  const currentPlan = subInfo?.current_plan;
  const plans = subInfo?.plans;
  const invoices = subInfo?.invoices ?? [];

  return (
    <AppShell
      title="Abonnement & Facturation"
      subtitle="Gestion de votre forfait Luumo, renouvellement instantané par Mobile Money et factures acquittées."
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
      <div className="space-y-8 max-w-5xl">
        {successMsg && (
          <div className="p-4 rounded-xl bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] text-sm font-medium flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-[#1B5E20]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Carte héro Forfait Actif & Échéance */}
        <div className="rounded-[22px] bg-gradient-to-br from-[#0B2920] to-[#143D31] text-white p-6 sm:p-8 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-[#F3BC33] text-[#0B2920] font-heading text-xs font-bold uppercase tracking-wider">
                  {currentPlan?.badge ?? "Forfait Actif"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {subInfo?.status === "trial" ? "Période d'essai" : "Abonnement Actif"}
                  </span>
                </span>
              </div>

              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white">
                {currentPlan?.name ?? "Chargement du forfait..."}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl">
                {currentPlan?.description}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-emerald-200">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#F3BC33]" />
                  <span>
                    Échéance :{" "}
                    <strong className="text-white">
                      {subInfo?.current_period_end ?? "—"}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#F3BC33]" />
                  <span>
                    Restant :{" "}
                    <strong className="text-white">
                      {subInfo?.days_remaining ?? 0} jour(s)
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="md:text-right shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-white/10 space-y-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-emerald-200/70 font-semibold">
                  Tarif Mensuel
                </div>
                <div className="font-heading text-3xl font-bold text-[#F3BC33] tabular-nums">
                  {formatGNF(currentPlan?.monthly_price ?? 0)}
                  <span className="text-xs text-emerald-100/70 font-normal"> /mois</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPayModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#F3BC33] hover:bg-[#E0A824] text-[#0B2920] font-heading text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-[#0B2920]" />
                <span>Payer par Mobile Money</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Historique des Factures Luumo */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#0B2920] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#115040]" />
                <span>Factures d&apos;Abonnement Luumo</span>
              </h3>
              <p className="text-xs text-[#526B63] mt-0.5">
                Historique de vos règlements de redevance logicielle acquittés conformes SYSCOHADA.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#DCE5E1] card-shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-[#526B63]">
                Chargement de vos factures...
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#526B63]">
                Aucune facture enregistrée pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F6F8F7] text-[#526B63] font-semibold border-b border-[#DCE5E1]">
                    <tr>
                      <th className="py-3 px-4">N° Facture</th>
                      <th className="py-3 px-4">Date de paiement</th>
                      <th className="py-3 px-4">Forfait</th>
                      <th className="py-3 px-4">Période couverte</th>
                      <th className="py-3 px-4">Moyen de règlement</th>
                      <th className="py-3 px-4 text-right">Montant</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF3F1]">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#F9FBFA] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0B2920]">
                          {inv.number}
                        </td>
                        <td className="py-3.5 px-4 text-[#526B63]">{inv.date}</td>
                        <td className="py-3.5 px-4 font-medium text-[#0B2920]">
                          {inv.plan_name}
                        </td>
                        <td className="py-3.5 px-4 text-[#526B63]">{inv.period}</td>
                        <td className="py-3.5 px-4 text-[#526B63]">
                          {inv.payment_method}
                        </td>
                        <td className="py-3.5 px-4 text-right font-heading font-bold text-[#0B2920] tabular-nums">
                          {formatGNF(inv.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#1B5E20] font-semibold text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-[#1B5E20]" />
                            <span>Acquittée</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DCE5E1] hover:bg-[#EEF3F1] text-[#115040] font-semibold transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Reçu</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 3. Section Forfaits & Surclassement */}
        {plans && (
          <div className="space-y-4 pt-4 border-t border-[#DCE5E1]">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#0B2920] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F3BC33]" />
                <span>Changer de Forfait</span>
              </h3>
              <p className="text-xs text-[#526B63] mt-0.5">
                Faites évoluer votre formule selon la croissance et les besoins de votre activité.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(Object.values(plans) as CompanyPlan[]).map((p) => {
                const isCurrent = p.id === currentPlan?.id;

                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                      isCurrent
                        ? "border-[#115040] bg-[#E8F2EE]/50 shadow-sm ring-1 ring-[#115040]"
                        : "border-[#DCE5E1] bg-white hover:border-[#115040]/40"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#115040]/10 text-[#115040]">
                          {p.badge}
                        </span>
                        {isCurrent && (
                          <span className="text-[11px] font-bold text-[#115040] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
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

                      <div className="pt-2 font-heading text-xl font-bold text-[#0B2920] tabular-nums">
                        {formatGNF(p.monthly_price)}
                        <span className="text-xs font-normal text-[#526B63]"> /mois</span>
                      </div>

                      <div className="pt-2 border-t border-[#EEF3F1] space-y-1">
                        <div className="text-[11px] font-semibold text-[#115040]">
                          Applications incluses :
                        </div>
                        <div className="text-[11px] text-[#526B63]">
                          {p.id === "wholesale"
                            ? "Caisse, Facturation, Stocks, Achats, Flotte & Salaires"
                            : p.id === "services"
                              ? "Facturation, Devis, Clients, Personnel & Dépenses"
                              : "Caisse, Gestion des stocks, Crédits clients & Bilan"}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      {isCurrent ? (
                        <div className="w-full py-2.5 rounded-xl bg-[#115040]/10 text-[#115040] text-xs font-bold text-center">
                          Votre formule actuelle
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setUpgradeTarget(p)}
                          className="w-full py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-1"
                        >
                          <span>Passer à ce forfait</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#F3BC33]" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Règlement Mobile Money */}
      <Modal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Payer mon abonnement par Mobile Money"
      >
        <form onSubmit={handlePaySubscription} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#FEFBF2] border border-[#F3BC33]/40 text-xs flex items-center justify-between">
            <div>
              <span className="text-[#8F5E00] font-semibold block">
                {currentPlan?.name}
              </span>
              <span className="text-[#526B63]">
                Tarif : {formatGNF(currentPlan?.monthly_price ?? 0)} / mois
              </span>
            </div>
            <ShieldCheck className="w-6 h-6 text-[#115040]" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0B2920] mb-2">
              Opérateur Mobile Money (Guinée)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider("orange_money")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  provider === "orange_money"
                    ? "border-[#FF7900] bg-[#FFF5EB] ring-1 ring-[#FF7900]"
                    : "border-[#DCE5E1] bg-white hover:bg-[#F7F9F8]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="w-3 h-3 rounded-full bg-[#FF7900]" />
                  {provider === "orange_money" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF7900]" />
                  )}
                </div>
                <div className="text-xs font-bold text-[#0B2920]">Orange Money</div>
                <div className="text-[10px] text-[#526B63]">Validation *144#</div>
              </button>

              <button
                type="button"
                onClick={() => setProvider("mtn_momo")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  provider === "mtn_momo"
                    ? "border-[#FFCC00] bg-[#FFFDEB] ring-1 ring-[#FFCC00]"
                    : "border-[#DCE5E1] bg-white hover:bg-[#F7F9F8]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="w-3 h-3 rounded-full bg-[#FFCC00]" />
                  {provider === "mtn_momo" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#B78103]" />
                  )}
                </div>
                <div className="text-xs font-bold text-[#0B2920]">MTN MoMo</div>
                <div className="text-[10px] text-[#526B63]">Validation *440#</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0B2920] mb-2">
              Période de renouvellement
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDurationMonths(1)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  durationMonths === 1
                    ? "border-[#115040] bg-[#E8F2EE] ring-1 ring-[#115040]"
                    : "border-[#DCE5E1] bg-white"
                }`}
              >
                <div className="text-xs font-bold text-[#0B2920]">Formule Mensuelle</div>
                <div className="text-[11px] text-[#526B63]">Paiement par mois</div>
                <div className="font-heading text-xs font-bold text-[#115040] mt-1">
                  {formatGNF(currentPlan?.monthly_price ?? 0)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDurationMonths(12)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                  durationMonths === 12
                    ? "border-[#115040] bg-[#E8F2EE] ring-1 ring-[#115040]"
                    : "border-[#DCE5E1] bg-white"
                }`}
              >
                <span className="absolute -top-2 right-2 px-1.5 py-0.5 bg-[#F3BC33] text-[#0B2920] text-[9px] font-bold rounded">
                  2 MOIS OFFERTS
                </span>
                <div className="text-xs font-bold text-[#0B2920]">Formule Annuelle</div>
                <div className="text-[11px] text-[#526B63]">Paiement sur 12 mois</div>
                <div className="font-heading text-xs font-bold text-[#115040] mt-1">
                  {formatGNF((currentPlan?.monthly_price ?? 0) * 10)}
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0B2920] mb-1">
              Numéro de téléphone (+224)
            </label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+224 620 00 00 00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] font-mono"
            />
            <p className="text-[11px] text-[#526B63] mt-1">
              Une notification USSD sera envoyée sur ce numéro pour validation par code PIN.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setPayModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#DCE5E1] text-xs font-semibold text-[#526B63] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={paying}
              className="px-5 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-bold cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              {paying ? (
                "Validation Mobile Money..."
              ) : (
                <>
                  <span>
                    Confirmer et Payer{" "}
                    {formatGNF(
                      durationMonths === 12
                        ? (currentPlan?.monthly_price ?? 0) * 10
                        : (currentPlan?.monthly_price ?? 0) * durationMonths
                    )}
                  </span>
                  <Zap className="w-3.5 h-3.5 text-[#F3BC33]" />
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Surclassement */}
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
            <div className="p-4 rounded-xl bg-[#FEFBF2] border border-[#F3BC33]/40 text-xs space-y-1">
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

            <p className="text-xs text-[#526B63]">
              Votre compte sera immédiatement surclassé et toutes les applications incluses dans le{" "}
              <strong>{upgradeTarget.name}</strong> seront ajoutées à votre écran d&apos;accueil.
            </p>

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
                className="px-5 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-bold cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                {upgrading ? "Activation..." : "Valider le surclassement"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Reçu de Facture imprimable */}
      <Modal
        open={selectedInvoice !== null}
        onClose={() => setSelectedInvoice(null)}
        title={selectedInvoice ? `Reçu de Facture ${selectedInvoice.number}` : "Reçu"}
      >
        {selectedInvoice && (
          <div className="space-y-5 text-xs text-[#0B2920]">
            {/* Zone de facture style papier */}
            <div className="p-6 rounded-2xl bg-[#F6F8F7] border border-[#DCE5E1] space-y-5">
              <div className="flex items-start justify-between border-b border-[#DCE5E1] pb-4">
                <div>
                  <div className="font-heading text-lg font-bold text-[#115040]">
                    LUUMO ERP GUINÉE
                  </div>
                  <div className="text-[11px] text-[#526B63]">
                    Solutions Logicielles PME & Commerce
                  </div>
                  <div className="text-[11px] text-[#526B63]">
                    Conakry, République de Guinée
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-[#0B2920]">
                    {selectedInvoice.number}
                  </div>
                  <div className="text-[11px] text-[#526B63]">
                    Date : {selectedInvoice.date}
                  </div>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#1B5E20] font-bold text-[10px]">
                    ACQUITTÉE • PAYÉE
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-[#526B63] uppercase">
                  Client / Entreprise :
                </div>
                <div className="font-bold text-sm text-[#0B2920]">
                  {subInfo?.current_plan.name ? "Votre Société" : "Client Luumo"}
                </div>
                <div className="text-[#526B63]">
                  Règlement : {selectedInvoice.payment_method}
                </div>
              </div>

              <div className="border border-[#DCE5E1] rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#EEF3F1] text-[#526B63] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Désignation</th>
                      <th className="py-2.5 px-3">Période</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3 px-3 font-medium">
                        Redevance logicielle {selectedInvoice.plan_name}
                      </td>
                      <td className="py-3 px-3 text-[#526B63]">
                        {selectedInvoice.period}
                      </td>
                      <td className="py-3 px-3 text-right font-heading font-bold text-[#0B2920]">
                        {formatGNF(selectedInvoice.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-[#526B63]">
                  TVA non applicable conformément au CGI.
                </span>
                <div className="text-right">
                  <span className="text-xs text-[#526B63] mr-2">Net à payer :</span>
                  <strong className="font-heading text-base font-bold text-[#115040]">
                    {formatGNF(selectedInvoice.amount)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl border border-[#DCE5E1] text-xs font-semibold text-[#526B63] cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer le reçu</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
