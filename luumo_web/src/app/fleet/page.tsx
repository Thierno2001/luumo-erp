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
} from "lucide-react";

const VEHICLE_TYPES: Vehicle["vehicle_type"][] = [
  "Camion",
  "Tricycle (Bombonne)",
  "Fourgonnette",
  "Moto",
];

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Nouveau Véhicule
  const [modalOpen, setModalOpen] = useState(false);
  const [vName, setVName] = useState("Tricycle Cargo Lifan 250cc");
  const [vPlate, setVPlate] = useState("RC-9140-B");
  const [vDriver, setVDriver] = useState("Ibrahima Kalil Keïta");
  const [vType, setVType] = useState<Vehicle["vehicle_type"]>("Tricycle (Bombonne)");
  const [vRoute, setVRoute] = useState("Madina ↔ Matoto / Dixinn");
  const [submitting, setSubmitting] = useState(false);

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
    try {
      await api.createVehicle({
        name: vName.trim(),
        license_plate: vPlate.trim(),
        driver: vDriver.trim() || "Non assigné",
        vehicle_type: vType,
        route: vRoute.trim() || "Conakry",
      });
      setModalOpen(false);
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

  const activeCount = vehicles.filter((v) => v.status !== "Entretien").length;
  const maintenanceCount = vehicles.filter((v) => v.status === "Entretien").length;
  const totalFuelBudget = vehicles.reduce((s, v) => s + v.monthly_fuel, 0);

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

        {/* KPIs Flotte */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            tone="ink"
            label="Véhicules opérationnels"
            value={`${activeCount} en service`}
            sublabel={`Sur ${vehicles.length} véhicules enregistrés dans fleet.vehicle`}
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
            sublabel="Consommation estimée de la flotte de livraison"
            icon={<Fuel className="w-5 h-5" />}
          />
        </div>

        {/* Grille des véhicules */}
        {loading ? (
          <div className="p-8 text-center text-sm text-[#526B63]">
            Chargement de la flotte...
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
                          : v.status === "En tournée"
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

                <div className="pt-3 border-t border-[#EEF3F1] flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-[#526B63]">
                    Budget Carburant / mois
                  </span>
                  <span className="font-heading text-sm font-bold text-[#0B2920] tabular-nums">
                    {formatGNF(v.monthly_fuel)}
                  </span>
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
    </AppShell>
  );
}
