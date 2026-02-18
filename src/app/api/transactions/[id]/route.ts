import { NextResponse, type NextRequest } from "next/server";
import { getClient, errorResponse } from "@/lib/supabase/api-utils";
import { updateTransactionSchema } from "@/lib/validations";

// PATCH /api/transactions/:id — update a transaction
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, userId, workspaceId, errorResponse: clientError } = await getClient();
  if (clientError) return clientError;
  if (!workspaceId) return errorResponse("No active workspace", 400);

  const { id } = await params;
  const body = await request.json();
  const parsed = updateTransactionSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  // Build update object, only include provided fields
  const updateData: Record<string, unknown> = {};
  const d = parsed.data;

  if (d.reimbursement_status !== undefined) {
    updateData.reimbursement_status = d.reimbursement_status;
  }
  if (d.amount !== undefined) updateData.amount = d.amount;
  if (d.note !== undefined) updateData.note = d.note;
  if (d.date !== undefined) updateData.date = d.date;
  if (d.account_id !== undefined) updateData.account_id = d.account_id;
  if (d.is_company_advance !== undefined) {
    updateData.is_company_advance = d.is_company_advance;
    if (!d.is_company_advance) {
      updateData.reimbursement_status = null;
    }
  }

  const { data, error } = await supabase!
    .from("transactions")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId!)
    .eq("workspace_id", workspaceId)
    .select("*, accounts!inner(name)")
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  if (!data) {
    return errorResponse("Transaction not found", 404);
  }

  const transaction = {
    ...data,
    account_name: (data as Record<string, unknown> & { accounts: { name: string } }).accounts.name,
    accounts: undefined,
  };

  return NextResponse.json(transaction);
}

// DELETE /api/transactions/:id — delete a transaction
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, userId, workspaceId, errorResponse: clientError } = await getClient();
  if (clientError) return clientError;
  if (!workspaceId) return errorResponse("No active workspace", 400);

  const { id } = await params;

  const { error } = await supabase!
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId!)
    .eq("workspace_id", workspaceId);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ success: true });
}
