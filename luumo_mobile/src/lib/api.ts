/**
 * Client HTTP Luumo Mobile.
 * En mode "live", envoie le `session_id` Odoo dans l'en-tête `Cookie`.
 * En mode "demo", utilise le store local `demo.ts`.
 */
import { demo, DEMO_CURRENCY, DEMO_USER } from "./demo";
import type {
  BusinessPlanId,
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

type MobileCacheEntry<T> = {
  data: T;
  timestamp: number;
};

class MobileCacheManager {
  private cache = new Map<string, MobileCacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();

  get<T>(key: string, maxAgeMs: number = 20_000): T | null {
    const entry = this.cache.get(key) as MobileCacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.timestamp > maxAgeMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(prefix?: string) {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const promise = fetcher().finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, promise);
    return promise;
  }
}

export const mobileCache = new MobileCacheManager();

async function call<T>(
  path: string,
  init?: RequestInit,
  options?: { cacheTtlMs?: number; bypassCache?: boolean }
): Promise<T> {
  if (!currentSession) throw new Error("Non connecté");

  const isGet = !init?.method || init.method.toUpperCase() === "GET";
  const ttl = options?.cacheTtlMs ?? (isGet ? 15_000 : 0);

  if (isGet && !options?.bypassCache && ttl > 0) {
    const cached = mobileCache.get<T>(path, ttl);
    if (cached !== null) return cached;
  }

  const exec = async () => {
    const base = currentSession!.serverUrl.replace(/\/+$/, "");
    const res = await fetch(`${base}/api/luumo/v1${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `session_id=${currentSession!.sessionId}`,
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

    if (isGet && ttl > 0) {
      mobileCache.set(path, body.data);
    } else {
      // Invalidation sur mutations
      if (path.startsWith("/orders")) {
        mobileCache.invalidate("/orders");
        mobileCache.invalidate("/products");
        mobileCache.invalidate("/customers");
        mobileCache.invalidate("/dashboard");
      } else if (path.startsWith("/products")) {
        mobileCache.invalidate("/products");
        mobileCache.invalidate("/dashboard");
      } else if (path.startsWith("/customers")) {
        mobileCache.invalidate("/customers");
        mobileCache.invalidate("/dashboard");
      }
    }

    return body.data;
  };

  if (isGet) {
    return mobileCache.dedupe(path, exec);
  }
  return exec();
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

  async resetPassword(
    serverUrl: string,
    input: { login: string; phone: string; new_password: string }
  ): Promise<{ message: string; login: string }> {
    const cleanUrl = serverUrl.replace(/\/+$/, "");
    const res = await fetch(`${cleanUrl}/api/luumo/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || "Échec de réinitialisation du mot de passe");
    }
    return body.data;
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

  async createProduct(input: {
    name: string;
    list_price: number;
    standard_price?: number;
    barcode?: string;
    initial_qty?: number;
  }): Promise<Product> {
    if (currentSession?.mode === "demo") return demo.createProduct(input);
    return call<Product>("/products/create", {
      method: "POST",
      body: JSON.stringify(input),
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
        invoices: [],
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
            allowed_apps: ["pos", "orders", "inventory", "customers", "hr", "dashboard"],
            monthly_price: 250000,
            description: "Sociétés de prestations, agences et ateliers.",
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

  async me(): Promise<{ user: User; currency: Currency }> {
    if (currentSession?.mode === "demo") {
      return { user: DEMO_USER, currency: DEMO_CURRENCY };
    }
    return call<{ user: User; currency: Currency }>("/auth/me");
  },

  async upgradePlan(planId: BusinessPlanId): Promise<CompanySubscriptionInfo> {
    if (currentSession?.mode === "demo") {
      return this.getSubscription();
    }
    return call<CompanySubscriptionInfo>("/company/plan/upgrade", {
      method: "POST",
      body: JSON.stringify({ plan_id: planId }),
    });
  },

  invalidateCache(prefix?: string) {
    mobileCache.invalidate(prefix);
  },
};
