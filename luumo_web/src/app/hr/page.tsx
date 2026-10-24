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
  UserPlus,
  Banknote,
  ArrowDownRight,
} from "lucide-react";

const EXPENSE_CATEGORIES = [
  "Carburant / Groupe Électrogène",
  "Manutention & Dockers",
  "Électricité EDG / Eau / Internet",
  "Transport & Livraisons",
  "Entretien Boutique & Dépôt",
];

const DEPARTMENTS = [
  "Boutique & Caisse",
  "Dépôt & Magasin",
  "Transport & Livraisons",
  "Direction & Comptabilité",
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
  const [expFromCash, setExpFromCash] = useState<boolean>(true);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Modal Nouveau Collaborateur
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpJobTitle, setNewEmpJobTitle] = useState("Caissière / Vendeuse");
  const [newEmpPhone, setNewEmpPhone] = useState("+224 ");
  const [newEmpDepartment, setNewEmpDepartment] = useState(DEPARTMENTS[0]);
  const [newEmpWage, setNewEmpWage] = useState("1500000");
  const [submittingEmployee, setSubmittingEmployee] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await api.hrOverview();
      setEmployees(overview.employees);
      setExpenses(overview.expenses);
      if (overview.employees.length > 0) {
        setExpEmployee((prev) => {
          const exists = overview.employees.some((e) => e.name === prev);
          return exists && prev ? prev : overview.employees[0].name;
        });
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
        from_cash: expFromCash,
      });
      setExpenseOpen(false);
      setExpName("Gasoil Groupe Électrogène");
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

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;

    setSubmittingEmployee(true);
    try {
      await api.createEmployee({
        name: newEmpName.trim(),
        job_title: newEmpJobTitle.trim() || "Employé",
        work_phone: newEmpPhone.trim(),
        department: newEmpDepartment.trim() || "Boutique & Dépôt",
        monthly_wage: Number(newEmpWage) || 0,
      });
      setEmployeeOpen(false);
      setNewEmpName("");
      setNewEmpPhone("+224 ");
      setNewEmpWage("1500000");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la création du collaborateur."
      );
    } finally {
      setSubmittingEmployee(false);
    }
  };

  const monthExpensesTotal = expenses.reduce((s, x) => s + (x.total_amount || 0), 0);
  const monthlyPayrollTotal = employees.reduce((s, e) => s + (e.monthly_wage || 0), 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCashOut = expenses
    .filter((x) => x.date === todayStr && x.payment_mode !== "own_account")
    .reduce((s, x) => s + (x.total_amount || 0), 0);

  return (
    <AppShell
      title="Équipe & Dépenses d'exploitation"
      subtitle="Collaborateurs de la boutique, gestion des fiches d'équipe et sorties directes de caisse (gasoil, dockers, EDG)."
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
            onClick={() => setEmployeeOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#DCE5E1] hover:border-[#115040] text-[#0B2920] text-xs sm:text-sm font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <UserPlus className="w-4 h-4 text-[#115040]" />
            <span>+ Nouveau collaborateur</span>
          </button>
          <button
            type="button"
            onClick={() => setExpenseOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs sm:text-sm font-semibold shadow-xs cursor-pointer transition-colors"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            tone="ink"
            label="Charges d'exploitation (Mois)"
            value={formatGNF(monthExpensesTotal)}
            sublabel="Gasoil groupe, dockers, EDG & transport"
            icon={<Fuel className="w-5 h-5" />}
          />
          <KpiCard
            tone="gold"
            label="Sorties de caisse (Aujourd'hui)"
            value={formatGNF(todayCashOut)}
            sublabel="Espèces décaissées du tiroir-caisse"
            icon={<Banknote className="w-5 h-5" />}
          />
          <KpiCard
            tone="default"
            label="Masse salariale mensuelle"
            value={formatGNF(monthlyPayrollTotal)}
            sublabel="Rémunérations fixes prévisionnelles"
            icon={<Briefcase className="w-5 h-5" />}
          />
          <KpiCard
            tone="default"
            label="Effectif actif boutique & dépôt"
            value={`${employees.length} collaborateurs`}
            sublabel="Caisse, magasin, logistique & gérance"
            icon={<Users className="w-5 h-5" />}
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
                  Suivez chaque sortie de caisse pour contrôler votre cash net physique.
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
                    className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-[#F7F9F8] transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#0B2920]">
                          {exp.name}
                        </span>
                        {exp.payment_mode !== "own_account" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Banknote className="w-3 h-3 text-amber-700" />
                            <span>Sortie de Caisse</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <span>Avancé par collaborateur</span>
                          </span>
                        )}
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
                        {exp.category || "Charge d'exploitation"} • Par{" "}
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
              <button
                type="button"
                onClick={() => setEmployeeOpen(true)}
                title="Ajouter un collaborateur"
                className="p-1.5 rounded-lg text-[#115040] hover:bg-[#EEF3F1] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
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
                    className="p-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-[#F7F9F8] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-bold text-[#0B2920] truncate">
                        {emp.name}
                      </p>
                      <p className="text-xs text-[#115040] font-medium">
                        {emp.job_title} • <span className="text-[#526B63]">{emp.department}</span>
                      </p>
                      {emp.work_phone && (
                        <a
                          href={`tel:${emp.work_phone.replace(/\s+/g, "")}`}
                          className="text-xs text-[#526B63] hover:text-[#115040] inline-flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="w-3 h-3 text-[#115040]" />
                          <span>{emp.work_phone}</span>
                        </a>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-[10px] uppercase tracking-wider text-[#526B63]">
                        Salaire / mois
                      </span>
                      <span className="font-heading text-sm font-bold text-[#0B2920] tabular-nums">
                        {formatGNF(emp.monthly_wage || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nouveau Collaborateur */}
      <Modal
        open={employeeOpen}
        onClose={() => setEmployeeOpen(false)}
        title="Créer une fiche collaborateur"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
              Nom complet du collaborateur *
            </label>
            <input
              type="text"
              value={newEmpName}
              onChange={(e) => setNewEmpName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] focus:outline-none focus:ring-2 focus:ring-[#115040]"
              placeholder="Ex. Fatoumata Binta Diallo"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Fonction / Poste
              </label>
              <input
                type="text"
                value={newEmpJobTitle}
                onChange={(e) => setNewEmpJobTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] focus:outline-none focus:ring-2 focus:ring-[#115040]"
                placeholder="Ex. Caissière Principale"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Téléphone direct (Guinée)
              </label>
              <input
                type="tel"
                value={newEmpPhone}
                onChange={(e) => setNewEmpPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] focus:outline-none focus:ring-2 focus:ring-[#115040]"
                placeholder="+224 620 00 00 00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Département / Affectation
              </label>
              <select
                value={newEmpDepartment}
                onChange={(e) => setNewEmpDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
              >
                {DEPARTMENTS.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Salaire mensuel convenu (GNF)
              </label>
              <input
                type="number"
                min={0}
                step={50000}
                value={newEmpWage}
                onChange={(e) => setNewEmpWage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#115040]"
                placeholder="1500000"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setEmployeeOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#DCE5E1] text-xs font-semibold text-[#526B63] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingEmployee}
              className="px-5 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {submittingEmployee ? "Enregistrement..." : "Créer le collaborateur"}
            </button>
          </div>
        </form>
      </Modal>

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
              Motif précis de la dépense *
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
                Montant décaissé (GNF) *
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

          {/* Option Décaissement direct tiroir-caisse */}
          <label className="flex items-start gap-3 p-3 rounded-xl bg-[#F7F9F8] border border-[#DCE5E1] cursor-pointer hover:bg-[#EEF3F1] transition-colors">
            <input
              type="checkbox"
              checked={expFromCash}
              onChange={(e) => setExpFromCash(e.target.checked)}
              className="mt-0.5 rounded text-[#115040] focus:ring-[#115040] w-4 h-4 cursor-pointer"
            />
            <div>
              <span className="block text-xs font-bold text-[#0B2920] flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-[#115040]" />
                <span>Déduire directement du tiroir-caisse physique (Espèces)</span>
              </span>
              <span className="block text-[11px] text-[#526B63] mt-0.5">
                Diminue immédiatement le solde d&apos;espèces théorique pour le comptage du soir.
              </span>
            </div>
          </label>

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
