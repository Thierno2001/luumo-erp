"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Store,
  Briefcase,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useSession } from "@/context/session";
import { BrandAccentBar, LuumoLogo } from "@/components/ui";
import { evaluatePasswordOwasp } from "@/lib/security";
import type { BusinessProfile } from "@/lib/types";

export default function RegisterCompanyPage() {
  const { registerCompany } = useSession();
  const searchParams = useSearchParams();

  const [companyName, setCompanyName] = useState("");
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>("retail");

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan === "retail" || plan === "wholesale" || plan === "services") {
      setBusinessProfile(plan);
    }
  }, [searchParams]);
  const [city, setCity] = useState("Conakry");
  const [phone, setPhone] = useState("+224 ");
  const [adminName, setAdminName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pwAnalysis = useMemo(
    () =>
      evaluatePasswordOwasp(password, {
        login: loginEmail,
        name: adminName,
        companyName,
      }),
    [password, loginEmail, adminName, companyName]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pwAnalysis.valid) {
      setError(pwAnalysis.error || "Veuillez choisir un mot de passe plus robuste.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await registerCompany({
        company_name: companyName,
        admin_name: adminName,
        login: loginEmail,
        phone,
        city,
        password,
        business_profile: businessProfile,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer le compte."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F9F8] p-4 sm:p-8">
      <div className="w-full max-w-lg bg-white rounded-[20px] border border-[#DCE5E1] card-shadow overflow-hidden">
        <BrandAccentBar className="h-1.5" />

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <LuumoLogo variant="dark-text" height={32} />
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#526B63] hover:text-[#0B2920]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour</span>
            </Link>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5EE] border border-[#C6E6D5] text-xs font-semibold text-[#0B6E4F] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#F2B705]" />
              <span>14 jours d&apos;essai gratuit inclus • Sans carte bancaire</span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-[#0B2920]">
              Créer votre compte Luumo
            </h1>
            <p className="text-xs sm:text-sm text-[#526B63] mt-1">
              Renseignez les informations essentielles de votre activité pour accéder à vos applications.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-[#FFEDD5] border border-[#EA580C]/30 text-[#C2410C] text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1">
                Nom de l&apos;entreprise ou de la boutique
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex. Établissements Kaba & Frères"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DCE5E1] bg-[#F7F9F8] text-sm text-[#0B2920] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
                />
              </div>
            </div>

            {/* Activité principale de l'entreprise */}
            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1">
                Activité principale de votre entreprise
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={businessProfile}
                  onChange={(e) => setBusinessProfile(e.target.value as BusinessProfile)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#DCE5E1] bg-[#F7F9F8] text-sm text-[#0B2920] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115040] appearance-none cursor-pointer"
                >
                  <option value="retail">
                    Commerce et vente au détail (Boutique, Supérette, Pharmacie, Quincaillerie)
                  </option>
                  <option value="wholesale">
                    Commerce de gros et distribution (Dépôt, Grossiste, Matériaux, Importation)
                  </option>
                  <option value="services">
                    Prestations de services et entreprises (Société, Cabinet, Transport, Maintenance)
                  </option>
                </select>
                <ChevronDown className="w-4 h-4 text-[#526B63] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-[#526B63] mt-1.5">
                Vos applications seront automatiquement adaptées à votre domaine d&apos;activité.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#0B2920] mb-1">
                  Ville / Quartier
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Conakry — Madina"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DCE5E1] bg-[#F7F9F8] text-sm text-[#0B2920] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B2920] mb-1">
                  Téléphone (+224)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    maxLength={22}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+224 622 00 00 00"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DCE5E1] bg-[#F7F9F8] text-sm text-[#0B2920] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#0B2920] mb-1">
                  Votre nom complet
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Ex. Mamadou Diallo"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DCE5E1] bg-[#F7F9F8] text-sm text-[#0B2920] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B2920] mb-1">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    maxLength={120}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="contact@entreprise.gn"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DCE5E1] bg-[#F7F9F8] text-sm text-[#0B2920] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#0B2920] mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={12}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="12 caractères minimum"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#DCE5E1] bg-[#F7F9F8] text-sm text-[#0B2920] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="Afficher ou masquer le mot de passe"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#526B63] hover:text-[#0B2920] cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B2920] mb-1">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DCE5E1] bg-[#F7F9F8] text-sm text-[#0B2920] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115040]"
                  />
                </div>
              </div>
            </div>

            {/* Indicateur discret de mot de passe */}
            {password.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#526B63]">
                {[
                  { ok: pwAnalysis.checks.length, label: "12+ caractères" },
                  {
                    ok: pwAnalysis.checks.uppercase && pwAnalysis.checks.lowercase,
                    label: "Majuscule & minuscule",
                  },
                  { ok: pwAnalysis.checks.digit, label: "Chiffre" },
                  { ok: pwAnalysis.checks.special, label: "Symbole (!@#...)" },
                ].map((item) => (
                  <span
                    key={item.label}
                    className={`inline-flex items-center gap-1 ${
                      item.ok ? "text-[#115040] font-semibold" : "text-[#526B63]"
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {item.label}
                  </span>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#115040] hover:bg-[#0B382C] disabled:opacity-60 text-white font-heading font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? "Création en cours..." : "Créer mon compte"}
            </button>

            <p className="text-center text-xs text-[#526B63]">
              Vous avez déjà un compte ?{" "}
              <Link
                href="/login"
                className="font-bold text-[#115040] hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
