import type { Metadata } from "next";
import { Outfit, Rubik } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/context/session";
import { TrialExpiredBlocker } from "@/components/trial-expired-blocker";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LUUMO — ERP & Caisse Commerciale",
  description:
    "LUUMO — Plateforme de gestion commerciale, stocks et point de vente pour commerçants, grossistes et PME en Guinée.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${outfit.variable} ${rubik.variable}`}>
      <body className="min-h-screen bg-[#F7F9F8] text-[#0B2920]">
        <SessionProvider>
          {children}
          <TrialExpiredBlocker />
        </SessionProvider>
      </body>
    </html>
  );
}
