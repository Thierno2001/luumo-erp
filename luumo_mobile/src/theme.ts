/**
 * Tokens visuels Luumo Mobile issus du logo officiel LUUMO (`design-system/luumo/MASTER.md`).
 * Vert Pin (#115040) + Or Solaire (#F3BC33) + Ambre Chaud (#E8A02B) sur fond clair (#F7F9F8).
 */
export const colors = {
  primary: "#115040",
  primaryStrong: "#0B382C",
  primarySoft: "#E8F2EE",
  ink: "#115040",
  gold: "#F3BC33",
  amber: "#E8A02B",
  goldText: "#8F5E00",
  goldSoft: "#FEF6DF",
  danger: "#C2410C",
  dangerSoft: "#FFEDD5",
  bg: "#F7F9F8",
  card: "#FFFFFF",
  border: "#DCE5E1",
  muted: "#EEF3F1",
  text: "#0B2920",
  textMuted: "#526B63",
  inkMuted: "#526B63",
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  fontFamily: "System",
} as const;
