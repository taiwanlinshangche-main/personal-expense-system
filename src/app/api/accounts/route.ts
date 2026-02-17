import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedClient, errorResponse } from "@/lib/supabase/api-utils";
import { createAccountSchema } from "@/lib/validations";

// GET /api/accounts — list accounts with computed balances
export async function GET() {
  const { supabase, user, errorResponse: authError } =
    await getAuthenticatedClient();
  if (authError) return authError;

  // Use a raw query for the computed balance + month spending
  const { data, error } = await supabase!.rpc("get_accounts_with_balance", {
    p_user_id: user!.id,
  });

  if (error) {
    // Fallback: if the RPC doesn't exist yet, use simple query
    const { data: accounts, error: fallbackError } = await supabase!
      .from("accounts")
      .select("*")
      .eq("is_archived", false)
      .order("sort_order");

    if (fallbackError) {
      return errorResponse(fallbackError.message, 500);
    }

    // Return accounts without computed fields as fallback
    return NextResponse.json(
      accounts.map((a: Record<string, unknown>) => ({
        ...a,
        current_balance: a.initial_balance,
        month_spending: 0,
      }))
    );
  }

  return NextResponse.json(data);
}

// POST /api/accounts — create a new account
export async function POST(request: NextRequest) {
  const { supabase, user, errorResponse: authError } =
    await getAuthenticatedClient();
  if (authError) return authError;

  const body = await request.json();
  const parsed = createAccountSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  // Get max sort_order for this user
  const { data: maxOrder } = await supabase!
    .from("accounts")
    .select("sort_order")
    .eq("user_id", user!.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = maxOrder ? maxOrder.sort_order + 1 : 0;

  const { data, error } = await supabase!
    .from("accounts")
    .insert({
      user_id: user!.id,
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
