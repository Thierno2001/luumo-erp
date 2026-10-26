/**
 * Client API Luumo. En mode "live", parle à Odoo via le proxy Next.js `/odoo/*`
 * (cookie de session même origine). En mode "demo", délègue à `demo.ts`.
 */
import { demo, DEMO_CURRENCY, DEMO_USER } from "./demo";
import {
  evaluatePasswordOwasp,
  sanitizeTextOwasp,
  validateEmailOwasp,
  validatePhoneOwasp,
  validateVatNifOwasp,
} from "./security";
import type {
  BusinessPlanId,
  CompanyAppsResponse,
  CompanySubscriptionInfo,
  CreateCustomerInput,
  CreateEmployeeInput,
  CreateExpenseInput,
  CreateOrderInput,
  CreateVehicleInput,
  Currency,
  Customer,
  CustomerDetail,
  Dashboard,
  Employee,
  Expense,
  GuineaQrProvider,
  HrOverview,
  Order,
  Paged,
  PaymentIntent,
  PaymentMethod,
  Product,
  PurchaseOrder,
  RecordRepairInput,
  RecordRepairResponse,
  RegisterCompanyInput,
  User,
  Vehicle,
} from "./types";

const BASE = "/odoo/api/luumo/v1";
const SESSION_KEY = "luumo.session";

export type Session = { mode: "live" | "demo"; user: User; currency: Currency };

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function writeSession(session: Session | null) {
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
}

const isDemo = () => readSession()?.mode === "demo";

type Envelope<T> = { success: boolean; data: T; error?: string; total?: number };

