import { NextResponse, type NextRequest } from "next/server";
import { getClient, errorResponse } from "@/lib/supabase/api-utils";
import { createCategorySchema } from "@/lib/validations";

// GET /api/categories — list user's categories
export async function GET() {
  const { supabase, userId, workspaceId, errorResponse: clientError } = await getClient();
  if (clientError) return clientError;
  if (!workspaceId) return errorResponse("No active workspace", 400);

  const { data, error } = await supabase!
    .from("categories")
    .select("*")
    .eq("user_id", userId!)
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    // If categories table doesn't exist yet, return empty array gracefully
    if (error.message.includes("does not exist") || error.code === "42P01") {
      return NextResponse.json([]);
    }
    return errorResponse(error.message, 500);
  }

  return NextResponse.json(data);
}

// POST /api/categories — create a new category
export async function POST(request: NextRequest) {
  const { supabase, userId, workspaceId, errorResponse: clientError } = await getClient();
  if (clientError) return clientError;
  if (!workspaceId) return errorResponse("No active workspace", 400);

  const body = await request.json();
  const parsed = createCategorySchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  // Get max sort_order for this workspace
  const { data: existing } = await supabase!
    .from("categories")
    .select("sort_order")
    .eq("user_id", userId!)
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase!
    .from("categories")
    .insert({
      user_id: userId!,
      workspace_id: workspaceId,
      name: parsed.data.name,
      emoji: parsed.data.emoji,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("Category already exists");
    }
    return errorResponse(error.message, 500);
  }

  return NextResponse.json(data, { status: 201 });
}
