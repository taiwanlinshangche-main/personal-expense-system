import { NextResponse, type NextRequest } from "next/server";
import { getClient, errorResponse } from "@/lib/supabase/api-utils";
import { createTransactionSchema } from "@/lib/validations";

// GET /api/transactions — list transactions with account name
export async function GET(request: NextRequest) {
  const { supabase, userId, workspaceId, errorResponse: clientError } = await getClient();
  if (clientError) return clientError;
  if (!workspaceId) return errorResponse("No active workspace", 400);

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account_id");
  const isCompanyAdvance = searchParams.get("is_company_advance");
  const reimbursementStatus = searchParams.get("reimbursement_status");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase!
    .from("transactions")
    .select("*, accounts!inner(name)")
    .eq("user_id", userId!)
    .eq("workspace_id", workspaceId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  if (isCompanyAdvance === "true") {
    query = query.eq("is_company_advance", true);
  }

  if (reimbursementStatus) {
    query = query.eq("reimbursement_status", reimbursementStatus);
  }

  const { data, error } = await query;

  if (error) {
    return errorResponse(error.message, 500);
  }

  // Flatten the account name from the join
  const transactions = data.map(
    (t: Record<string, unknown> & { accounts: { name: string } }) => ({
      ...t,
      account_name: t.accounts.name,
      accounts: undefined,
    })
  );

  return NextResponse.json(transactions);
}

// POST /api/transactions — create a new transaction
export async function POST(request: NextRequest) {
  const { supabase, userId, workspaceId, errorResponse: clientError } = await getClient();
  if (clientError) return clientError;
  if (!workspaceId) return errorResponse("No active workspace", 400);

  const body = await request.json();
  const parsed = createTransactionSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  // Verify the account belongs to the user and workspace
  const { data: account } = await supabase!
    .from("accounts")
    .select("id")
    .eq("id", parsed.data.account_id)
    .eq("user_id", userId!)
    .eq("workspace_id", workspaceId)
    .single();

  if (!account) {
    return errorResponse("Account not found");
  }

  const { data, error } = await supabase!
    .from("transactions")
    .insert({
      user_id: userId!,
      workspace_id: workspaceId,
      account_id: parsed.data.account_id,
      amount: parsed.data.amount,
      note: parsed.data.note,
      date: parsed.data.date,
      category: parsed.data.category,
      is_company_advance: parsed.data.is_company_advance,
      reimbursement_status: parsed.data.is_company_advance
        ? "pending"
        : null,
    })
    .select("*, accounts!inner(name)")
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  const transaction = {
    ...data,
    account_name: (data as Record<string, unknown> & { accounts: { name: string } }).accounts.name,
    accounts: undefined,
  };

  return NextResponse.json(transaction, { status: 201 });
}
