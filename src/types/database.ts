export type ReimbursementStatus = "pending" | "claimed" | "paid";

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  initial_balance: number;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  group?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  note: string;
  date: string;
  category?: string;
  is_company_advance: boolean;
  reimbursement_status: ReimbursementStatus | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  emoji: string;
  budget: number;
  spent: number;
  color: string;
}

// Computed view types (from API responses)
export interface AccountWithBalance extends Account {
  current_balance: number;
  month_spending: number;
}

export interface TransactionWithAccount extends Transaction {
  account_name: string;
}

// Form input types
export interface CreateAccountInput {
  name: string;
  initial_balance: number;
}

export interface CreateTransactionInput {
  account_id: string;
  amount: number;
  note: string;
  date: string;
  is_company_advance: boolean;
}

export interface UpdateTransactionInput {
  id: string;
  reimbursement_status?: ReimbursementStatus;
  amount?: number;
  note?: string;
  date?: string;
  account_id?: string;
  is_company_advance?: boolean;
}
