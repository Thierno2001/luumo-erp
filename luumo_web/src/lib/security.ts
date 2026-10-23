/**
 * Validation et règles de sécurité (appliquées en coulisses côté client et serveur).
 */

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,24}$/;
const PHONE_RE = /^\+?[0-9\s\-()]{8,22}$/;
const VAT_NIF_RE = /^[A-Z0-9\-\/. ]{4,32}$/i;
const CONTROL_CHARS_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

const COMMON_WEAK_PASSWORDS = new Set([
  "password123!",
  "admin123456!",
  "azerty123456!",
  "123456789012",
  "guineeconakry1!",
  "conakry2025!",
  "conakry2026!",
  "luumo123456!",
  "welcome12345!",
  "qwerty123456!",
]);

export interface PasswordCheckResult {
  valid: boolean;
  score: number;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    digit: boolean;
    special: boolean;
    notContextualOrCommon: boolean;
  };
  error?: string;
}

export function evaluatePasswordOwasp(
  password: string,
  context: { login?: string; name?: string; companyName?: string } = {}
): PasswordCheckResult {
  const length = password.length >= 12 && password.length <= 128;
  const uppercase = /[A-Z]/.test(password);
  const lowercase = /[a-z]/.test(password);
  const digit = /[0-9]/.test(password);
  const special = /[^A-Za-z0-9\s]/.test(password);

  const low = password.toLowerCase();
  let notContextualOrCommon = !COMMON_WEAK_PASSWORDS.has(low);

  const tokens = [
    context.login?.split("@")[0] ?? "",
    context.name ?? "",
    context.companyName ?? "",
  ];
  for (const tok of tokens) {
    const clean = tok.trim().toLowerCase();
    if (clean.length >= 4 && low.includes(clean)) {
      notContextualOrCommon = false;
    }
  }

  const checks = {
    length,
    uppercase,
    lowercase,
    digit,
    special,
    notContextualOrCommon,
  };

  const score = [length, uppercase, lowercase, digit, special].filter(Boolean).length;
  const valid =
    length && uppercase && lowercase && digit && special && notContextualOrCommon;

  let error: string | undefined;
  if (!length) {
    error = "Le mot de passe doit contenir au moins 12 caractères.";
  } else if (!uppercase || !lowercase || !digit || !special) {
    error =
      "Le mot de passe doit inclure une majuscule, une minuscule, un chiffre et un caractère spécial.";
  } else if (!notContextualOrCommon) {
    error =
      "Choisissez un mot de passe qui ne contient ni votre nom ni celui de votre entreprise.";
  }

  return { valid, score, checks, error };
}

export function sanitizeTextOwasp(
  value: string,
  fieldLabel: string,
  options: { required?: boolean; minLen?: number; maxLen?: number } = {}
): string {
  const { required = false, minLen = 0, maxLen = 120 } = options;
  const cleaned = (value ?? "").replace(CONTROL_CHARS_RE, "").trim();

  if (required && !cleaned) {
    throw new Error(`Le champ « ${fieldLabel} » est obligatoire.`);
  }
  if (!cleaned) return "";
  if (cleaned.length < minLen) {
    throw new Error(
      `Le champ « ${fieldLabel} » doit contenir au moins ${minLen} caractères.`
    );
  }
  if (cleaned.length > maxLen) {
    throw new Error(
      `Le champ « ${fieldLabel} » ne peut pas dépasser ${maxLen} caractères.`
    );
  }
  if (cleaned.includes("<") || cleaned.includes(">")) {
    throw new Error(`Caractères non autorisés dans « ${fieldLabel} ».`);
  }
  return cleaned;
}

export function validateEmailOwasp(email: string, required = true): string {
  const cleaned = sanitizeTextOwasp(email, "Email", {
    required,
    maxLen: 120,
  }).toLowerCase();
  if (!cleaned) return "";
  if (!EMAIL_RE.test(cleaned)) {
    throw new Error("Adresse email invalide (ex. contact@entreprise.gn).");
  }
  return cleaned;
}

export function validatePhoneOwasp(phone: string, required = false): string {
  const cleaned = sanitizeTextOwasp(phone, "Téléphone", {
    required,
    maxLen: 24,
  });
  if (!cleaned) return "";
  if (!PHONE_RE.test(cleaned)) {
    throw new Error("Numéro de téléphone invalide (ex. +224 622 14 58 90).");
  }
  return cleaned;
}

export function validateVatNifOwasp(vat: string, required = false): string {
  const cleaned = sanitizeTextOwasp(vat, "NIF / RCCM", {
    required,
    maxLen: 32,
  }).toUpperCase();
  if (!cleaned) return "";
  if (!VAT_NIF_RE.test(cleaned)) {
    throw new Error("Format NIF / RCCM invalide.");
  }
  return cleaned;
}
