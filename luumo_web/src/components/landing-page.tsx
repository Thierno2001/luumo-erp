"use client";

import React from "react";
import Link from "next/link";
import {
  Store,
  Truck,
  CreditCard,
  Package,
  FileText,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Sparkles,
  MapPin,
  ChevronRight,
  Play,
} from "lucide-react";
import { BrandAccentBar, LuumoLogo } from "@/components/ui";
import { formatGNF } from "@/lib/format";

export function LuumoLandingPage() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#071913] text-white selection:bg-[#0B6E4F] selection:text-white">
      {/* Barre de marque officielle dégradée (Forêt -> Or) */}
      <BrandAccentBar className="h-1.5" />

      {/* Navigation supérieure inspirée du screenshot */}
      <nav className="w-full bg-[#0B231B]/80 backdrop-blur-md border-b border-[#18392D] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo officiel */}
          <Link href="/" className="flex items-center gap-2">
            <LuumoLogo variant="light-text" height={26} />
          </Link>

          {/* Liens de navigation */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#A9C4B8]">
            <button
              onClick={() => scrollTo("features")}
              className="hover:text-white transition"
            >
              Fonctionnalités
            </button>
            <button
              onClick={() => scrollTo("pricing")}
              className="hover:text-white transition"
            >
              Tarifs
            </button>
            <button
              onClick={() => scrollTo("about")}
              className="hover:text-white transition"
            >
              À propos
            </button>
          </div>

          {/* Actions : Se connecter & Essayer gratuitement */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-[#D1E2DB] hover:text-white transition"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-[#0B6E4F] hover:bg-[#0E8A63] text-white text-xs font-bold transition shadow-sm hover:shadow"
            >
              Essayer gratuitement
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 overflow-hidden">
        {/* Halo lumineux d'ambiance */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#0B6E4F]/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-7 relative z-10">
          {/* Badge localisé */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#113125] border border-[#1E4D3B] text-xs font-medium text-[#7EE7B8]">
            <MapPin className="w-3.5 h-3.5 text-[#0B6E4F]" />
            <span>Conçu pour les commerçants et distributeurs en Guinée</span>
          </div>

          {/* Titre principal */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            La gestion commerciale, <br />
            <span className="text-[#34D399]">enfin simple.</span>
          </h1>

          {/* Sous-titre culturel et promesse concrète */}
          <p className="text-base sm:text-lg text-[#95B2A6] max-w-2xl mx-auto leading-relaxed">
            Luumo remplace vos registres papier, vos cahiers de crédit et vos fichiers Excel.
            Caisse comptoir, livraisons de flotte, suivi des dettes et stocks en temps réel —
            100% pensé pour le commerce à Conakry et en région.
          </p>

          {/* CTAs */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#0B6E4F] hover:bg-[#0E8A63] text-white text-sm font-bold shadow-lg shadow-[#0B6E4F]/25 transition hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4 text-[#F2B705]" />
              <span>Commencer gratuitement (14 jours)</span>
            </Link>

            <button
              onClick={() => scrollTo("pricing")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#214F3E] bg-[#0E2A20]/50 hover:bg-[#143B2D] text-[#D1E2DB] text-sm font-semibold transition"
            >
              <Play className="w-3.5 h-3.5 fill-current text-[#7EE7B8]" />
              <span>Voir les tarifs</span>
            </button>
          </div>

          <div className="pt-2 text-xs text-[#708F83] flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" /> 14 jours d'essai gratuit
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" /> Sans carte bancaire
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" /> Paiement Orange Money
            </span>
          </div>
        </div>
      </section>

      {/* Section Fonctionnalités */}
      <section id="features" className="py-20 bg-[#F7F9F8] text-[#0B2920] px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B6E4F]">
              Tout votre commerce au même endroit
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B2920]">
              Des modules adaptés aux réalités guinéennes
            </h2>
            <p className="text-sm text-[#526B63]">
              Fini les écarts de caisse et les disputes sur les cahiers de crédit. Chaque module est
              pensé pour être rapide, tactile et utilisable sans formation complexe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 : Caisse POS */}
            <div className="p-6 rounded-2xl bg-white border border-[#DCE5E1] card-shadow space-y-3.5 hover:border-[#0B6E4F]/50 transition">
              <div className="w-10 h-10 rounded-xl bg-[#E8F5EE] text-[#0B6E4F] flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0B2920]">Caisse & Vente Comptoir</h3>
              <p className="text-xs text-[#526B63] leading-relaxed">
                Enregistrez vos ventes en 1 tap. Encaissement immédiat en espèces ou par Orange Money /
                MTN MoMo avec déstockage instantané.
              </p>
            </div>

            {/* Card 2 : Carnet de Crédit */}
            <div className="p-6 rounded-2xl bg-white border border-[#DCE5E1] card-shadow space-y-3.5 hover:border-[#0B6E4F]/50 transition">
              <div className="w-10 h-10 rounded-xl bg-[#FFF6E5] text-[#D97706] flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0B2920]">Carnet de Dettes & Crédit</h3>
              <p className="text-xs text-[#526B63] leading-relaxed">
                Gardez un suivi rigoureux de qui vous doit quoi. Enregistrez les acomptes partiels et
                éditez l'historique complet pour chaque client.
              </p>
            </div>

            {/* Card 3 : Flotte & Tournées */}
            <div className="p-6 rounded-2xl bg-white border border-[#DCE5E1] card-shadow space-y-3.5 hover:border-[#0B6E4F]/50 transition">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0B2920]">Flotte & Tournées de Livraison</h3>
              <p className="text-xs text-[#526B63] leading-relaxed">
                Suivez vos camions, tricycles et motos. Gérez les chauffeurs, le carburant et validez
                les décharges de livraison chez vos revendeurs.
              </p>
            </div>

            {/* Card 4 : Stocks Multi-Dépôts */}
            <div className="p-6 rounded-2xl bg-white border border-[#DCE5E1] card-shadow space-y-3.5 hover:border-[#0B6E4F]/50 transition">
              <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0B2920]">Stocks & Multi-Magasins</h3>
              <p className="text-xs text-[#526B63] leading-relaxed">
                Alertes automatiques avant rupture. Transferts de stocks fluides entre votre dépôt
                principal et vos points de vente secondaires.
              </p>
            </div>

            {/* Card 5 : Devis & Factures */}
            <div className="p-6 rounded-2xl bg-white border border-[#DCE5E1] card-shadow space-y-3.5 hover:border-[#0B6E4F]/50 transition">
              <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0B2920]">Facturation Normalisée</h3>
              <p className="text-xs text-[#526B63] leading-relaxed">
                Générez des factures professionnelles avec NIF/RCCM, montants en GNF, et imprimez sur
                imprimante thermique de caisse ou PDF.
              </p>
            </div>

            {/* Card 6 : Tableau de Bord */}
            <div className="p-6 rounded-2xl bg-white border border-[#DCE5E1] card-shadow space-y-3.5 hover:border-[#0B6E4F]/50 transition">
              <div className="w-10 h-10 rounded-xl bg-[#FDF2F8] text-[#DB2777] flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0B2920]">Chiffres & Bilan du Jour</h3>
              <p className="text-xs text-[#526B63] leading-relaxed">
                Visualisez vos ventes du jour, vos marges réelles et le montant total de vos créances
                sans calculatrice en fin de journée.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section Tarifs */}
      <section id="pricing" className="py-20 bg-[#0B231B] px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#11382A] border border-[#1E523F] text-xs font-semibold text-[#7EE7B8]">
              <Smartphone className="w-3.5 h-3.5 text-[#0B6E4F]" />
              <span>Paiement Mobile Money en GNF</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Des tarifs simples, transparents et sans surprise
            </h2>
            <p className="text-sm text-[#95B2A6]">
              Profitez de <strong>14 jours d'essai gratuit</strong> avec toutes les fonctionnalités.
              Si vous décidez de continuer, réglez simplement par Orange Money ou MTN MoMo.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Forfait Boutique */}
            <div className="p-7 rounded-[22px] bg-[#0E2D23] border border-[#1D4E3D] flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="text-xs font-bold text-[#7EE7B8] uppercase tracking-wider">
                  Boutique & Détail
                </div>
                <h3 className="text-xl font-bold text-white">Forfait Boutique</h3>
                <p className="text-xs text-[#95B2A6]">
                  Idéal pour supérettes, boutiques de prêt-à-porter, pharmacies et quincailleries.
                </p>
                <div className="pt-2">
                  <div className="text-3xl font-extrabold text-white">
                    {formatGNF(150000)}
                  </div>
                  <div className="text-xs text-[#708F83]">par mois • sans engagement</div>
                </div>

                <div className="pt-4 border-t border-[#183E30] space-y-2.5 text-xs text-[#D1E2DB]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Caisse tactile & tickets de caisse
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Gestion de stock & alertes
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Carnet de crédit & dettes clients
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Tableau de bord des ventes
                  </div>
                </div>
              </div>

              <Link
                href="/register?plan=retail"
                className="w-full py-3 rounded-xl border border-[#2B6651] bg-[#12382C] hover:bg-[#1A4C3C] text-white text-xs font-bold text-center transition block"
              >
                Essayer 14 jours gratuitement
              </Link>
            </div>

            {/* Forfait Grossiste (Mis en avant) */}
            <div className="p-7 rounded-[22px] bg-[#10352A] border-2 border-[#34D399] shadow-2xl relative flex flex-col justify-between space-y-6">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#34D399] text-[#06231A] text-[11px] font-extrabold uppercase tracking-wider">
                Le plus complet
              </div>

              <div className="space-y-4">
                <div className="text-xs font-bold text-[#34D399] uppercase tracking-wider">
                  Grossiste & Distribution
                </div>
                <h3 className="text-xl font-bold text-white">Forfait Grossiste & Flotte</h3>
                <p className="text-xs text-[#95B2A6]">
                  Pour dépôts de denrées, grossistes de Madina, distributeurs avec véhicules.
                </p>
                <div className="pt-2">
                  <div className="text-3xl font-extrabold text-white">
                    {formatGNF(450000)}
                  </div>
                  <div className="text-xs text-[#708F83]">par mois • tout inclus</div>
                </div>

                <div className="pt-4 border-t border-[#1C523F] space-y-2.5 text-xs text-[#D1E2DB]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Caisse POS + Factures proforma
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Flotte complète (camions, motos)
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Achats fournisseurs & conteneurs
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Stocks multi-magasins & dépôts
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Gestion RH & salaires équipe
                  </div>
                </div>
              </div>

              <Link
                href="/register?plan=wholesale"
                className="w-full py-3.5 rounded-xl bg-[#0B6E4F] hover:bg-[#0E8A63] text-white text-xs font-bold text-center transition block shadow-lg"
              >
                Commencer l'essai 14 jours
              </Link>
            </div>

            {/* Forfait Services */}
            <div className="p-7 rounded-[22px] bg-[#0E2D23] border border-[#1D4E3D] flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="text-xs font-bold text-[#7EE7B8] uppercase tracking-wider">
                  Services & Maintenance
                </div>
                <h3 className="text-xl font-bold text-white">Forfait Services</h3>
                <p className="text-xs text-[#95B2A6]">
                  Pour cabinets, agences, prestataires, ateliers techniques et maintenance.
                </p>
                <div className="pt-2">
                  <div className="text-3xl font-extrabold text-white">
                    {formatGNF(250000)}
                  </div>
                  <div className="text-xs text-[#708F83]">par mois • sans engagement</div>
                </div>

                <div className="pt-4 border-t border-[#183E30] space-y-2.5 text-xs text-[#D1E2DB]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Commandes, devis & facturation
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Suivi des clients & créances
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Gestion de l'équipe RH
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Tableau de bord financier
                  </div>
                </div>
              </div>

              <Link
                href="/register?plan=services"
                className="w-full py-3 rounded-xl border border-[#2B6651] bg-[#12382C] hover:bg-[#1A4C3C] text-white text-xs font-bold text-center transition block"
              >
                Essayer 14 jours gratuitement
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section À propos & Confiance Locale */}
      <section id="about" className="py-20 bg-[#071913] px-4 sm:px-6 border-t border-[#143B2D]">
        <div className="max-w-4xl mx-auto space-y-10 text-center">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#34D399]">
              Notre mission
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Une technologie solide, construite pour l'Afrique de l'Ouest
            </h2>
            <p className="text-sm text-[#95B2A6] max-w-2xl mx-auto leading-relaxed">
              La plupart des logiciels de gestion ont été conçus en Europe ou aux États-Unis : ils
              exigent des cartes Visa, ignorent le crédit coutumier et plantent dès que la connexion
              ralentit. Luumo a été développé sur le terrain guinéen pour résoudre ces défis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="p-5 rounded-2xl bg-[#0B231B] border border-[#18392D] space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#34D399]" /> Résistant aux coupures
              </h4>
              <p className="text-xs text-[#708F83]">
                L'application encaisse vos ventes même lorsque la connexion internet est instable.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0B231B] border border-[#18392D] space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#34D399]" /> 100% Mobile Money
              </h4>
              <p className="text-xs text-[#708F83]">
                Tous vos paiements et abonnements se règlent par Orange Money Guinée ou MTN MoMoPay.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0B231B] border border-[#18392D] space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#34D399]" /> Équipe à Conakry
              </h4>
              <p className="text-xs text-[#708F83]">
                Assistance directe par WhatsApp et téléphone pour vous accompagner dans votre boutique.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#05130E] border-t border-[#112E23] py-8 px-4 sm:px-6 text-xs text-[#526B63]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LuumoLogo variant="light-text" height={22} />
            <span>— Plateforme de gestion commerciale et logistique</span>
          </div>
          <div className="flex items-center gap-6 text-[#708F83]">
            <span>Conakry, République de Guinée</span>
            <span>•</span>
            <Link href="/login" className="hover:text-white transition">
              Espace commerçant
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
