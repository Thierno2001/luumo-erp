/**
 * Mode démo 360° : backend simulé en mémoire (données réalistes d'un grossiste/PME à Conakry).
 * Toutes les applications (Caisse, Ventes, Stock, Achats, Dettes, Dépenses/RH, Flotte)
 * lisent et modifient les mêmes objets en mémoire (logique 360° d'Odoo).
 */
import type {
  CreateEmployeeInput,
  CreateExpenseInput,
  CreateOrderInput,
  Customer,
  CustomerDetail,
  CustomerPayment,
  Dashboard,
  Employee,
  Expense,
  GuineaQrProvider,
  HrOverview,
  Order,
  PaymentIntent,
  PaymentMethod,
  Product,
  PurchaseOrder,
  User,
  Vehicle,
} from "./types";

export const DEMO_USER: User = {
  id: 2,
  name: "Mamadou Diallo",
  login: "mamadou@luumo.gn",
  company: { id: 1, name: "Diallo & Fils — Madina" },
};

export const DEMO_CURRENCY = {
  name: "GNF",
  symbol: "GNF",
  decimals: 0,
  position: "after" as const,
};

type DemoState = {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  purchases: PurchaseOrder[];
  employees: Employee[];
  expenses: Expense[];
  vehicles: Vehicle[];
  payments: (CustomerPayment & { partner_id: number })[];
  seq: number;
  poSeq: number;
};

const p = (
  id: number,
  name: string,
  price: number,
  cost: number,
  qty: number,
  category: string,
  uom = "Unité",
  barcode = "",
): Product => ({
  id,
  name,
  default_code: `ART-${String(id).padStart(4, "0")}`,
  barcode: barcode || `620000${String(id).padStart(6, "0")}`,
  list_price: price,
  standard_price: cost,
  qty_available: qty,
  is_storable: true,
  uom,
  category,
  image_url: null,
});

const c = (
  id: number,
  name: string,
  phone: string,
  city: string,
  credit = 0,
  is_company = false,
  vat = "",
  street = "",
  email = "",
): Customer => ({
  id,
  name,
  is_company,
  company_type: is_company ? "company" : "person",
  phone,
  email,
  street,
  city,
  vat,
  credit,
});

