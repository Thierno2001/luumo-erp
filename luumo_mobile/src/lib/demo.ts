import type {
  CreateOrderInput,
  Customer,
  Dashboard,
  Order,
  PaymentMethod,
  Product,
  User,
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

const p = (
  id: number,
  name: string,
  price: number,
  cost: number,
  qty: number,
  category: string,
  uom = "Unité",
  barcode = ""
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
  credit = 0
): Customer => ({
  id,
  name,
  phone,
  email: "",
  street: "",
  city,
  vat: "",
  credit,
});

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
  p(10, "Crédit Orange 50 000 GNF", 50_000, 48_500, 300, "Télécom"),
];

const customers: Customer[] = [
  c(1, "Client comptoir", "", "Conakry"),
  c(2, "Fatoumata Binta Bah", "+224 622 14 58 90", "Ratoma", 1_250_000),
  c(3, "Alpha Oumar Sow", "+224 655 30 21 47", "Matoto", 0),
  c(4, "Boutique Kadiatou — Kaloum", "+224 628 77 09 12", "Kaloum", 3_480_000),
  c(5, "Ibrahima Camara", "+224 664 52 18 33", "Dixinn", 395_000),
  c(6, "Quincaillerie Le Bâtisseur", "+224 620 41 66 05", "Lambanyi", 7_820_000),
];

const orders: Order[] = [
  {
    id: 250,
    name: "S00250",
    date: "2026-10-22 10:15:00",
    partner: { id: 2, name: "Fatoumata Binta Bah" },
    state: "sale",
    amount_total: 970_000,
    amount_untaxed: 822_034,
    invoice_status: "invoiced",
    payment_state: "paid",
    lines: [
      {
        product_id: 1,
        name: "Riz brisé 25 % — sac 50 kg",
        qty: 2,
        price_unit: 485_000,
        subtotal: 970_000,
      },
    ],
  },
  {
    id: 249,
    name: "S00249",
    date: "2026-10-22 09:42:00",
    partner: { id: 4, name: "Boutique Kadiatou — Kaloum" },
    state: "sale",
    amount_total: 790_000,
    amount_untaxed: 669_492,
    invoice_status: "invoiced",
    payment_state: "not_paid",
    lines: [
      {
        product_id: 2,
        name: "Huile végétale Dinor — bidon 20 L",
        qty: 2,
        price_unit: 395_000,
        subtotal: 790_000,
      },
    ],
  },
];

let seq = 250;

export const demo = {
  async dashboard(): Promise<Dashboard> {
    const debtors = customers.filter((cu) => cu.credit > 0);
    const low = products.filter((pr) => (pr.qty_available ?? 0) < 5);
    const todayTotal = orders.reduce((s, o) => s + o.amount_total, 0);
    return {
      kpis: {
        sales_today: todayTotal,
        orders_today: orders.length,
        sales_month: todayTotal + 18_450_000,
        orders_month: orders.length + 24,
        receivables: debtors.reduce((s, cu) => s + cu.credit, 0),
        debtors: debtors.length,
        low_stock_count: low.length,
      },
      sales_7d: [
        { date: "Lun", total: 2_400_000 },
        { date: "Mar", total: 3_150_000 },
        { date: "Mer", total: 1_890_000 },
        { date: "Jeu", total: 4_200_000 },
        { date: "Ven", total: 3_600_000 },
        { date: "Sam", total: 5_100_000 },
        { date: "Auj.", total: todayTotal },
      ],
      low_stock: low,
      top_debtors: [...debtors].sort((a, b) => b.credit - a.credit),
      recent_orders: orders.slice(0, 6),
      currency: DEMO_CURRENCY,
    };
  },

  async products(search = "", barcode?: string): Promise<Product[]> {
    if (barcode) return products.filter((pr) => pr.barcode === barcode);
    if (!search.trim()) return [...products];
    const q = search.toLowerCase();
    return products.filter(
      (pr) =>
        pr.name.toLowerCase().includes(q) ||
        pr.default_code.toLowerCase().includes(q) ||
        pr.barcode.toLowerCase().includes(q)
    );
  },

  async setStock(productId: number, qty: number): Promise<Product> {
    const prod = products.find((x) => x.id === productId);
    if (!prod) throw new Error("Produit introuvable");
    prod.qty_available = qty;
    return { ...prod };
  },

  async createProduct(input: {
    name: string;
    list_price: number;
    standard_price?: number;
    barcode?: string;
    initial_qty?: number;
  }): Promise<Product> {
    const newProd = p(
      products.length + 1,
      input.name,
      input.list_price,
      input.standard_price ?? input.list_price * 0.7,
      input.initial_qty ?? 0,
      "Général",
      "Unité",
      input.barcode ?? ""
    );
    products.unshift(newProd);
    return { ...newProd };
  },

  async customers(search = "", debtorsOnly = false): Promise<Customer[]> {
    return customers
      .filter((cu) => cu.id !== 1)
      .filter((cu) => !debtorsOnly || cu.credit > 0)
      .filter(
        (cu) =>
          !search.trim() ||
          cu.name.toLowerCase().includes(search.toLowerCase()) ||
          cu.phone.toLowerCase().includes(search.toLowerCase())
      );
  },

  async createCustomer(input: { name: string; phone?: string; city?: string }): Promise<Customer> {
    const id = Math.max(...customers.map((x) => x.id)) + 1;
    const created = c(id, input.name, input.phone ?? "", input.city ?? "Conakry", 0);
    customers.push(created);
    return created;
  },

  async customerPayment(
    id: number,
    amount: number,
    _method: Exclude<PaymentMethod, "credit">
  ): Promise<Customer> {
    const cust = customers.find((x) => x.id === id);
    if (!cust) throw new Error("Client introuvable");
    cust.credit = Math.max(0, cust.credit - amount);
    return { ...cust };
  },

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const cust =
      customers.find((x) => x.id === (input.partner_id ?? 1)) ?? customers[0]!;
    if (input.payment === "credit" && cust.id === 1) {
      throw new Error("Sélectionnez un client identifié pour une vente à crédit");
    }
    const lines = input.lines.map((l) => {
      const prod = products.find((x) => x.id === l.product_id);
      if (!prod) throw new Error("Article introuvable");
      const price = l.price_unit ?? prod.list_price;
      if (prod.qty_available !== null) prod.qty_available -= l.qty;
      return {
        product_id: prod.id,
        name: prod.name,
        qty: l.qty,
        price_unit: price,
        subtotal: price * l.qty,
      };
    });
    const total = lines.reduce((s, l) => s + l.subtotal, 0);
    if (input.payment === "credit") cust.credit += total;
    const order: Order = {
      id: ++seq,
      name: `S${String(seq).padStart(5, "0")}`,
      date: new Date().toISOString().slice(0, 19).replace("T", " "),
      partner: { id: cust.id, name: cust.name },
      state: "sale",
      amount_total: total,
      amount_untaxed: Math.round(total / 1.18),
      invoice_status: "invoiced",
      payment_state: input.payment === "credit" ? "not_paid" : "paid",
      lines,
    };
    orders.unshift(order);
    return order;
  },
};
