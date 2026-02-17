import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedClient, errorResponse } from "@/lib/supabase/api-utils";

// DELETE /api/categories/:id — delete a category
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, errorResponse: authError } =
    await getAuthenticatedClient();
  if (authError) return authError;

  const { id } = await params;

  const { error } = await supabase!
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user!.id);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ success: true });
}
