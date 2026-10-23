import type { NextConfig } from "next";

/**
 * Le navigateur parle uniquement à Next.js : toutes les requêtes `/odoo/*`
 * sont relayées vers le backend Luumo API. Le cookie de session reste donc
 * "même origine" (pas de CORS, pas de cookie tiers).
 */
const ODOO_URL = process.env.ODOO_URL ?? "http://localhost:8069";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [{ source: "/odoo/:path*", destination: `${ODOO_URL}/:path*` }];
  },
};

export default nextConfig;
