import type {
  AccountWithBalance,
  TransactionWithAccount,
  CreateAccountInput,
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@/types/database";

const BASE = "/api";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data as T;
}

// ===== Summary =====

export interface SummaryResponse {
  accounts: AccountWithBalance[];
  total_balance: number;
  total_month_spending: number;
  pending_reimbursement_count: number;
  pending_reimbursement_amount: number;
}

export function fetchSummary(): Promise<SummaryResponse> {
  return fetchJSON<SummaryResponse>(`${BASE}/summary`);
}

// ===== Accounts =====

export function fetchAccounts(): Promise<AccountWithBalance[]> {
  return fetchJSON<AccountWithBalance[]>(`${BASE}/accounts`);
}

export function createAccount(
  input: CreateAccountInput
): Promise<AccountWithBalance> {
  return fetchJSON<AccountWithBalance>(`${BASE}/accounts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ===== Transactions =====

export interface FetchTransactionsParams {
  account_id?: string;
  is_company_advance?: boolean;
  reimbursement_status?: string;
  limit?: number;
  offset?: number;
}

export function fetchTransactions(
  params?: FetchTransactionsParams
): Promise<TransactionWithAccount[]> {
  const searchParams = new URLSearchParams();
  if (params?.account_id) searchParams.set("account_id", params.account_id);
  if (params?.is_company_advance)
    searchParams.set("is_company_advance", "true");
  if (params?.reimbursement_status)
    searchParams.set("reimbursement_status", params.reimbursement_status);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const qs = searchParams.toString();
  return fetchJSON<TransactionWithAccount[]>(
    `${BASE}/transactions${qs ? `?${qs}` : ""}`
  );
}

export function createTransaction(
  input: CreateTransactionInput
): Promise<TransactionWithAccount> {
  return fetchJSON<TransactionWithAccount>(`${BASE}/transactions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTransaction(
  id: string,
  input: UpdateTransactionInput
): Promise<TransactionWithAccount> {
  return fetchJSON<TransactionWithAccount>(`${BASE}/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteTransaction(id: string): Promise<{ success: boolean }> {
  return fetchJSON<{ success: boolean }>(`${BASE}/transactions/${id}`, {
    method: "DELETE",
  });
}
