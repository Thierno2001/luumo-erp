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
} from "lucide-react";
import { useSession } from "@/context/session";
import { BrandAccentBar, LuumoLogo } from "@/components/ui";

export default function LoginPage() {
  const { login, startDemo } = useSession();
  const [userLogin, setUserLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
              <label className="block text-xs font-semibold text-[#D1E2DB] mb-1.5">
                Mot de passe
              </label>
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
      </main>

      {/* Footer minimaliste */}
      <footer className="w-full py-4 text-center text-xs text-[#526B63] z-10">
        <span>© {new Date().getFullYear()} LUUMO ERP • République de Guinée</span>
      </footer>
    </div>
  );
}
