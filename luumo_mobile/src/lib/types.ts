export type Currency = {
  name: string;
  symbol: string;
  decimals: number;
  position: "before" | "after";
};

export type BusinessPlanId = "retail" | "wholesale" | "services";

export type CompanyPlan = {
  id: BusinessPlanId;
  name: string;
  allowed_apps: string[];
  monthly_price: number;
  description: string;
  badge?: string;
};

export type CompanySubscriptionInfo = {
  current_plan: CompanyPlan;
  allowed_apps: string[];
  enabled_apps: string[];
  status: "active" | "trial" | "past_due" | "expired";
  current_period_end: string;
  days_remaining: number;
  plans: Record<BusinessPlanId, CompanyPlan>;
};

export type User = {
  id: number;
  name: string;
  login: string;
  company: {
    id: number;
    name: string;
    plan?: CompanyPlan;
    enabled_apps?: string[];
    subscription?: CompanySubscriptionInfo;
  };
};

export type Product = {
  id: number;
  name: string;
  default_code: string;
  barcode: string;
  list_price: number;
  standard_price: number;
  qty_available: number | null;
  is_storable: boolean;
  uom: string;
  category: string;
  image_url: string | null;
};

export type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  vat: string;
  credit: number;
};

export type PaymentState = "paid" | "in_payment" | "partial" | "not_paid" | "not_invoiced";

export type OrderLine = {
  product_id: number;
  name: string;
  qty: number;
  price_unit: number;
  subtotal: number;
};

export type Order = {
  id: number;
  name: string;
  date: string;
  partner: { id: number; name: string };
  state: string;
  amount_total: number;
  amount_untaxed: number;
  invoice_status: string;
  payment_state: PaymentState;
  lines: OrderLine[];
};

export type Dashboard = {
  kpis: {
    sales_today: number;
    orders_today: number;
    sales_month: number;
    orders_month: number;
    receivables: number;
    debtors: number;
    low_stock_count: number;
  };
  sales_7d: { date: string; total: number }[];
  low_stock: Product[];
  top_debtors: Customer[];
  recent_orders: Order[];
  currency: Currency;
};

export type PaymentMethod = "cash" | "mobile_money" | "bank" | "credit";

export type CreateOrderInput = {
  partner_id?: number | null;
  lines: { product_id: number; qty: number; price_unit?: number }[];
  payment: PaymentMethod;
  deliver?: boolean;
};
