export type ProjectStatus =
  | "draft"
  | "quoted"
  | "accepted"
  | "escrowed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export type QuoteStatus =
  | "generating"
  | "draft"
  | "approved"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired";

export type MilestoneStatus =
  | "pending"
  | "funded"
  | "in_progress"
  | "release_requested"
  | "released"
  | "disputed"
  | "refunded";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  business_type: string | null;
  trade_category: string | null;
  country_code: string;
  currency_code: string;
  onechain_address: string | null;
  onboarding_completed: boolean;
  created_at: string;
}

export interface BaseOverheads {
  id: string;
  user_id: string;
  insurance_monthly: number;
  vehicle_monthly: number;
  tools_equipment_monthly: number;
  software_monthly: number;
  rent_workspace_monthly: number;
  phone_internet_monthly: number;
  accounting_monthly: number;
  marketing_monthly: number;
  training_monthly: number;
  other_fixed_monthly: number;
  other_fixed_description: string | null;
  income_tax_rate: number;
  national_insurance_rate: number;
  vat_registered: boolean;
  vat_rate: number;
  working_days_per_week: number;
  working_weeks_per_year: number;
  working_hours_per_day: number;
  desired_annual_salary: number;
  desired_profit_margin: number;
  total_monthly_overheads: number;
  total_annual_overheads: number;
  billable_days_per_year: number;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  client_name: string | null;
  client_email: string | null;
  project_type: string | null;
  description: string | null;
  estimated_duration_days: number | null;
  total_quoted_amount: number;
  total_funded_amount: number;
  total_released_amount: number;
  status: ProjectStatus;
  escrow_object_id: string | null;
  client_access_token: string;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  project_id: string;
  user_id: string;
  version: number;
  title: string;
  summary: string | null;
  line_items: LineItem[];
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  currency_code: string;
  labor_hours: number | null;
  labor_cost: number | null;
  material_cost: number | null;
  overhead_allocation: number | null;
  break_even_amount: number | null;
  profit_amount: number | null;
  profit_margin_percent: number | null;
  min_daily_rate: number | null;
  recommended_daily_rate: number | null;
  is_profitable: boolean | null;
  pdf_url: string | null;
  status: QuoteStatus;
  content_hash: string | null;
  created_at: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface Milestone {
  id: string;
  project_id: string;
  quote_id: string | null;
  title: string;
  description: string | null;
  sequence_number: number;
  amount_fiat: number;
  amount_usdc: number | null;
  status: MilestoneStatus;
  on_chain_index: number | null;
  funded_tx_digest: string | null;
  released_tx_digest: string | null;
  created_at: string;
}
