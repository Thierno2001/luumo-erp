/**
 * Client HTTP Luumo Mobile.
 * En mode "live", envoie le `session_id` Odoo dans l'en-tête `Cookie`.
 * En mode "demo", utilise le store local `demo.ts`.
 */
import { demo, DEMO_CURRENCY, DEMO_USER } from "./demo";
import type {
  CompanySubscriptionInfo,
  CreateOrderInput,
  Currency,
  Customer,
  Dashboard,
  Order,
  PaymentMethod,
  Product,
  User,
} from "./types";

export type MobileSession = {
  mode: "live" | "demo";
  serverUrl: string;
  sessionId: string;
  user: User;
  currency: Currency;
};

let currentSession: MobileSession | null = null;
let onTrialExpiredHandler: (() => void) | null = null;

export function setOnTrialExpired(handler: (() => void) | null) {
  onTrialExpiredHandler = handler;
}

export function getMobileSession(): MobileSession | null {
  return currentSession;
}

export function setMobileSession(s: MobileSession | null) {
  currentSession = s;
}

type Envelope<T> = { success: boolean; data: T; error?: string };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!currentSession) throw new Error("Non connecté");
  const base = currentSession.serverUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/luumo/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: `session_id=${currentSession.sessionId}`,
      ...init?.headers,
    },
  });
  const body = (await res.json()) as Envelope<T>;
  if (res.status === 402) {
    if (onTrialExpiredHandler) {
      onTrialExpiredHandler();
    }
    throw new Error(
      body.error ||
        "Votre période d'essai de 14 jours a pris fin. Veuillez régulariser votre abonnement via Orange Money."
    );
  }
  if (!res.ok || !body.success) {
    throw new Error(body.error || `Erreur serveur (${res.status})`);
  }
  return body.data;
}

export const mobileApi = {
  async login(
    serverUrl: string,
    login: string,
    password: string
  ): Promise<MobileSession> {
    const cleanUrl = serverUrl.replace(/\/+$/, "");
    const res = await fetch(`${cleanUrl}/api/luumo/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ login, password }),
    });
    const body = (await res.json()) as Envelope<{
      session_id: string;
      user: User;
      currency: Currency;
    }>;
    if (!res.ok || !body.success) {
      throw new Error(body.error || "Identifiants ou serveur invalides");
    }
    const session: MobileSession = {
      mode: "live",
      serverUrl: cleanUrl,
      sessionId: body.data.session_id,
      user: body.data.user,
      currency: body.data.currency,
    };
    setMobileSession(session);
    return session;
  },

  startDemo(): MobileSession {
    const session: MobileSession = {
      mode: "demo",
      serverUrl: "demo://conakry",
      sessionId: "demo",
      user: DEMO_USER,
      currency: DEMO_CURRENCY,
    };
    setMobileSession(session);
    return session;
  },

  logout() {
    setMobileSession(null);
  },

  async dashboard(): Promise<Dashboard> {
    if (currentSession?.mode === "demo") return demo.dashboard();
    return call<Dashboard>("/dashboard");
  },

  async products(search = "", barcode?: string): Promise<Product[]> {
    if (currentSession?.mode === "demo") return demo.products(search, barcode);
    const qs = barcode
      ? `?barcode=${encodeURIComponent(barcode)}`
      : search
        ? `?search=${encodeURIComponent(search)}`
        : "";
    return call<Product[]>(`/products${qs}`);
  },

  async setStock(productId: number, qty: number): Promise<Product> {
    if (currentSession?.mode === "demo") return demo.setStock(productId, qty);
    return call<Product>(`/products/${productId}/stock`, {
      method: "POST",
      body: JSON.stringify({ qty }),
    });
  },

  async customers(search = "", debtorsOnly = false): Promise<Customer[]> {
    if (currentSession?.mode === "demo") return demo.customers(search, debtorsOnly);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (debtorsOnly) params.set("debtors_only", "1");
    const q = params.toString();
    return call<Customer[]>(`/customers${q ? `?${q}` : ""}`);
  },

  async createCustomer(input: {
    name: string;
    phone?: string;
    city?: string;
  }): Promise<Customer> {
    if (currentSession?.mode === "demo") return demo.createCustomer(input);
    return call<Customer>("/customers/create", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async customerPayment(
    id: number,
    amount: number,
    method: Exclude<PaymentMethod, "credit">
  ): Promise<Customer> {
    if (currentSession?.mode === "demo")
      return demo.customerPayment(id, amount, method);
    return call<Customer>(`/customers/${id}/payment`, {
      method: "POST",
      body: JSON.stringify({ amount, method }),
    });
  },

  async createOrder(input: CreateOrderInput): Promise<Order> {
    if (currentSession?.mode === "demo") return demo.createOrder(input);
    return call<Order>("/orders/create", {
      method: "POST",
      body: JSON.stringify({ deliver: true, ...input }),
    });
  },

  async getSubscription(): Promise<CompanySubscriptionInfo> {
    if (currentSession?.mode === "demo") {
      return {
        current_plan: {
          id: "retail",
          name: "Forfait Boutique",
          allowed_apps: ["pos", "inventory", "customers", "dashboard"],
          monthly_price: 150000,
          description: "Commerce de détail et supérettes.",
        },
        allowed_apps: ["pos", "inventory", "customers", "dashboard"],
        enabled_apps: ["pos", "inventory", "customers", "dashboard"],
        status: "active",
        current_period_end: "2026-11-30",
        days_remaining: 30,
        plans: {
          retail: {
            id: "retail",
            name: "Forfait Boutique",
            allowed_apps: ["pos", "inventory", "customers", "dashboard"],
            monthly_price: 150000,
            description: "Commerce de détail et supérettes.",
          },
          services: {
            id: "services",
            name: "Forfait Services",
            allowed_apps: ["orders", "customers", "hr", "dashboard"],
            monthly_price: 250000,
            description: "Sociétés de prestations et agences.",
          },
          wholesale: {
            id: "wholesale",
            name: "Forfait Grossiste",
            allowed_apps: ["pos", "orders", "dashboard", "inventory", "purchases", "customers", "hr", "fleet"],
            monthly_price: 450000,
            description: "Grossistes et distributeurs avec flotte.",
          },
        },
      };
    }
    return call<CompanySubscriptionInfo>("/company/subscription");
  },

  async paySubscription(input: {
    provider: string;
    phone: string;
    months?: number;
  }): Promise<CompanySubscriptionInfo> {
    if (currentSession?.mode === "demo") {
      return this.getSubscription();
    }
    return call<CompanySubscriptionInfo>("/company/subscription/pay", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
