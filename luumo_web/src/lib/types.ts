export type Currency = {
  name: string;
  symbol: string;
  decimals: number;
  position: "before" | "after";
};

export type BusinessPlanId = "retail" | "wholesale" | "services";
export type BusinessProfile = BusinessPlanId;

export type CompanyPlan = {
  id: BusinessPlanId;
  name: string;
  allowed_apps: string[];
  monthly_price: number;
  description: string;
  badge?: string;
};

export type SubscriptionInvoice = {
  id: number;
  number: string;
  date: string;
  plan_name: string;
  amount: number;
  payment_method: string;
  period: string;
  status: "paid" | "pending";
};

export type CompanySubscriptionInfo = {
  current_plan: CompanyPlan;
  allowed_apps: string[];
  enabled_apps: string[];
  status: "active" | "trial" | "past_due" | "expired";
  current_period_end: string;
  days_remaining: number;
  plans: Record<BusinessPlanId, CompanyPlan>;
  invoices: SubscriptionInvoice[];
};

export type CompanyAppsResponse = CompanySubscriptionInfo;

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
  is_company?: boolean;
  company_type?: "person" | "company";
  phone: string;
  email: string;
  street: string;
  city: string;
  vat: string;
  credit: number;
};

export type CreateCustomerInput = {
  name: string;
  is_company?: boolean;
  company_type?: "person" | "company";
  phone?: string;
  email?: string;
  street?: string;
  city?: string;
  vat?: string;
};

export type RegisterCompanyInput = {
  company_name: string;
  admin_name: string;
  login: string;
  phone: string;
  city: string;
  nif_rccm?: string;
  password: string;
  mode?: "live" | "demo";
  business_profile?: BusinessProfile;
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

export type PurchaseOrder = {
  id: number;
  name: string;
  date: string;
  partner: { id: number; name: string };
  state: string;
  received: boolean;
  amount_total: number;
  lines: OrderLine[];
};

export type Employee = {
  id: number;
  name: string;
  job_title: string;
  work_phone: string;
  department: string;
  monthly_wage: number;
};

export type CreateEmployeeInput = {
  name: string;
  job_title?: string;
  work_phone?: string;
  department?: string;
  monthly_wage?: number;
};

export type Expense = {
  id: number;
  name: string;
  category?: string;
  date: string;
  employee: string;
  total_amount: number;
  state: "approved" | "done" | "submitted" | "draft";
  payment_mode?: "company_account" | "own_account";
};

export type CreateExpenseInput = {
  name: string;
  category?: string;
  employee: string;
  total_amount: number;
  from_cash?: boolean;
};

export type HrOverview = {
  employees: Employee[];
  expenses: Expense[];
  kpis?: {
    total_month_expenses: number;
    today_cash_out: number;
    total_payroll: number;
    employees_count: number;
  };
};

export type Vehicle = {
  id: number;
  name: string;
  vehicle_type: "Camion" | "Tricycle (Bombonne)" | "Fourgonnette" | "Moto" | string;
  license_plate: string;
  driver: string;
  route: string;
  odometer: number;
  monthly_fuel: number;
  status: "Opérationnel" | "En tournée" | "Disponible" | "Entretien";
};

export type CreateVehicleInput = {
  name: string;
  vehicle_type: string;
  license_plate: string;
  driver: string;
  route: string;
  monthly_fuel?: number;
  initial_odometer?: number;
};

export type RecordRepairInput = {
  reason: string;
  garage?: string;
  amount: number;
  odometer?: number;
  from_cash?: boolean;
};

export type RecordRepairResponse = {
  vehicle: Vehicle;
  service_id: number;
};

export type CustomerPayment = {
  id: number;
  name: string;
  date: string;
  amount: number;
  journal: string;
};

export type CustomerDetail = Customer & { orders: Order[]; payments: CustomerPayment[] };

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

export type GuineaQrProvider = "orange_money" | "mtn_momo" | "paycard";

export type PaymentIntent = {
  tx_ref: string;
  provider: GuineaQrProvider;
  merchant_code: string;
  amount: number;
  currency: string;
  customer_phone?: string;
  qr_payload: string;
  ussd_code: string;
  state: "pending" | "paid" | "failed" | "expired";
  gateway_mode: "local_qr" | "live_api";
  operator_tx_id: string | null;
  created_at: number;
  expires_at: number;
  confirmed_at: number | null;
};

export type CreateOrderInput = {
  partner_id?: number | null;
  lines: { product_id: number; qty: number; price_unit?: number }[];
  payment: PaymentMethod;
  deliver?: boolean;
};

export type Paged<T> = { data: T[]; total: number };
