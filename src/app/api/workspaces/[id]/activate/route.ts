import { NextResponse, type NextRequest } from "next/server";
import { getClient, errorResponse } from "@/lib/supabase/api-utils";

// PATCH /api/workspaces/:id/activate — switch active workspace
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, userId, errorResponse: clientError } = await getClient();
  if (clientError) return clientError;

  const { id } = await params;

  // Verify the workspace belongs to the user
  const { data: workspace, error: findError } = await supabase!
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId!)
    .single();

  if (findError || !workspace) {
    return errorResponse("Workspace not found", 404);
  }

  // Deactivate all workspaces for this user
  const { error: deactivateError } = await supabase!
    .from("workspaces")
    .update({ is_active: false })
    .eq("user_id", userId!);

  if (deactivateError) {
    return errorResponse(deactivateError.message, 500);
  }

  // Activate the target workspace
  const { data: activated, error: activateError } = await supabase!
    .from("workspaces")
    .update({ is_active: true })
    .eq("id", id)
    .eq("user_id", userId!)
    .select()
    .single();

  if (activateError) {
    return errorResponse(activateError.message, 500);
  }

  return NextResponse.json({ success: true, workspace: activated });
}
