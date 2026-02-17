import { NextResponse } from "next/server";
import { getAuthenticatedClient, errorResponse } from "@/lib/supabase/api-utils";

// GET /api/summary — home page aggregated data
export async function GET() {
  const { supabase, user, errorResponse: authError } =
    await getAuthenticatedClient();
  if (authError) return authError;

  // Fetch accounts
  const { data: accounts, error: accountsError } = await supabase!
    .from("accounts")
    .select("*")
    .eq("user_id", user!.id)
    .eq("is_archived", false)
    .order("sort_order");

  if (accountsError) {
    return errorResponse(accountsError.message, 500);
  }

  // Fetch all transactions for balance and month spending calculation
  const { data: transactions, error: txError } = await supabase!
    .from("transactions")
    .select("account_id, amount, date, is_company_advance, reimbursement_status")
    .eq("user_id", user!.id);

  if (txError) {
    return errorResponse(txError.message, 500);
  }

  // Calculate current month start
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  // Compute balances and spending per account
  const accountsWithBalance = accounts.map((account: Record<string, unknown>) => {
    const accountTxns = transactions.filter(
      (t: Record<string, unknown>) => t.account_id === account.id
    );

    const totalAmount = accountTxns.reduce(
      (sum: number, t: Record<string, unknown>) => sum + (t.amount as number),
      0
    );

    const monthSpending = accountTxns
      .filter((t: Record<string, unknown>) => (t.date as string) >= monthStart && (t.amount as number) < 0)
      .reduce((sum: number, t: Record<string, unknown>) => sum + (t.amount as number), 0);

    return {
      ...account,
      current_balance: (account.initial_balance as number) + totalAmount,
      month_spending: Math.abs(monthSpending),
    };
  });

  // Count pending reimbursements
  const pendingReimbursements = transactions.filter(
    (t: Record<string, unknown>) =>
      t.is_company_advance === true && t.reimbursement_status === "pending"
  );

  const pendingCount = pendingReimbursements.length;
  const pendingAmount = pendingReimbursements.reduce(
    (sum: number, t: Record<string, unknown>) => sum + Math.abs(t.amount as number),
    0
  );

  // Totals
  const totalBalance = accountsWithBalance.reduce(
    (sum: number, a: Record<string, unknown>) => sum + (a.current_balance as number),
    0
  );
  const totalMonthSpending = accountsWithBalance.reduce(
    (sum: number, a: Record<string, unknown>) => sum + (a.month_spending as number),
    0
  );

  return NextResponse.json({
    accounts: accountsWithBalance,
    total_balance: totalBalance,
    total_month_spending: totalMonthSpending,
    pending_reimbursement_count: pendingCount,
    pending_reimbursement_amount: pendingAmount,
  });
}