function isoDay(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function seed(): DemoState {
  const products: Product[] = [
    p(1, "Riz brisé 25 % — sac 50 kg", 485_000, 430_000, 42, "Alimentation", "Sac"),
    p(2, "Huile végétale Dinor — bidon 20 L", 395_000, 352_000, 18, "Alimentation", "Bidon"),
    p(3, "Sucre en poudre — sac 50 kg", 520_000, 470_000, 3, "Alimentation", "Sac"),
    p(4, "Lait en poudre Nido 900 g", 98_000, 81_000, 64, "Alimentation"),
    p(5, "Ciment CIMAF 42,5 — sac 50 kg", 92_000, 84_000, 120, "Construction", "Sac"),
    p(6, "Fer à béton Ø10 — barre 12 m", 78_000, 69_000, 2, "Construction", "Barre"),
    p(7, "Savon Mayor — carton de 40", 210_000, 182_000, 9, "Hygiène", "Carton"),
    p(8, "Eau minérale Coyah 1,5 L — pack 6", 30_000, 24_000, 85, "Boissons", "Pack"),
    p(9, "Concentré de tomate Gino — carton 48", 265_000, 231_000, 0, "Alimentation", "Carton"),
    p(10, "Oignons de Mamou — sac 25 kg", 175_000, 150_000, 14, "Alimentation", "Sac"),
    p(11, "Crédit Orange 50 000 GNF", 50_000, 48_500, 300, "Télécom"),
    p(12, "Piles Panasonic AA — boîte 24", 72_000, 58_000, 4, "Divers", "Boîte"),
  ];

  const customers: Customer[] = [
    c(1, "Client comptoir", "", "Conakry"),
    c(2, "Fatoumata Binta Bah", "+224 622 14 58 90", "Ratoma", 1_250_000, false, "", "Carrefour Cosa"),
    c(3, "Alpha Oumar Sow", "+224 655 30 21 47", "Matoto", 0, false, "", "Marché Enta"),
    c(4, "Boutique Kadiatou SARL — Kaloum", "+224 628 77 09 12", "Kaloum", 3_480_000, true, "NIF-401928371-GN", "Avenue de la République", "contact@kadiatou.gn"),
    c(5, "Ibrahima Camara", "+224 664 52 18 33", "Dixinn", 395_000, false, "", "Dixinn Terrasse"),
    c(6, "Quincaillerie Le Bâtisseur SA", "+224 620 41 66 05", "Lambanyi", 7_820_000, true, "RCCM/GN.CKY.2023.B.0841", "Route Le Prince — Lambanyi", "achats@lebatisseur.gn"),
    c(7, "Mariama Soumah", "+224 611 09 74 28", "Kipé", 0, false, "", "Kipé Centre Émetteur"),
    c(8, "Restaurant Le Damier SARL", "+224 657 23 90 61", "Taouyah", 920_000, true, "NIF-772190442-GN", "Corniche Nord Taouyah", "direction@ledamier.gn"),
  ];

  const orders: Order[] = [];
  let seq = 240;
  const now = new Date();
  const pick = (i: number) => products[i % products.length]!;
  for (let d = 6; d >= 0; d--) {
    const count = 3 + ((d * 7) % 5);
    for (let k = 0; k < count; k++) {
      const date = new Date(now);
      date.setDate(now.getDate() - d);
      date.setHours(8 + ((k * 3) % 10), (k * 17) % 60, 0, 0);
      const a = pick(d * 3 + k);
      const b = pick(d + k * 5 + 1);
      const lines = [
        { product_id: a.id, name: a.name, qty: 1 + (k % 3), price_unit: a.list_price, subtotal: 0 },
        { product_id: b.id, name: b.name, qty: 1 + ((d + k) % 2), price_unit: b.list_price, subtotal: 0 },
      ].map((l) => ({ ...l, subtotal: l.qty * l.price_unit }));
      const total = lines.reduce((s, l) => s + l.subtotal, 0);
      const customer = customers[(d + k) % customers.length]!;
      const onCredit = customer.credit > 0 && k % 3 === 0;
      orders.push({
        id: ++seq,
        name: `S${String(seq).padStart(5, "0")}`,
        date: date.toISOString().slice(0, 19).replace("T", " "),
        partner: { id: customer.id, name: customer.name },
        state: "sale",
        amount_total: total,
        amount_untaxed: Math.round(total / 1.18),
        invoice_status: "invoiced",
        payment_state: onCredit ? "not_paid" : "paid",
        lines,
      });
    }
  }
  orders.reverse();

  const purchases: PurchaseOrder[] = [
    {
      id: 101,
      name: "P00101",
      date: `${isoDay(-1)} 09:15:00`,
      partner: { id: 901, name: "Kaloum Import Trading (Port de Conakry)" },
      state: "purchase",
      received: false,
      amount_total: 23_500_000,
      lines: [
        {
          product_id: 3,
          name: "Sucre en poudre — sac 50 kg",
          qty: 50,
          price_unit: 470_000,
          subtotal: 23_500_000,
        },
      ],
    },
    {
      id: 102,
      name: "P00102",
      date: `${isoDay(-2)} 14:30:00`,
      partner: { id: 902, name: "Usine CIMAF Guinée — Kagbelen" },
      state: "purchase",
      received: false,
      amount_total: 6_900_000,
      lines: [
        {
          product_id: 6,
          name: "Fer à béton Ø10 — barre 12 m",
          qty: 100,
          price_unit: 69_000,
          subtotal: 6_900_000,
        },
      ],
    },
    {
      id: 100,
      name: "P00100",
      date: `${isoDay(-5)} 11:00:00`,
      partner: { id: 903, name: "SONOCO Distribution — Conakry" },
      state: "purchase",
      received: true,
      amount_total: 21_500_000,
      lines: [
        {
          product_id: 1,
          name: "Riz brisé 25 % — sac 50 kg",
          qty: 50,
          price_unit: 430_000,
          subtotal: 21_500_000,
        },
      ],
    },
  ];

  const employees: Employee[] = [
    {
      id: 1,
      name: "Mamadou Diallo",
      job_title: "Gérant Général",
      work_phone: "+224 622 01 02 03",
      department: "Direction Madina",
      monthly_wage: 6_500_000,
    },
    {
      id: 2,
      name: "Aissatou Barry",
      job_title: "Caissière Principale & Facturation",
      work_phone: "+224 628 45 12 89",
      department: "Comptoir Madina",
      monthly_wage: 3_200_000,
    },
    {
      id: 3,
      name: "Ousmane Bangoura",
      job_title: "Chef Magasinier (Dépôt Kagbelen)",
      work_phone: "+224 664 88 19 04",
      department: "Logistique & Stock",
      monthly_wage: 3_500_000,
    },
    {
      id: 4,
      name: "Sekou Condé",
      job_title: "Chauffeur Livreur Camion & Tricycle",
      work_phone: "+224 655 71 33 10",
      department: "Flotte & Livraisons",
      monthly_wage: 2_800_000,
    },
  ];

  const expenses: Expense[] = [
    {
      id: 1,
      name: "Gasoil groupe électrogène (60 L) — coupure EDG",
      category: "Énergie & Groupe",
      date: isoDay(0),
      employee: "Aissatou Barry",
      total_amount: 720_000,
      state: "approved",
    },
    {
      id: 2,
      name: "Manutention dockers — déchargement 200 sacs au dépôt",
      category: "Manutention & Magasin",
      date: isoDay(-1),
      employee: "Ousmane Bangoura",
      total_amount: 400_000,
      state: "done",
    },
    {
      id: 3,
      name: "Carburant Camion livraison Kaloum → Lambanyi",
      category: "Carburant Flotte",
      date: isoDay(-2),
      employee: "Sekou Condé",
      total_amount: 550_000,
      state: "done",
    },
    {
      id: 4,
      name: "Redevance électricité EDG — Boutique Madina",
      category: "Eau & Électricité",
      date: isoDay(-4),
      employee: "Mamadou Diallo",
      total_amount: 950_000,
      state: "done",
    },
  ];

  const vehicles: Vehicle[] = [
    {
      id: 1,
      name: "Camion Mercedes-Benz Atego 10T",
      vehicle_type: "Camion",
      license_plate: "RC-4821-A",
      driver: "Sekou Condé",
      route: "Port de Conakry ↔ Dépôt Kagbelen ↔ Madina",
      odometer: 84_320,
      monthly_fuel: 4_200_000,
      status: "En tournée",
    },
    {
      id: 2,
      name: "Tricycle Cargo (« Bombonne ») Lifan 250cc",
      vehicle_type: "Tricycle (Bombonne)",
      license_plate: "RC-1094-M",
      driver: "Mory Kourouma",
      route: "Marché Madina ↔ Kaloum / Dixinn",
      odometer: 19_450,
      monthly_fuel: 980_000,
      status: "Disponible",
    },
    {
      id: 3,
      name: "Fourgonnette Toyota Hiace",
      vehicle_type: "Fourgonnette",
      license_plate: "RC-7732-B",
      driver: "Ibrahima Sylla",
      route: "Conakry ↔ Coyah / Kindia",
      odometer: 112_800,
      monthly_fuel: 2_650_000,
      status: "Disponible",
    },
  ];

  const payments = [
    { id: 1, partner_id: 4, name: "PCASH/2026/0118", date: isoDay(-3), amount: 1_500_000, journal: "Espèces" },
    { id: 2, partner_id: 6, name: "PBNK/2026/0042", date: isoDay(-5), amount: 2_000_000, journal: "Mobile Money" },
    { id: 3, partner_id: 2, name: "PCASH/2026/0121", date: isoDay(-1), amount: 500_000, journal: "Espèces" },
  ];

  return {
    products,
    customers,
    orders,
    purchases,
    employees,
    expenses,
    vehicles,
    payments,
    seq,
    poSeq: 102,
  };
}

let state: DemoState | null = null;
const db = () => (state ??= seed());

const delay = <T>(value: T, ms = 180): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));