async function request<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("Serveur injoignable. Vérifiez votre connexion.", 0);
  }
  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    // Réponse non JSON (proxy en erreur, page HTML de login Odoo…)
  }
  if (res.status === 401) {
    writeSession(null);
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login?expired=1";
    }
    throw new ApiError(body?.error ?? "Session expirée", 401);
  }
  if (!res.ok || !body?.success) {
    const fallback = res.status >= 500 ? "Le serveur Luumo ne répond pas correctement." : `Erreur ${res.status}`;
    throw new ApiError(body?.error ?? fallback, res.status);
  }
  return body;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, data: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(data) });

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const api = {
  async login(login: string, password: string): Promise<Session> {
    const cleanLogin = sanitizeTextOwasp(login, "Identifiant", { required: true, maxLen: 120 }).toLowerCase();
    const { data } = await post<{ user: User; currency: Currency }>("/auth/login", { login: cleanLogin, password });
    const session: Session = { mode: "live", user: data.user, currency: data.currency };
    writeSession(session);
    return session;
  },

  async registerCompany(input: RegisterCompanyInput): Promise<Session> {
    const company_name = sanitizeTextOwasp(input.company_name, "Nom de l'entreprise", {
      required: true,
      minLen: 2,
      maxLen: 100,
    });
    const admin_name = sanitizeTextOwasp(input.admin_name, "Nom complet du gérant", {
      required: true,
      minLen: 2,
      maxLen: 100,
    });
    const login = validateEmailOwasp(input.login, true);
    const phone = validatePhoneOwasp(input.phone, true);
    const city = sanitizeTextOwasp(input.city || "Conakry", "Ville / Quartier", {
      required: true,
      minLen: 2,
      maxLen: 80,
    });
    const nif_rccm = validateVatNifOwasp(input.nif_rccm || "", false);

    const pwCheck = evaluatePasswordOwasp(input.password, {
      login,
      name: admin_name,
      companyName: company_name,
    });
    if (!pwCheck.valid) {
      throw new ApiError(pwCheck.error || "Mot de passe invalide.", 422);
    }

    const { data } = await post<{ user: User; currency: Currency }>("/auth/register", {
      company_name,
      admin_name,
      login,
      phone,
      city,
      nif_rccm,
      password: input.password,
      business_profile: input.business_profile || "retail",
    });
    const session: Session = { mode: "live", user: data.user, currency: data.currency };
    writeSession(session);
    return session;
  },

  startDemo(): Session {
    const session: Session = { mode: "demo", user: DEMO_USER, currency: DEMO_CURRENCY };
    writeSession(session);
    return session;
  },

  async logout() {
    if (!isDemo()) await post("/auth/logout", {}).catch(() => undefined);
    writeSession(null);
  },

  async dashboard(): Promise<Dashboard> {
    if (isDemo()) return demo.dashboard();
    return (await get<Dashboard>("/dashboard")).data;
  },

  async products(search = ""): Promise<Paged<Product>> {
    if (isDemo()) return demo.products(search);
    const r = await get<Product[]>(`/products${qs({ search, limit: 200 })}`);
    return { data: r.data, total: r.total ?? r.data.length };
  },

  async createProduct(input: { name: string; list_price: number; standard_price?: number; barcode?: string; initial_qty?: number }) {
    if (isDemo()) return demo.createProduct(input);
    return (await post<Product>("/products/create", input)).data;
  },

  async setStock(productId: number, qty: number) {
    if (isDemo()) return demo.setStock(productId, qty);
    return (await post<Product>(`/products/${productId}/stock`, { qty })).data;
  },

  async customers(search = "", debtorsOnly = false): Promise<Paged<Customer>> {
    if (isDemo()) return demo.customers(search, debtorsOnly);
    const r = await get<Customer[]>(`/customers${qs({ search, debtors_only: debtorsOnly ? 1 : undefined, limit: 200 })}`);
    return { data: r.data, total: r.total ?? r.data.length };
  },

  async createCustomer(input: CreateCustomerInput) {
    const is_company = Boolean(input.is_company) || input.company_type === "company";
    const name = sanitizeTextOwasp(
      input.name,
      is_company ? "Raison sociale de l'entreprise" : "Nom complet du client",
      { required: true, minLen: 2, maxLen: 100 },
    );
    const phone = validatePhoneOwasp(input.phone || "", false);
    const email = input.email ? validateEmailOwasp(input.email, false) : "";
    const street = sanitizeTextOwasp(input.street || "", "Quartier / Adresse", { maxLen: 120 });
    const city = sanitizeTextOwasp(input.city || "Conakry", "Ville", { maxLen: 80 }) || "Conakry";
    const vat = validateVatNifOwasp(input.vat || "", false);

    const payload = {
      name,
      is_company,
      company_type: is_company ? ("company" as const) : ("person" as const),
      phone,
      email,
      street,
      city,
      vat,
    };

    if (isDemo()) return demo.createCustomer(payload);
    return (await post<Customer>("/customers/create", payload)).data;
  },

  async customer(id: number): Promise<CustomerDetail> {
    if (isDemo()) return demo.customer(id);
    return (await get<CustomerDetail>(`/customers/${id}`)).data;
  },

  async customerPayment(id: number, amount: number, method: Exclude<PaymentMethod, "credit">) {
    if (isDemo()) return demo.customerPayment(id, amount, method);
    return (await post<Customer>(`/customers/${id}/payment`, { amount, method })).data;
  },

  async orders(partnerId?: number): Promise<Paged<Order>> {
    if (isDemo()) return demo.orders(partnerId);
    const r = await get<Order[]>(`/orders${qs({ partner_id: partnerId, limit: 100 })}`);
    return { data: r.data, total: r.total ?? r.data.length };
  },

  async createOrder(input: CreateOrderInput): Promise<Order> {
    if (isDemo()) return demo.createOrder(input);
    return (await post<Order>("/orders/create", { deliver: true, ...input })).data;
  },

  async batchSyncOrders(orders: Array<CreateOrderInput & { offline_uuid: string; reference?: string }>): Promise<{
    synced_count: number;
    error_count: number;
    synced: Array<{ offline_uuid: string; order_id: number; name: string; amount_total: number; state: string }>;
    errors: Array<{ offline_uuid: string; error: string }>;
  }> {
    if (isDemo()) {
      return {
        synced_count: orders.length,
        error_count: 0,
        synced: orders.map((o) => ({
          offline_uuid: o.offline_uuid,
          order_id: Math.floor(Math.random() * 1000) + 10,
          name: `SO-${o.offline_uuid.slice(-6)}`,
          amount_total: o.lines.reduce((s, l) => s + (l.price_unit ?? 0) * l.qty, 0),
          state: "sale",
        })),
        errors: [],
      };
    }
    return (
      await post<{
        synced_count: number;
        error_count: number;
        synced: Array<{ offline_uuid: string; order_id: number; name: string; amount_total: number; state: string }>;
        errors: Array<{ offline_uuid: string; error: string }>;
      }>("/orders/batch-sync", { orders })
    ).data;
  },

  async purchases(): Promise<Paged<PurchaseOrder>> {
    if (isDemo()) return demo.purchases();
    const r = await get<PurchaseOrder[]>("/purchases");
    return { data: r.data, total: r.total ?? r.data.length };
  },

  async createPurchase(input: {
    supplier_name: string;
    product_id: number;
    qty: number;
    price_unit: number;
    receive_now: boolean;
  }): Promise<PurchaseOrder> {
    if (isDemo()) return demo.createPurchase(input);
    return (
      await post<PurchaseOrder>("/purchases/create", {
        supplier_name: input.supplier_name,
        receive_now: input.receive_now,
        lines: [
          {
            product_id: input.product_id,
            qty: input.qty,
            price_unit: input.price_unit,
          },
        ],
      })
    ).data;
  },

  async receivePurchase(poId: number): Promise<PurchaseOrder> {
    if (isDemo()) return demo.receivePurchase(poId);
    return (await post<PurchaseOrder>(`/purchases/${poId}/receive`, {})).data;
  },

  async hrOverview(): Promise<HrOverview> {
    if (isDemo()) return demo.hrOverview();
    return (await get<HrOverview>("/hr/overview")).data;
  },

  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    if (isDemo()) return demo.createEmployee(input);
    return (await post<Employee>("/hr/employees/create", input)).data;
  },

  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    if (isDemo()) return demo.createExpense(input);
    return (await post<Expense>("/hr/expenses/create", input)).data;
  },

  async vehicles(): Promise<Vehicle[]> {
    if (isDemo()) return demo.vehicles();
    return (await get<Vehicle[]>("/fleet/vehicles")).data;
  },

  async createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
    if (isDemo()) return demo.createVehicle(input);
    return (await post<Vehicle>("/fleet/vehicles/create", input)).data;
  },

  async toggleVehicleStatus(id: number): Promise<Vehicle> {
    if (isDemo()) return demo.toggleVehicleStatus(id);
    return (await post<Vehicle>(`/fleet/vehicles/${id}/toggle-status`, {})).data;
  },

  async recordRepair(id: number, input: RecordRepairInput): Promise<RecordRepairResponse> {
    if (isDemo()) return demo.recordRepair(id, input);
    return (await post<RecordRepairResponse>(`/fleet/vehicles/${id}/repair`, input)).data;
  },

  async initiatePayment(input: {
    amount: number;
    provider: GuineaQrProvider;
    customer_phone?: string;
  }): Promise<PaymentIntent> {
    if (isDemo()) return demo.initiatePayment(input);
    return (await post<PaymentIntent>("/payments/initiate", input)).data;
  },

  async paymentStatus(txRef: string): Promise<PaymentIntent> {
    if (isDemo()) return demo.paymentStatus(txRef);
    return (await get<PaymentIntent>(`/payments/status/${encodeURIComponent(txRef)}`)).data;
  },

  async simulatePaymentWebhook(txRef: string): Promise<PaymentIntent> {
    if (isDemo()) return demo.simulatePaymentWebhook(txRef);
    return (
      await post<PaymentIntent>(`/payments/simulate-webhook/${encodeURIComponent(txRef)}`, {})
    ).data;
  },

  async getCompanyApps(): Promise<CompanyAppsResponse> {
    if (isDemo()) return demo.getCompanyApps();
    return (await get<CompanyAppsResponse>("/company/apps")).data;
  },

  async getCompanySubscription(): Promise<CompanySubscriptionInfo> {
    if (isDemo()) return demo.getCompanySubscription();
    return (await get<CompanySubscriptionInfo>("/company/subscription")).data;
  },

  async payCompanySubscription(input: {
    provider: string;
    phone: string;
    months?: number;
  }): Promise<CompanySubscriptionInfo> {
    if (isDemo()) return demo.payCompanySubscription(input);
    return (await post<CompanySubscriptionInfo>("/company/subscription/pay", input)).data;
  },

  async updateCompanyApps(enabled_apps: string[]): Promise<CompanyAppsResponse> {
    if (isDemo()) return demo.updateCompanyApps(enabled_apps);
    return (await post<CompanyAppsResponse>("/company/apps", { enabled_apps })).data;
  },

  async upgradeCompanyPlan(plan_id: BusinessPlanId): Promise<CompanyAppsResponse> {
    if (isDemo()) return demo.upgradeCompanyPlan(plan_id);
    return (await post<CompanyAppsResponse>("/company/plan/upgrade", { plan_id })).data;
  },

  imageUrl(path: string | null) {
    return path && !isDemo() ? `/odoo${path}` : null;
  },
};
