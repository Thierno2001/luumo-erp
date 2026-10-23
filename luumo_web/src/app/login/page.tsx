"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Lock,
  User as UserIcon,
  AlertCircle,
  Building2,
  ShoppingBag,
  PackageCheck,
  Wallet,
} from "lucide-react";
import { useSession } from "@/context/session";
import { BrandAccentBar, LuumoLogo } from "@/components/ui";

export default function LoginPage() {
  const { login, startDemo } = useSession();
  const [userLogin, setUserLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(userLogin, password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Identifiant ou mot de passe incorrect."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7F9F8]">
      {/* Colonne Gauche : Présentation sobre et concise de l'importance de LUUMO */}
      <div className="lg:w-1/2 bg-[#0B2920] text-white flex flex-col justify-between relative overflow-hidden">
        <BrandAccentBar className="h-1.5" />
        <div
          className="w-96 h-96 rounded-full bg-[#F3BC33]/10 blur-3xl absolute -right-24 -top-24 pointer-events-none"
          aria-hidden="true"
        />

        <div className="p-8 sm:p-12 lg:p-16 flex-1 flex flex-col justify-between z-10 max-w-xl mx-auto w-full">
          <div>
            <LuumoLogo variant="light-text" height={38} />
          </div>

          <div className="my-10 space-y-6">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-white">
              Toute la gestion de votre commerce réunie au{" "}
              <span className="text-[#F3BC33]">même endroit</span>.
            </h1>

            <p className="text-emerald-100/85 text-sm sm:text-base leading-relaxed">
              Luumo remplace les cahiers éparpillés par un espace unique et fiable :
              encaissez vos ventes, contrôlez vos stocks en temps réel et suivez
              chaque créance client en Franc Guinéen (GNF).
            </p>

            {/* 3 Piliers essentiels */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/6 border border-white/10">
                <div className="w-9 h-9 rounded-xl bg-[#F3BC33]/15 text-[#F3BC33] flex items-center justify-center shrink-0 mt-0.5">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-heading text-sm font-bold text-white">
                    Caisse &amp; Facturation rapides
                  </h2>
                  <p className="text-xs text-emerald-100/75 mt-0.5">
                    Encaissement comptoir ou B2B en Espèces, Orange Money, MTN MoMo, Banque et Crédit.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/6 border border-white/10">
                <div className="w-9 h-9 rounded-xl bg-[#F3BC33]/15 text-[#F3BC33] flex items-center justify-center shrink-0 mt-0.5">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-heading text-sm font-bold text-white">
                    Stocks &amp; Arrivages en temps réel
                  </h2>
                  <p className="text-xs text-emerald-100/75 mt-0.5">
                    Mise à jour automatique du dépôt à chaque vente ou réception fournisseur, avec alertes de rupture.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/6 border border-white/10">
                <div className="w-9 h-9 rounded-xl bg-[#F3BC33]/15 text-[#F3BC33] flex items-center justify-center shrink-0 mt-0.5">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-heading text-sm font-bold text-white">
                    Carnet de dettes &amp; Dépenses maîtrisés
                  </h2>
                  <p className="text-xs text-emerald-100/75 mt-0.5">
                    Suivi clair des soldes clients à encaisser et des charges quotidiennes de l&apos;entreprise.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-emerald-100/60 flex items-center justify-between border-t border-white/10 pt-5">
            <span>LUUMO • Gestion Commerciale &amp; Point de Vente</span>
            <span>Guinée (GNF)</span>
          </div>
        </div>
      </div>

      {/* Colonne Droite : Formulaire de connexion hiérarchisé et épuré */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-[20px] border border-[#DCE5E1] card-shadow overflow-hidden">
          <BrandAccentBar className="h-1.5" />
          <div className="p-7 sm:p-9 space-y-6">
            <div>
              <h2 className="font-heading text-2xl font-bold text-[#0B2920]">
                Connexion à votre espace
              </h2>
              <p className="text-xs sm:text-sm text-[#526B63] mt-1">
                Saisissez vos identifiants pour accéder aux applications de votre entreprise.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-[#FFEDD5] border border-[#EA580C]/30 text-[#C2410C] text-xs font-medium flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Action principale : Connexion */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-input"
                  className="block text-xs font-semibold text-[#0B2920] mb-1.5"
                >
                  Email ou identifiant
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-input"
                    type="text"
                    required
                    value={userLogin}
                    onChange={(e) => setUserLogin(e.target.value)}
                    placeholder="contact@entreprise.gn"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DCE5E1] bg-[#F7F9F8] text-sm text-[#0B2920] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password-input"
                  className="block text-xs font-semibold text-[#0B2920] mb-1.5"
                >
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="password-input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DCE5E1] bg-[#F7F9F8] text-sm text-[#0B2920] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#115040] hover:bg-[#0B382C] disabled:opacity-60 text-white font-heading font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            {/* Actions secondaires bien séparées : Créer un compte ou Découvrir la démo */}
            <div className="pt-5 border-t border-[#EEF3F1] space-y-3">
              <Link
                href="/register"
                className="w-full py-2.5 px-4 rounded-xl bg-[#E8F2EE] hover:bg-[#115040] text-[#115040] hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                <span>Créer un compte entreprise</span>
              </Link>

              <button
                type="button"
                onClick={startDemo}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FEF6DF] hover:bg-[#F3BC33] border border-[#F3BC33]/60 text-[#0B2920] font-heading font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#8F5E00]" />
                <span>Tester avec une boutique de démonstration</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