const matches = (q: string, ...fields: string[]) =>
  !q || fields.some((f) => f.toLowerCase().includes(q.toLowerCase()));

const LOW = 5;

export const demo = {
  async dashboard(): Promise<Dashboard> {
    const s = db();
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const todayOrders = s.orders.filter((o) => o.date.startsWith(today));
    const monthOrders = s.orders.filter((o) => o.date.startsWith(month));
    const sales_7d = Array.from({ length: 7 }, (_, i) => {
      const date = isoDay(i - 6);
      return {
        date,
        total: s.orders
          .filter((o) => o.date.startsWith(date))
          .reduce((t, o) => t + o.amount_total, 0),
      };
    });
    const debtors = s.customers.filter((cu) => cu.credit > 0);
    const low = s.products.filter((pr) => (pr.qty_available ?? 0) < LOW);
    return delay({
      kpis: {
        sales_today: todayOrders.reduce((t, o) => t + o.amount_total, 0),
        orders_today: todayOrders.length,
        sales_month: monthOrders.reduce((t, o) => t + o.amount_total, 0),
        orders_month: monthOrders.length,
        receivables: debtors.reduce((t, cu) => t + cu.credit, 0),
        debtors: debtors.length,
        low_stock_count: low.length,
      },
      sales_7d,
      low_stock: low,
      top_debtors: [...debtors].sort((a, b) => b.credit - a.credit).slice(0, 5),
      recent_orders: s.orders.slice(0, 6),
      currency: DEMO_CURRENCY,
    });
  },

  async products(search = "") {
    const list = db().products.filter((pr) =>
      matches(search, pr.name, pr.default_code, pr.barcode),
    );
    return delay({ data: list, total: list.length });
  },

  async createProduct(input: {
    name: string;
    list_price: number;
    standard_price?: number;
    barcode?: string;
    initial_qty?: number;
  }) {
    const s = db();
    const id = Math.max(...s.products.map((x) => x.id)) + 1;
    const product = p(
      id,
      input.name,
      input.list_price,
      input.standard_price ?? 0,
      input.initial_qty ?? 0,
      "Divers",
      "Unité",
      input.barcode,
    );
    s.products.push(product);
    return delay(product);
  },

  async setStock(productId: number, qty: number) {
    const product = db().products.find((x) => x.id === productId);
    if (!product) throw new Error("Produit introuvable");
    product.qty_available = qty;
    return delay(product);
  },

  async customers(search = "", debtorsOnly = false) {
    const list = db()
      .customers.filter((cu) => cu.id !== 1)
      .filter((cu) => matches(search, cu.name, cu.phone, cu.vat, cu.city))
      .filter((cu) => !debtorsOnly || cu.credit > 0);
    return delay({ data: list, total: list.length });
  },

  async createCustomer(input: {
    name: string;
    is_company?: boolean;
    phone?: string;
    email?: string;
    street?: string;
    city?: string;
    vat?: string;
  }) {
    const s = db();
    const id = Math.max(...s.customers.map((x) => x.id)) + 1;
    const customer = c(
      id,
      input.name,
      input.phone ?? "",
      input.city || "Conakry",
      0,
      Boolean(input.is_company),
      input.vat ?? "",
      input.street ?? "",
      input.email ?? "",
    );
    s.customers.push(customer);
    return delay(customer);
  },

  async customer(id: number): Promise<CustomerDetail> {
    const s = db();
    const customer = s.customers.find((x) => x.id === id);
    if (!customer) throw new Error("Client introuvable");
    return delay({
      ...customer,
      orders: s.orders.filter((o) => o.partner.id === id).slice(0, 20),
      payments: s.payments.filter((x) => x.partner_id === id),
    });
  },

  async customerPayment(
    id: number,
    amount: number,
    method: Exclude<PaymentMethod, "credit">,
  ) {
    const s = db();
    const customer = s.customers.find((x) => x.id === id);
    if (!customer) throw new Error("Client introuvable");
    customer.credit = Math.max(0, customer.credit - amount);
    s.payments.unshift({
      id: s.payments.length + 1,
      partner_id: id,
      name: `P${method === "cash" ? "CASH" : "BNK"}/2026/${String(200 + s.payments.length).padStart(4, "0")}`,
      date: isoDay(0),
      amount,
      journal:
        method === "cash"
          ? "Espèces"
          : method === "mobile_money"
            ? "Mobile Money"
            : "Banque",
    });
    return delay(customer);
  },

  async orders(partnerId?: number) {
    const list = db().orders.filter((o) => !partnerId || o.partner.id === partnerId);
    return delay({ data: list, total: list.length });
  },

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const s = db();
    const customer =
      s.customers.find((x) => x.id === (input.partner_id ?? 1)) ?? s.customers[0]!;
    if (input.payment === "credit" && customer.id === 1) {
      throw new Error("Une vente à crédit nécessite un client identifié");
    }
    const lines = input.lines.map((l) => {
      const product = s.products.find((x) => x.id === l.product_id);
      if (!product) throw new Error("Produit introuvable");
      const price = l.price_unit ?? product.list_price;
      if (input.deliver !== false && product.qty_available !== null)
        product.qty_available -= l.qty;
      return {
        product_id: product.id,
        name: product.name,
        qty: l.qty,
        price_unit: price,
        subtotal: price * l.qty,
      };
    });
    const total = lines.reduce((t, l) => t + l.subtotal, 0);
    if (input.payment === "credit") customer.credit += total;
    const order: Order = {
      id: ++s.seq,
      name: `S${String(s.seq).padStart(5, "0")}`,
      date: new Date().toISOString().slice(0, 19).replace("T", " "),
      partner: { id: customer.id, name: customer.name },
      state: "sale",
      amount_total: total,
      amount_untaxed: Math.round(total / 1.18),
      invoice_status: "invoiced",
      payment_state: input.payment === "credit" ? "not_paid" : "paid",
      lines,
    };
    s.orders.unshift(order);
    return delay(order, 350);
  },

  // --- Achats & Réceptions (pont 360° purchase -> stock) ---
  async purchases() {
    const s = db();
    return delay({ data: s.purchases, total: s.purchases.length });
  },

  async createPurchase(input: {
    supplier_name: string;
    product_id: number;
    qty: number;
    price_unit: number;
    receive_now: boolean;
  }): Promise<PurchaseOrder> {
    const s = db();
    const product = s.products.find((x) => x.id === input.product_id);
    if (!product) throw new Error("Article introuvable");
    if (input.receive_now && product.qty_available !== null) {
      product.qty_available += input.qty;
    }
    const subtotal = input.qty * input.price_unit;
    const po: PurchaseOrder = {
      id: ++s.poSeq,
      name: `P${String(s.poSeq).padStart(5, "0")}`,
      date: new Date().toISOString().slice(0, 19).replace("T", " "),
      partner: { id: 900 + s.poSeq, name: input.supplier_name },
      state: "purchase",
      received: input.receive_now,
      amount_total: subtotal,
      lines: [
        {
          product_id: product.id,
          name: product.name,
          qty: input.qty,
          price_unit: input.price_unit,
          subtotal,
        },
      ],
    };
    s.purchases.unshift(po);
    return delay(po);
  },

  async receivePurchase(poId: number): Promise<PurchaseOrder> {
    const s = db();
    const po = s.purchases.find((x) => x.id === poId);
    if (!po) throw new Error("Commande d'achat introuvable");
    if (!po.received) {
      for (const line of po.lines) {
        const prod = s.products.find((x) => x.id === line.product_id);
        if (prod && prod.qty_available !== null) {
          prod.qty_available += line.qty;
        }
      }
      po.received = true;
    }
    return delay(po);
  },

  // --- Équipe & Dépenses (hr + hr_expense) ---
  async hrOverview(): Promise<HrOverview> {
    const s = db();
    const totalMonth = s.expenses.reduce((acc, x) => acc + x.total_amount, 0);
    const todayStr = isoDay(0);
    const todayCash = s.expenses
      .filter((x) => x.date === todayStr && x.payment_mode !== "own_account")
      .reduce((acc, x) => acc + x.total_amount, 0);
    const payroll = s.employees.reduce((acc, e) => acc + (e.monthly_wage || 0), 0);
    return delay({
      employees: s.employees,
      expenses: s.expenses,
      kpis: {
        total_month_expenses: totalMonth,
        today_cash_out: todayCash,
        total_payroll: payroll,
        employees_count: s.employees.length,
      },
    });
  },

  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    const s = db();
    const emp: Employee = {
      id: s.employees.length + 10,
      name: input.name,
      job_title: input.job_title || "Employé",
      work_phone: input.work_phone || "+224 ",
      department: input.department || "Boutique & Dépôt",
      monthly_wage: input.monthly_wage || 0,
    };
    s.employees.unshift(emp);
    return delay(emp);
  },

  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    const s = db();
    const exp: Expense = {
      id: s.expenses.length + 1,
      name: input.name,
      category: input.category || "Carburant / Groupe Électrogène",
      date: isoDay(0),
      employee: input.employee,
      total_amount: input.total_amount,
      state: "approved",
      payment_mode: input.from_cash !== false ? "company_account" : "own_account",
    };
    s.expenses.unshift(exp);
    return delay(exp);
  },

  // --- Flotte & Livraisons (fleet) ---
  async vehicles(): Promise<Vehicle[]> {
    return delay(db().vehicles);
  },

  async createVehicle(input: {
    name: string;
    vehicle_type: Vehicle["vehicle_type"];
    license_plate: string;
    driver: string;
    route: string;
  }): Promise<Vehicle> {
    const s = db();
    const v: Vehicle = {
      id: s.vehicles.length + 1,
      name: input.name,
      vehicle_type: input.vehicle_type,
      license_plate: input.license_plate,
      driver: input.driver,
      route: input.route,
      odometer: 0,
      monthly_fuel: 0,
      status: "Disponible",
    };
    s.vehicles.push(v);
    return delay(v);
  },

  // --- Passerelle B2B Mobile Money & Webhook ---
  async initiatePayment(input: {
    amount: number;
    provider: GuineaQrProvider;
    customer_phone?: string;
  }): Promise<PaymentIntent> {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase();
    const tx_ref = `LUUMO-QR-${stamp}-${rand}`;
    const merchant_code =
      input.provider === "orange_money"
        ? "620145"
        : input.provider === "mtn_momo"
          ? "664890"
          : "LUUMO-GN-01";
    const amt = Math.round(input.amount);
    const ussd_code =
      input.provider === "orange_money"
        ? `*144*4*1*${merchant_code}*${amt}#`
        : input.provider === "mtn_momo"
          ? `*440*1*${merchant_code}*${amt}#`
          : `PAYCARD:${merchant_code}:${amt}`;
    const qr_payload = JSON.stringify({
      type: "LUUMO_MERCHANT_QR",
      provider: input.provider,
      merchant: merchant_code,
      amount: amt,
      currency: "GNF",
      tx_ref,
    });
    const now = Math.floor(Date.now() / 1000);
    const intent: PaymentIntent = {
      tx_ref,
      provider: input.provider,
      merchant_code,
      amount: amt,
      currency: "GNF",
      customer_phone: input.customer_phone,
      qr_payload,
      ussd_code,
      state: "pending",
      gateway_mode: "local_qr",
      operator_tx_id: null,
      created_at: now,
      expires_at: now + 600,
      confirmed_at: null,
    };
    demoPaymentIntents.set(tx_ref, intent);
    return delay(intent, 120);
  },

  async paymentStatus(txRef: string): Promise<PaymentIntent> {
    const intent = demoPaymentIntents.get(txRef);
    if (!intent) throw new Error("Transaction introuvable");
    return delay(intent, 80);
  },

  async simulatePaymentWebhook(txRef: string): Promise<PaymentIntent> {
    const intent = demoPaymentIntents.get(txRef);
    if (!intent) throw new Error("Transaction introuvable");
    const prefix =
      intent.provider === "orange_money"
        ? "OM"
        : intent.provider === "mtn_momo"
          ? "MOMO"
          : "PYC";
    const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    intent.state = "paid";
    intent.operator_tx_id = `${prefix}${stamp}.${rand}`;
    intent.confirmed_at = Math.floor(Date.now() / 1000);
    return delay(intent, 150);
  },
};

const demoPaymentIntents = new Map<string, PaymentIntent>();
