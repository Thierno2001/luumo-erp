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
import { formatGNF } from "@/lib/format";
import type { Vehicle } from "@/lib/types";
import {
  Truck,
  Wrench,
  Gauge,
  Plus,
  UserCheck,
  Briefcase,
  Fuel,
  MapPin,
  CheckCircle2,
  Receipt,
  Check,
} from "lucide-react";

const VEHICLE_TYPES: Vehicle["vehicle_type"][] = [
  "Camion",
  "Tricycle (Bombonne)",
  "Fourgonnette",
  "Moto",
];

const REPAIR_SUGGESTIONS = [
  "Vidange & filtres",
  "Remplacement 2 pneus",
  "Freinage & plaquettes",
  "Panne démarreur / alternateur",
  "Batterie neuve",
  "Révision générale moteur",
];

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Action en cours (chargement par véhicule)
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Modal Nouveau Véhicule
  const [modalOpen, setModalOpen] = useState(false);
  const [vName, setVName] = useState("Tricycle Cargo Lifan 250cc");
  const [vPlate, setVPlate] = useState("RC-9140-B");
  const [vDriver, setVDriver] = useState("Ibrahima Kalil Keïta");
  const [vType, setVType] = useState<Vehicle["vehicle_type"]>("Tricycle (Bombonne)");
  const [vRoute, setVRoute] = useState("Madina ↔ Matoto / Dixinn");
  const [vMonthlyFuel, setVMonthlyFuel] = useState("800000");
  const [vOdometer, setVOdometer] = useState("12500");
  const [submitting, setSubmitting] = useState(false);

  // Modal Enregistrer une Réparation
  const [repairVehicle, setRepairVehicle] = useState<Vehicle | null>(null);
  const [repairReason, setRepairReason] = useState("");
  const [repairGarage, setRepairGarage] = useState("Garage Moderne Madina");
  const [repairAmount, setRepairAmount] = useState("");
  const [repairOdometer, setRepairOdometer] = useState("");
  const [repairFromCash, setRepairFromCash] = useState(true);
  const [repairSubmitting, setRepairSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.vehicles();
      setVehicles(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger le parc automobile."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName.trim() || !vPlate.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const fuelVal = parseFloat(vMonthlyFuel.replace(/\s/g, "")) || 0;
      const odoVal = parseFloat(vOdometer.replace(/\s/g, "")) || 0;

      await api.createVehicle({
        name: vName.trim(),
        license_plate: vPlate.trim(),
        driver: vDriver.trim() || "Non assigné",
        vehicle_type: vType,
        route: vRoute.trim() || "Conakry",
        monthly_fuel: fuelVal,
        initial_odometer: odoVal,
      });
      setModalOpen(false);
      setSuccessMsg(`Véhicule ${vPlate.trim().toUpperCase()} ajouté avec succès.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'ajout du véhicule."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (v: Vehicle) => {
    setActionLoading(v.id);
    setError(null);
    try {
      const updated = await api.toggleVehicleStatus(v.id);
      const isGarage = updated.status === "Entretien";
      setSuccessMsg(
        isGarage
          ? `${updated.license_plate} est désormais mis au garage (en atelier).`
          : `${updated.license_plate} est sorti d'atelier et remis en service actif.`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du changement de statut."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const openRepairModal = (v: Vehicle) => {
    setRepairVehicle(v);
    setRepairReason("");
    setRepairGarage("Garage Moderne Madina");
    setRepairAmount("");
    setRepairOdometer(v.odometer > 0 ? String(v.odometer) : "");
    setRepairFromCash(true);
  };

  const handleRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repairVehicle) return;

    const amount = parseFloat(repairAmount.replace(/\s/g, ""));
    if (isNaN(amount) || amount <= 0) {
      setError("Veuillez saisir un montant valide supérieur à 0 GNF.");
      return;
    }

    const odo = repairOdometer ? parseFloat(repairOdometer.replace(/\s/g, "")) : undefined;
    setRepairSubmitting(true);
    setError(null);

    try {
      await api.recordRepair(repairVehicle.id, {
        reason: repairReason.trim(),
        garage: repairGarage.trim() || undefined,
        amount,
        odometer: odo,
        from_cash: repairFromCash,
      });

      const plate = repairVehicle.license_plate;
      setRepairVehicle(null);
      setSuccessMsg(
        repairFromCash
          ? `Réparation de ${plate} enregistrée : ${formatGNF(amount)} décaissés de la caisse.`
          : `Réparation de ${plate} enregistrée (${formatGNF(amount)}).`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'enregistrement de la réparation."
      );
    } finally {
      setRepairSubmitting(false);
    }
  };

  const activeCount = vehicles.filter((v) => v.status !== "Entretien").length;
  const maintenanceCount = vehicles.filter((v) => v.status === "Entretien").length;
  const totalFuelBudget = vehicles.reduce((s, v) => s + (v.monthly_fuel || 0), 0);

  return (
    <AppShell
      title="Flotte & Livraisons"
      subtitle="Suivi du parc de camions, tricycles « bombonnes », fourgonnettes et chauffeurs pour vos livraisons clients."
      actions={
        <div className="flex items-center gap-2.5 flex-wrap">
          <SmartButton
            href="/hr"
            label="Chauffeurs & Gasoil"
            value="Dépenses"
            icon={<Briefcase className="w-4 h-4" />}
          />
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-sm font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#F3BC33]" />
            <span>Ajouter un véhicule</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} onRetry={loadData} />}

        {successMsg && (
          <div className="p-4 rounded-xl bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] text-sm font-medium flex items-center gap-3">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* KPIs Flotte */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            tone="ink"
            label="Véhicules opérationnels"
            value={`${activeCount} en service`}
            sublabel={`Sur ${vehicles.length} véhicules enregistrés dans votre flotte`}
            icon={<Truck className="w-5 h-5" />}
          />
          <KpiCard
            tone={maintenanceCount > 0 ? "danger" : "default"}
            label="Au garage / Maintenance"
            value={`${maintenanceCount} véhicule(s)`}
            sublabel="Suivi entretien préventif, pneus & vidanges"
            icon={<Wrench className="w-5 h-5" />}
          />
          <KpiCard
            tone="gold"
            label="Budget carburant mensuel"
            value={formatGNF(totalFuelBudget)}
            sublabel="Allocation forfaitaire carburant de la flotte"
            icon={<Fuel className="w-5 h-5" />}
          />
        </div>

        {/* Grille des véhicules */}
        {loading ? (
          <div className="p-8 text-center text-sm text-[#526B63]">
            Chargement de la flotte...
          </div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-[18px] bg-white border border-[#DCE5E1] p-10 text-center space-y-3">
            <Truck className="w-10 h-10 text-[#526B63] mx-auto opacity-40" />
            <h3 className="font-heading text-base font-bold text-[#0B2920]">
              Aucun véhicule dans la flotte
            </h3>
            <p className="text-xs text-[#526B63] max-w-md mx-auto">
              Ajoutez vos tricycles cargo (« bombonnes »), camions ou motos de livraison pour suivre leur maintenance et carburant.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 text-[#F3BC33]" />
              <span>Ajouter un premier véhicule</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="rounded-[18px] bg-white border border-[#DCE5E1] p-5 card-shadow flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="px-3 py-1 rounded-lg bg-[#0B2920] text-[#F3BC33] font-mono text-xs font-bold tracking-wider">
                      {v.license_plate}
                    </span>
                    <StatusBadge
                      variant={
                        v.status === "Entretien"
                          ? "warning"
                          : v.status === "En tournée" || v.status === "Opérationnel"
                            ? "success"
                            : "neutral"
                      }
                      label={v.status}
                    />
                  </div>

                  <h3 className="font-heading text-base font-bold text-[#0B2920] mt-3">
                    {v.name}
                  </h3>
                  <p className="text-xs text-[#115040] font-medium mt-0.5">
                    {v.vehicle_type}
                  </p>

                  <div className="mt-4 space-y-2 pt-3 border-t border-[#EEF3F1] text-xs">
                    <div className="flex items-center justify-between text-[#526B63]">
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-[#115040]" />
                        Chauffeur attitré
                      </span>
                      <strong className="text-[#0B2920]">{v.driver}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[#526B63]">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#115040]" />
                        Zone / Axe
                      </span>
                      <strong className="text-[#0B2920]">{v.route}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[#526B63]">
                      <span className="flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-[#115040]" />
                        Kilométrage compteur
                      </span>
                      <strong className="text-[#0B2920] tabular-nums">
                        {v.odometer.toLocaleString("fr-FR")} km
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="pt-3 border-t border-[#EEF3F1] flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-[#526B63]">
                      Budget Carburant / mois
                    </span>
                    <span className="font-heading text-sm font-bold text-[#0B2920] tabular-nums">
                      {formatGNF(v.monthly_fuel || 0)}
                    </span>
                  </div>

                  {/* Boutons d'action rapides */}
                  <div className="pt-3 border-t border-[#EEF3F1] flex items-center gap-2">
                    <button
                      type="button"
                      disabled={actionLoading === v.id}
                      onClick={() => handleToggleStatus(v)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                        v.status === "Entretien"
                          ? "bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#1B5E20] border border-[#A5D6A7]"
                          : "bg-[#FFF8E1] hover:bg-[#FFECB3] text-[#B78103] border border-[#FFE082]"
                      }`}
                      title={
                        v.status === "Entretien"
                          ? "Remettre le véhicule en service actif"
                          : "Signaler le véhicule au garage pour maintenance"
                      }
                    >
                      {v.status === "Entretien" ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#1B5E20]" />
                          <span>Sortie d&apos;atelier</span>
                        </>
                      ) : (
                        <>
                          <Wrench className="w-3.5 h-3.5 text-[#B78103]" />
                          <span>Mettre au garage</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openRepairModal(v)}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-[#115040]/10 hover:bg-[#115040]/20 text-[#115040] transition-colors cursor-pointer"
                      title="Enregistrer les réparations effectuées et sortir les fonds de la caisse"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Réparation</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ajout Véhicule */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajouter un véhicule à la flotte"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
              Type d&apos;engin (Guinée)
            </label>
            <select
              value={vType}
              onChange={(e) =>
                setVType(e.target.value as Vehicle["vehicle_type"])
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] bg-white"
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Modèle / Désignation
              </label>
              <input
                type="text"
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Plaque d&apos;immatriculation
              </label>
              <input
                type="text"
                value={vPlate}
                onChange={(e) => setVPlate(e.target.value)}
                required
                placeholder="Ex. RC-4821-A"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Chauffeur / Livreur assigné
              </label>
              <input
                type="text"
                value={vDriver}
                onChange={(e) => setVDriver(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Axe / Zone de livraison
              </label>
              <input
                type="text"
                value={vRoute}
                onChange={(e) => setVRoute(e.target.value)}
                required
                placeholder="Ex. Madina ↔ Kaloum"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Budget Carburant mensuel (GNF)
              </label>
              <input
                type="number"
                step="50000"
                min="0"
                value={vMonthlyFuel}
                onChange={(e) => setVMonthlyFuel(e.target.value)}
                placeholder="Ex. 800 000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] tabular-nums"
              />
              <span className="text-[11px] text-[#526B63] mt-1 block">
                {vMonthlyFuel ? formatGNF(parseFloat(vMonthlyFuel) || 0) : "0 GNF"}
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Kilométrage initial (km)
              </label>
              <input
                type="number"
                min="0"
                value={vOdometer}
                onChange={(e) => setVOdometer(e.target.value)}
                placeholder="Ex. 15 000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] tabular-nums"
              />
              <span className="text-[11px] text-[#526B63] mt-1 block">
                Relevé du compteur au compteur actuel
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#DCE5E1] text-xs font-semibold text-[#526B63] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Enregistrement..." : "Ajouter à la flotte"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Enregistrer une Réparation */}
      <Modal
        open={repairVehicle !== null}
        onClose={() => setRepairVehicle(null)}
        title={
          repairVehicle
            ? `Réparation & Entretien — ${repairVehicle.license_plate}`
            : "Enregistrer une réparation"
        }
      >
        {repairVehicle && (
          <form onSubmit={handleRepairSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-[#F6F8F7] border border-[#DCE5E1] text-xs space-y-1">
              <div className="flex items-center justify-between text-[#526B63]">
                <span>Véhicule :</span>
                <strong className="text-[#0B2920]">{repairVehicle.name}</strong>
              </div>
              <div className="flex items-center justify-between text-[#526B63]">
                <span>Chauffeur assigné :</span>
                <strong className="text-[#0B2920]">{repairVehicle.driver}</strong>
              </div>
              <div className="flex items-center justify-between text-[#526B63]">
                <span>Kilométrage actuel :</span>
                <strong className="text-[#0B2920]">
                  {repairVehicle.odometer.toLocaleString("fr-FR")} km
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Motif de l&apos;intervention mécanique
              </label>
              <input
                type="text"
                value={repairReason}
                onChange={(e) => setRepairReason(e.target.value)}
                required
                placeholder="Ex. Vidange complète + filtres huile/gasoil"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920]"
              />

              {/* Suggestions rapides en 1 clic */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {REPAIR_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setRepairReason(sug)}
                    className="text-[11px] px-2 py-1 rounded-lg bg-[#EEF3F1] hover:bg-[#DCE5E1] text-[#115040] font-medium transition-colors cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                  Garage / Prestataire
                </label>
                <input
                  type="text"
                  value={repairGarage}
                  onChange={(e) => setRepairGarage(e.target.value)}
                  placeholder="Ex. Garage Moderne Madina"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                  Montant décaissé (GNF)
                </label>
                <input
                  type="number"
                  step="5000"
                  min="1000"
                  value={repairAmount}
                  onChange={(e) => setRepairAmount(e.target.value)}
                  required
                  placeholder="Ex. 450 000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] tabular-nums font-semibold"
                />
                <span className="text-[11px] text-[#115040] font-semibold mt-1 block">
                  {repairAmount ? formatGNF(parseFloat(repairAmount) || 0) : "0 GNF"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Nouveau relevé compteur (km)
              </label>
              <input
                type="number"
                min="0"
                value={repairOdometer}
                onChange={(e) => setRepairOdometer(e.target.value)}
                placeholder={`Relevé actuel : ${repairVehicle.odometer} km`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E1] text-sm text-[#0B2920] tabular-nums"
              />
              <span className="text-[11px] text-[#526B63] mt-1 block">
                Permet de suivre le kilométrage de la prochaine vidange.
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-3">
              <input
                type="checkbox"
                id="repairFromCash"
                checked={repairFromCash}
                onChange={(e) => setRepairFromCash(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-[#115040] focus:ring-[#115040]"
              />
              <label htmlFor="repairFromCash" className="text-xs text-[#92400E] cursor-pointer">
                <span className="font-bold block">Déduire directement du tiroir-caisse (Espèces)</span>
                Enregistre une sortie de caisse comptable dans Luumo (Dépenses & Caisse) pour justification immédiate du solde espèces.
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRepairVehicle(null)}
                className="px-4 py-2.5 rounded-xl border border-[#DCE5E1] text-xs font-semibold text-[#526B63] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={repairSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#115040] hover:bg-[#0B382C] text-white text-xs font-bold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {repairSubmitting ? "Validation..." : "Valider la réparation & sortie d'atelier"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </AppShell>
  );
}
