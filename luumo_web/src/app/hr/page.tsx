"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AppShell,
  ErrorBanner,
  KpiCard,
  Modal,
  SmartButton,
  StatusBadge,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, formatGNF } from "@/lib/format";
import type { Employee, Expense } from "@/lib/types";
import {
  Briefcase,
  Users,
  Fuel,
  Receipt,
  Plus,
  Phone,
  Truck,
} from "lucide-react";

const EXPENSE_CATEGORIES = [
  "Carburant / Groupe Électrogène",
  "Manutention & Dockers",
  "Électricité EDG / Eau / Internet",
  "Transport & Livraisons",
  "Entretien Boutique & Dépôt",
];

export default function HrAndExpensesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Nouvelle Dépense
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expName, setExpName] = useState("Gasoil Groupe Électrogène (40 Litres)");
  const [expCategory, setExpCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [expAmount, setExpAmount] = useState("480000");
  const [expEmployee, setExpEmployee] = useState<string>("");
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await api.hrOverview();
      setEmployees(overview.employees);
      setExpenses(overview.expenses);
      if (overview.employees.length > 0) {
        setExpEmployee((prev) => prev || overview.employees[0].name);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les données Équipe & Dépenses."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(expAmount);
    if (!expName.trim() || numericAmount <= 0) return;

    setSubmittingExpense(true);
    try {
      await api.createExpense({
        name: expName.trim(),
        category: expCategory,
        employee: expEmployee || "Direction",
        total_amount: numericAmount,
      });
      setExpenseOpen(false);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'enregistrement de la dépense."
      );
    } finally {
      setSubmittingExpense(false);
    }
  };

  const monthExpensesTotal = expenses.reduce((s, x) => s + x.total_amount, 0);
  const monthlyPayrollTotal = employees.reduce((s, e) => s + e.monthly_wage, 0);

  return (
    <AppShell
      title="Équipe & Dépenses d'exploitation"
      subtitle="Collaborateurs de la boutique et suivi rigoureux des charges quotidiennes (gasoil groupe électrogène, dockers, EDG)."
      actions={
        <div className="flex items-center gap-2.5 flex-wrap">
          <SmartButton
            href="/fleet"
            label="Flotte & Camions"
            value="Véhicules"
            icon={<Truck className="w-4 h-4" />}
          />
          <button
            type="button"
            onClick={() => setExpenseOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#F3BC33]" />
            <span>Enregistrer une dépense</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} onRetry={loadData} />}

        {/* KPIs RH & Charges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            tone="ink"
            label="Dépenses d'exploitation (Mois)"
            value={formatGNF(monthExpensesTotal)}
            sublabel="Gasoil groupe, manutention dockers, EDG & transport"
            icon={<Fuel className="w-5 h-5" />}
          />
          <KpiCard
            tone="default"
            label="Effectif actif boutique & dépôt"
            value={`${employees.length} collaborateurs`}
            sublabel="Caisse, magasin, livraison & comptabilité"
            icon={<Users className="w-5 h-5" />}
          />
          <KpiCard
            tone="gold"
            label="Masse salariale mensuelle"
            value={formatGNF(monthlyPayrollTotal)}
            sublabel="Rémunérations fixes mensuelles en GNF"
            icon={<Briefcase className="w-5 h-5" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Colonne Gauche : Journal des Dépenses d'exploitation (hr.expense) */}
          <div className="lg:col-span-7 rounded-[18px] bg-white border border-[#DCE5E1] card-shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-[#DCE5E1] flex items-center justify-between">
              <div>
                <h2 className="font-heading text-base font-bold text-[#0B2920]">
                  Journal des dépenses opérationnelles
                </h2>
                <p className="text-xs text-[#526B63]">
                  Suivez chaque sortie de caisse pour connaître votre bénéfice net réel.
                </p>
              </div>
              <Receipt className="w-5 h-5 text-[#115040]" />
            </div>

            {loading ? (
              <div className="p-6 text-center text-sm text-[#526B63]">
                Chargement des dépenses...
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#526B63]">
                Aucune dépense enregistrée ce mois-ci.
              </div>
            ) : (
              <div className="divide-y divide-[#EEF3F1]">
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-[#F7F9F8]"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#0B2920]">
                          {exp.name}
                        </span>
                        <StatusBadge
                          variant={
                            exp.state === "approved" || exp.state === "done"
                              ? "success"
                              : "warning"
                          }
                          label={
                            exp.state === "approved" || exp.state === "done"
                              ? "Validé"
                              : "Soumis"
                          }
                        />
                      </div>
                      <p className="text-xs text-[#526B63]">
                        {exp.category} • Par{" "}
                        <strong className="text-[#0B2920]">{exp.employee}</strong> •{" "}
                        {formatDate(exp.date)}
                      </p>
                    </div>
                    <div className="font-heading text-base font-bold text-[#C2410C] tabular-nums shrink-0">
                      -{formatGNF(exp.total_amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Colonne Droite : Équipe & Collaborateurs (hr.employee) */}
          <div className="lg:col-span-5 rounded-[18px] bg-white border border-[#DCE5E1] card-shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-[#DCE5E1] flex items-center justify-between">
              <div>
                <h2 className="font-heading text-base font-bold text-[#0B2920]">
                  Équipe de l&apos;entreprise
                </h2>
                <p className="text-xs text-[#526B63]">
                  Personnel affecté aux ventes, au dépôt et aux livraisons.
                </p>
              </div>
              <Users className="w-5 h-5 text-[#115040]" />
            </div>

            {loading ? (
              <div className="p-6 text-center text-sm text-[#526B63]">
                Chargement de l&apos;équipe...
              </div>
            ) : (
              <div className="divide-y divide-[#EEF3F1]">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="p-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-[#F7F9F8]"
                  >
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-bold text-[#0B2920] truncate">
                        {emp.name}
                      </p>
                      <p className="text-xs text-[#115040] font-medium">
                        {emp.job_title} • <span className="text-[#526B63]">{emp.department}</span>
                      </p>
                      {emp.work_phone && (
                        <p className="text-xs text-[#526B63] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{emp.work_phone}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-[10px] uppercase tracking-wider text-[#526B63]">
                        Salaire / mois
                      </span>
                      <span className="font-heading text-sm font-bold text-[#0B2920] tabular-nums">
                        {formatGNF(emp.monthly_wage)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nouvelle Dépense */}
      <Modal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        title="Enregistrer une dépense d'exploitation"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
              Catégorie de charge
            </label>
            <select
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
              Motif précis de la dépense
            </label>
            <input
              type="text"
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] focus:outline-none focus:ring-2 focus:ring-[#115040]"
              placeholder="Ex. Déchargement camion 200 sacs de riz (Dockers)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Montant décaissé (GNF)
              </label>
              <input
                type="number"
                min={1000}
                step={1000}
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#115040]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Collaborateur responsable
              </label>
              <select
                value={expEmployee}
                onChange={(e) => setExpEmployee(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name} ({emp.job_title})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setExpenseOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#DCE5E1] text-xs font-semibold text-[#526B63] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingExpense}
              className="px-5 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {submittingExpense ? "Enregistrement..." : "Valider la dépense"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
