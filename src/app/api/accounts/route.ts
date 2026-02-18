import { NextResponse, type NextRequest } from "next/server";
import { getClient, errorResponse } from "@/lib/supabase/api-utils";
import { createAccountSchema } from "@/lib/validations";

// GET /api/accounts — list accounts (balances computed by /api/summary)
export async function GET() {
  const { supabase, userId, workspaceId, errorResponse: clientError } = await getClient();
  if (clientError) return clientError;
  if (!workspaceId) return errorResponse("No active workspace", 400);

  const { data: accounts, error } = await supabase!
    .from("accounts")
    .select("*")
    .eq("user_id", userId!)
    .eq("workspace_id", workspaceId)
    .eq("is_archived", false)
    .order("sort_order");

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json(
    accounts.map((a: Record<string, unknown>) => ({
      ...a,
      current_balance: a.initial_balance,
      month_spending: 0,
    }))
  );
}

// POST /api/accounts — create a new account
export async function POST(request: NextRequest) {
  const { supabase, userId, workspaceId, errorResponse: clientError } = await getClient();
  if (clientError) return clientError;
  if (!workspaceId) return errorResponse("No active workspace", 400);

  const body = await request.json();
  const parsed = createAccountSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  // Get max sort_order for this workspace
  const { data: maxOrder } = await supabase!
    .from("accounts")
    .select("sort_order")
    .eq("user_id", userId!)
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = maxOrder ? maxOrder.sort_order + 1 : 0;

  const { data, error } = await supabase!
    .from("accounts")
    .insert({
      user_id: userId!,
      workspace_id: workspaceId,
      name: parsed.data.name,
      initial_balance: parsed.data.initial_balance,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("Account name already exists");
    }
    return errorResponse(error.message, 500);
  }

  return NextResponse.json(data, { status: 201 });
}
