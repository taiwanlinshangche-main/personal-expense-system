import { NextResponse, type NextRequest } from "next/server";
import { getClient, errorResponse } from "@/lib/supabase/api-utils";

// DELETE /api/categories/:id — delete a category
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, userId, workspaceId, errorResponse: clientError } = await getClient();
  if (clientError) return clientError;
  if (!workspaceId) return errorResponse("No active workspace", 400);

  const { id } = await params;

  const { error } = await supabase!
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId!)
    .eq("workspace_id", workspaceId)

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ success: true });
}
