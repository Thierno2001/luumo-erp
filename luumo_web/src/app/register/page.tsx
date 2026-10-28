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
  KeyRound,
  MessageSquare,
  Clock,
  RotateCcw,
} from "lucide-react";
import { useSession } from "@/context/session";
import { BrandAccentBar, LuumoLogo } from "@/components/ui";
import { evaluatePasswordOwasp } from "@/lib/security";
import { api } from "@/lib/api";
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

  // Étape progressive : 1 = Saisie informations, 2 = Vérification OTP obligatoire
  const [step, setStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsSuccessNotice, setSmsSuccessNotice] = useState<string | null>(null);

  // Décompte du cooldown 45s pour le SMS
  useEffect(() => {
    if (smsCooldown <= 0) return;
    const t = setInterval(() => {
      setSmsCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [smsCooldown]);

  const pwAnalysis = useMemo(
    () =>
      evaluatePasswordOwasp(password, {
        login: loginEmail,
        name: adminName,
        companyName,
      }),
    [password, loginEmail, adminName, companyName]
  );

  // Étape 1 : Demande de code par Email d'abord (Règle 1: Gratuit 0 GNF)
  const handleRequestOtp = async (e: React.FormEvent) => {
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
      const res = await api.requestRegisterOtp({
        company_name: companyName,
        admin_name: adminName,
        login: loginEmail,
        phone,
        password,
        business_profile: businessProfile,
      });
      setMaskedEmail(res.masked_email || loginEmail);
      setSmsCooldown(res.cooldown_sms || 45);
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'initier la vérification du compte."
      );
    } finally {
      setLoading(false);
    }
  };

  // Étape 2.B : Bascule de secours sur Nimba SMS (Règles 2 & 3: même code après 45s)
  const handleResendSms = async () => {
    if (smsCooldown > 0 || smsLoading) return;
    setError(null);
    setSmsSuccessNotice(null);
    setSmsLoading(true);
    try {
      const res = await api.resendRegisterSms({
        login: loginEmail,
        phone,
      });
      setSmsSuccessNotice(res.message);
      setSmsCooldown(res.cooldown || 45);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Échec de l'envoi du SMS de secours."
      );
    } finally {
      setSmsLoading(false);
    }
  };

  // Étape 2 : Confirmation avec validation du code OTP (Règle 4: Obligatoire & Atomique)
  const handleConfirmRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpCode.trim().length !== 6) {
      setError("Veuillez saisir le code d'activation à 6 chiffres.");
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
        code: otpCode.trim(),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de finaliser l'inscription avec ce code."
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
              {step === 1 ? "Créer votre compte Luumo" : "Activation de votre compte"}
            </h1>
            <p className="text-xs sm:text-sm text-[#526B63] mt-1">
              {step === 1
                ? "Renseignez les informations essentielles de votre activité pour accéder à vos applications."
                : `Veuillez saisir le code d'activation reçu pour activer votre période d'essai de 14 jours.`}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-[#FFEDD5] border border-[#EA580C]/30 text-[#C2410C] text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
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
              className="w-full py-3.5 px-4 rounded-xl bg-[#115040] hover:bg-[#0B382C] disabled:opacity-60 text-white font-heading font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Vérification...</span>
                </>
              ) : (
                <span>Vérifier et créer mon compte →</span>
              )}
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
        ) : (
          /* ÉTAPE 2 : VÉRIFICATION OTP OBLIGATOIRE & SMART ROUTING NIMBA SMS */
          <form onSubmit={handleConfirmRegister} className="space-y-4" noValidate>
            <div className="p-4 rounded-xl bg-[#E8F5EE] border border-[#C6E6D5] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B6E4F]">
                <Mail className="w-4 h-4 text-[#0B6E4F]" />
                <span>Code d&apos;activation envoyé par email</span>
              </div>
              <p className="text-xs text-[#06231A] leading-relaxed">
                Un code de sécurité à 6 chiffres a été envoyé à <strong>{maskedEmail || loginEmail}</strong> (valide 10 minutes).
              </p>
            </div>

            {smsSuccessNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{smsSuccessNotice}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#0B2920] mb-1.5">
                Code d&apos;activation à 6 chiffres
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#526B63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="• • • • • •"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-[#115040] bg-[#F7F9F8] text-center font-mono text-xl font-bold tracking-[0.4em] text-[#0B2920] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* RÈGLES 2 & 3 : FALLBACK SMS NIMBA INTELLIGENT APRÈS 45 SECONDES */}
            <div className="p-3.5 rounded-xl border border-[#DCE5E1] bg-[#F7F9F8] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#526B63]">
                  Pas reçu l&apos;email ou pas d&apos;accès messagerie ?
                </span>
                {smsCooldown > 0 && (
                  <span className="text-[11px] font-mono text-[#F2B705] bg-[#06231A] px-2 py-0.5 rounded-full font-bold">
                    {smsCooldown}s
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={smsCooldown > 0 || smsLoading}
                onClick={handleResendSms}
                className="w-full py-2.5 px-3 rounded-lg border border-[#DCE5E1] bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold text-[#0B2920] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#0B6E4F]" />
                <span>
                  {smsLoading
                    ? "Envoi du SMS Nimba en cours..."
                    : smsCooldown > 0
                      ? `Recevoir le code par SMS au ${phone} (actif dans ${smsCooldown}s)`
                      : `Recevoir le code par SMS au ${phone}`}
                </span>
              </button>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3.5 px-4 rounded-xl bg-[#115040] hover:bg-[#0B382C] disabled:opacity-50 text-white font-heading font-bold text-sm flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Activation de votre boutique...</span>
                  </>
                ) : (
                  <span>Confirmer et activer ma boutique →</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                className="w-full py-2 text-xs font-semibold text-[#526B63] hover:text-[#0B2920] transition text-center cursor-pointer"
              >
                ← Modifier mes informations (email ou téléphone)
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
