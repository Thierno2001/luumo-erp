"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Lock,
  User as UserIcon,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Phone,
  KeyRound,
  X,
  Mail,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import { useSession } from "@/context/session";
import { api } from "@/lib/api";
import { BrandAccentBar, LuumoLogo } from "@/components/ui";

export default function LoginPage() {
  const { login, startDemo } = useSession();
  const [userLogin, setUserLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal Mot de passe oublié avec vérification OTP
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotLogin, setForgotLogin] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotChannel, setForgotChannel] = useState<"email" | "sms" | "both">("email");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotMaskedTarget, setForgotMaskedTarget] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(userLogin.trim(), password);
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

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotLogin.trim()) {
      setForgotError("Veuillez renseigner votre email commerçant.");
      return;
    }
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);
    try {
      const res = await api.requestOtp({
        login: forgotLogin.trim(),
        purpose: "password_reset",
        channel: forgotChannel,
        phone: forgotPhone.trim() || undefined,
      });
      setForgotMaskedTarget(res.masked_target || forgotLogin.trim());
      setForgotSuccess(res.message);
      setForgotStep(2);
      setResendCooldown(60);
    } catch (err) {
      setForgotError(
        err instanceof Error ? err.message : "Échec de l'envoi du code de vérification."
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);
    try {
      const res = await api.resetPassword({
        login: forgotLogin.trim(),
        code: forgotCode.trim(),
        phone: forgotPhone.trim() || undefined,
        new_password: forgotNewPassword,
      });
      setForgotSuccess(res.message);
      setUserLogin(forgotLogin.trim());
      setPassword(forgotNewPassword);
      setTimeout(() => {
        setForgotOpen(false);
        setForgotStep(1);
        setForgotCode("");
        setForgotSuccess(null);
        setError(null);
      }, 2500);
    } catch (err) {
      setForgotError(
        err instanceof Error ? err.message : "Échec de réinitialisation du mot de passe."
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071913] text-white flex flex-col justify-between relative selection:bg-[#0B6E4F] selection:text-white overflow-hidden">
      {/* Barre de marque officielle dégradée */}
      <BrandAccentBar className="h-1.5" />

      {/* Halo lumineux d'ambiance */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#0B6E4F]/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Header supérieur avec lien de retour discret */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2 flex items-center justify-between z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#8FAEA1] hover:text-white transition px-3 py-1.5 rounded-xl border border-[#1A4234] bg-[#0B231B]/60 hover:bg-[#0F2F24]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour à l&apos;accueil</span>
        </Link>

        <Link href="/" className="flex items-center gap-2">
          <LuumoLogo variant="light-text" height={26} />
        </Link>
      </header>

      {/* Contenu centralisé : Carte immersive Option 2 */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div className="w-full max-w-md bg-[#0B231B]/90 backdrop-blur-xl rounded-[24px] border border-[#1C4D3C] shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Header de la carte */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#11382A] border border-[#1E523F] text-[11px] font-semibold text-[#7EE7B8]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Connexion sécurisée Luumo Guinée</span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
              Connexion à votre espace
            </h1>

            <p className="text-xs sm:text-sm text-[#8FAEA1]">
              Accédez à vos caisses comptoir, stocks en temps réel et tournées de flotte.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-[#3E1116] border border-[#7A232D] text-[#FFA1A8] text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Formulaire de connexion */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-[#D1E2DB] mb-1.5">
                Email ou identifiant commerçant
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#708F83] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  autoCapitalize="none"
                  value={userLogin}
                  onChange={(e) => setUserLogin(e.target.value)}
                  placeholder="contact@entreprise.gn"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#071913] border border-[#1E4D3B] text-white text-xs font-medium placeholder-[#526B63] focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#D1E2DB]">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotLogin(userLogin.trim());
                    setForgotError(null);
                    setForgotSuccess(null);
                    setForgotOpen(true);
                  }}
                  className="text-[11px] text-[#34D399] hover:underline cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#708F83] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#071913] border border-[#1E4D3B] text-white text-xs font-medium placeholder-[#526B63] focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#708F83] hover:text-white transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0B6E4F] hover:bg-[#0E8A63] text-white text-xs font-bold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <span>Se connecter</span>
              )}
            </button>
          </form>

          {/* Séparateur & Actions alternatives */}
          <div className="pt-2 border-t border-[#18392D] space-y-3 text-center">
            <Link
              href="/register"
              className="w-full py-2.5 px-3 rounded-xl border border-[#214F3E] bg-[#0E2A20]/40 hover:bg-[#143B2D] text-[#D1E2DB] text-xs font-semibold transition block"
            >
              Nouveau sur Luumo ?{" "}
              <span className="text-[#34D399] underline underline-offset-2">
                Créer un compte (14 jours gratuits)
              </span>
            </Link>

            <button
              type="button"
              onClick={startDemo}
              className="inline-flex items-center gap-1.5 text-xs text-[#E5A812] hover:text-[#F3BC33] font-semibold transition cursor-pointer pt-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explorer avec une boutique de démonstration →</span>
            </button>
          </div>
        </div>

        {/* Modal Réinitialisation Mot de passe avec Vérification OTP & Nimba SMS */}
        {forgotOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0B231B] border border-[#1E4D3B] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-left">
              <div className="flex items-center justify-between pb-3 border-b border-[#18392D]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#11382A] border border-[#1E523F] flex items-center justify-center text-[#F3BC33]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Réinitialiser mon mot de passe</h3>
                    <p className="text-[11px] text-[#8FAEA1]">
                      {forgotStep === 1
                        ? "Étape 1/2 : Envoi du code de sécurité"
                        : "Étape 2/2 : Saisie du code et nouveau mot de passe"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(false);
                    setForgotStep(1);
                  }}
                  className="text-[#8FAEA1] hover:text-white transition p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {forgotError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {forgotStep === 1 ? (
                /* ÉTAPE 1 : CHOIX CANAL ET DEMANDE DU CODE OTP */
                <form onSubmit={handleRequestOtp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                      Email / Identifiant commerçant
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#708F83] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={forgotLogin}
                        onChange={(e) => setForgotLogin(e.target.value)}
                        placeholder="contact@entreprise.gn"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#071913] border border-[#1E4D3B] text-white text-xs font-medium placeholder-[#526B63] focus:outline-none focus:border-[#34D399] transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#D1E2DB] mb-1.5">
                      Canal de réception du code
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setForgotChannel("email")}
                        className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition ${
                          forgotChannel === "email"
                            ? "bg-[#0B6E4F] border-[#34D399] text-white"
                            : "border-[#1E4D3B] text-[#8FAEA1] hover:text-white"
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email (Gratuit)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForgotChannel("sms")}
                        className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition ${
                          forgotChannel === "sms"
                            ? "bg-[#0B6E4F] border-[#34D399] text-white"
                            : "border-[#1E4D3B] text-[#8FAEA1] hover:text-white"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Nimba SMS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForgotChannel("both")}
                        className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition ${
                          forgotChannel === "both"
                            ? "bg-[#0B6E4F] border-[#34D399] text-white"
                            : "border-[#1E4D3B] text-[#8FAEA1] hover:text-white"
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#F3BC33]" />
                        <span>Les deux</span>
                      </button>
                    </div>
                  </div>

                  {(forgotChannel === "sms" || forgotChannel === "both") && (
                    <div>
                      <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                        Numéro de téléphone (+224 Nimba SMS)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#708F83] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required={forgotChannel === "sms"}
                          value={forgotPhone}
                          onChange={(e) => setForgotPhone(e.target.value)}
                          placeholder="+224 620 00 00 00"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#071913] border border-[#1E4D3B] text-white text-xs font-medium placeholder-[#526B63] focus:outline-none focus:border-[#34D399] transition"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setForgotOpen(false)}
                      className="px-4 py-2 rounded-xl border border-[#1E4D3B] text-xs font-semibold text-[#8FAEA1] hover:text-white hover:bg-[#11382A] transition cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-4 py-2 rounded-xl bg-[#0B6E4F] hover:bg-[#0E8A63] text-white text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {forgotLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Envoi du code...</span>
                        </>
                      ) : (
                        <span>Envoyer le code de vérification →</span>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* ÉTAPE 2 : VALIDATION DU CODE OTP ET NOUVEAU MOT DE PASSE */
                <form onSubmit={handleResetSubmit} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-[#11382A]/70 border border-[#1E523F] text-xs text-[#C6E6D5] flex items-center justify-between">
                    <div>
                      <span>Code envoyé à </span>
                      <strong className="text-white">{forgotMaskedTarget}</strong>
                      <span className="block text-[10px] text-[#8FAEA1]">Valide pendant 10 minutes</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-[11px] text-[#F3BC33] hover:underline"
                    >
                      Modifier
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                      Code de vérification à 6 chiffres
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • • • •"
                      className="w-full text-center py-2.5 rounded-xl bg-[#071913] border border-[#1E4D3B] text-white text-lg font-mono font-bold tracking-[0.4em] placeholder-[#526B63] focus:outline-none focus:border-[#34D399] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#D1E2DB] mb-1">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#708F83] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Min. 12 car, 1 Maj, 1 Chiffre, 1 Symbole"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#071913] border border-[#1E4D3B] text-white text-xs font-medium placeholder-[#526B63] focus:outline-none focus:border-[#34D399] transition"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || forgotLoading}
                      onClick={() => handleRequestOtp()}
                      className="text-[11px] text-[#8FAEA1] hover:text-[#F3BC33] transition disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>
                        {resendCooldown > 0
                          ? `Renvoyer un code (${resendCooldown}s)`
                          : "Renvoyer un code"}
                      </span>
                    </button>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotOpen(false);
                        setForgotStep(1);
                      }}
                      className="px-4 py-2 rounded-xl border border-[#1E4D3B] text-xs font-semibold text-[#8FAEA1] hover:text-white hover:bg-[#11382A] transition cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading || forgotCode.length !== 6}
                      className="px-4 py-2 rounded-xl bg-[#0B6E4F] hover:bg-[#0E8A63] text-white text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {forgotLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Validation...</span>
                        </>
                      ) : (
                        <span>Valider et réinitialiser</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer minimaliste */}
      <footer className="w-full py-4 text-center text-xs text-[#526B63] z-10">
        <span>© {new Date().getFullYear()} LUUMO ERP • République de Guinée</span>
      </footer>
    </div>
  );
}
