/** Formate un montant en francs guinéens : `1 250 000 GNF` (0 décimale, espaces fines insécables). */
export function formatGNF(value: number | null | undefined, symbol = "GNF"): string {
  const n = Math.round(Number(value) || 0);
  const digits = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return `${n < 0 ? "−" : ""}${digits}\u00a0${symbol}`;
}

/** Version compacte pour axes de graphiques et petites cartes : `1,2 M`, `850 k`. */
export function formatCompact(value: number): string {
  const n = Math.abs(value);
  if (n >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(".", ",")} Md`;
  if (n >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (n >= 1_000) return `${Math.round(value / 1_000)} k`;
  return `${Math.round(value)}`;
}

export function formatQty(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const weekdayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });

/** Odoo renvoie des datetimes UTC "YYYY-MM-DD HH:MM:SS". */
function parseOdooDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  return new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
}

export const formatDate = (v: string) => dateFmt.format(parseOdooDate(v));
export const formatDateTime = (v: string) => dateTimeFmt.format(parseOdooDate(v));
export const formatWeekday = (v: string) => weekdayFmt.format(parseOdooDate(v)).replace(".", "");

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
