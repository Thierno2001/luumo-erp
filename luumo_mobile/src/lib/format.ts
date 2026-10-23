/** Formate un montant en francs guinéens : `1 250 000 GNF` (0 décimale). */
export function formatGNF(value: number | null | undefined, symbol = "GNF"): string {
  const n = Math.round(Number(value) || 0);
  const digits = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${n < 0 ? "−" : ""}${digits} ${symbol}`;
}

export function formatCompact(value: number): string {
  const n = Math.abs(value);
  if (n >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Md`;
  if (n >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${Math.round(value / 1_000)} k`;
  return `${Math.round(value)}`;
}
