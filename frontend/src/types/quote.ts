export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  parsedQuote?: ParsedQuoteResponse | null;
  profitAnalysis?: ProfitAnalysisResponse | null;
  timestamp: Date;
}

export interface ParsedQuoteResponse {
  project_type: string;
  title: string;
  summary: string;
  duration_days: number;
  line_items: {
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
  }[];
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  milestones: {
    title: string;
    description: string;
    percentage: number;
  }[];
}

export interface ProfitAnalysisResponse {
  labor_hours: number;
  labor_cost: number;
  material_cost: number;
  overhead_allocation: number;
  total_cost: number;
  break_even_amount: number;
  recommended_quote: number;
  profit_amount: number;
  profit_margin_percent: number;
  min_daily_rate: number;
  is_profitable: boolean;
  warnings: string[];
}

export interface ChatApiResponse {
  message: string;
  parsed_quote: ParsedQuoteResponse | null;
  profit_analysis: ProfitAnalysisResponse | null;
  conversation_id: string;
  requires_clarification: boolean;
  clarification_questions: string[];
}

export interface Conversation {
  id: string;
  title: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail {
  conversation: Conversation;
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    parsed_quote: ParsedQuoteResponse | null;
    profit_analysis: ProfitAnalysisResponse | null;
    created_at: string;
  }[];
}
