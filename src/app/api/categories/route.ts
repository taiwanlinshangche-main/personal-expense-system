import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedClient, errorResponse } from "@/lib/supabase/api-utils";
import { createCategorySchema } from "@/lib/validations";

// GET /api/categories — list user's categories
export async function GET() {
  const { supabase, user, errorResponse: authError } =
    await getAuthenticatedClient();
  if (authError) return authError;

  const { data, error } = await supabase!
    .from("categories")
    .select("*")
    .eq("user_id", user!.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json(data);
}

// POST /api/categories — create a new category
export async function POST(request: NextRequest) {
  const { supabase, user, errorResponse: authError } =
    await getAuthenticatedClient();
  if (authError) return authError;

  const body = await request.json();
  const parsed = createCategorySchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  // Get max sort_order for this user
  const { data: existing } = await supabase!
    .from("categories")
    .select("sort_order")
    .eq("user_id", user!.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase!
    .from("categories")
    .insert({
      user_id: user!.id,
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
