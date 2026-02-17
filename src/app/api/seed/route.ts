import { NextResponse } from "next/server";
import { getAuthenticatedClient, errorResponse } from "@/lib/supabase/api-utils";

const DEFAULT_CATEGORIES = [
  { name: "Food", emoji: "🍔", sort_order: 0, is_default: true },
  { name: "Transport", emoji: "🚗", sort_order: 1, is_default: true },
  { name: "Living", emoji: "🏠", sort_order: 2, is_default: true },
  { name: "Love", emoji: "❤️", sort_order: 3, is_default: true },
];

const DEFAULT_ACCOUNTS = [
  { name: "Cash", group: null, initial_balance: 0, sort_order: 0 },
  { name: "SinoPac ATM", group: "sinopac", initial_balance: 0, sort_order: 1 },
  { name: "SinoPac Card", group: "sinopac", initial_balance: 0, sort_order: 2 },
  { name: "Taiwan Bank", group: null, initial_balance: 0, sort_order: 3 },
];

// POST /api/seed — create default accounts for the logged-in user
export async function POST() {
  const { supabase, user, errorResponse: authError } =
    await getAuthenticatedClient();
  if (authError) return authError;

  // Check if user already has accounts
  const { data: existing, error: checkError } = await supabase!
    .from("accounts")
    .select("id, name")
    .eq("user_id", user!.id);

  if (checkError) {
    return errorResponse(checkError.message, 500);
  }

  const existingNames = new Set((existing || []).map((a: { name: string }) => a.name));

  // Only insert accounts that don't already exist
  const toInsert = DEFAULT_ACCOUNTS
    .filter((a) => !existingNames.has(a.name))
    .map((a) => ({ ...a, user_id: user!.id }));

  if (toInsert.length === 0) {
    return NextResponse.json({
      message: "All accounts already exist",
      accounts: existing,
    });
  }

  const { data: created, error: insertError } = await supabase!
    .from("accounts")
    .insert(toInsert)
    .select();

  if (insertError) {
    return errorResponse(insertError.message, 500);
  }

  // --- Seed categories ---
  const { data: existingCats, error: catCheckError } = await supabase!
    .from("categories")
    .select("id, name")
    .eq("user_id", user!.id);

  if (catCheckError) {
    return errorResponse(catCheckError.message, 500);
  }

  const existingCatNames = new Set((existingCats || []).map((c: { name: string }) => c.name));

  const catsToInsert = DEFAULT_CATEGORIES
    .filter((c) => !existingCatNames.has(c.name))
    .map((c) => ({ ...c, user_id: user!.id }));

  let createdCats: unknown[] = [];
  if (catsToInsert.length > 0) {
    const { data: catData, error: catInsertError } = await supabase!
      .from("categories")
      .insert(catsToInsert)
      .select();

    if (catInsertError) {
      return errorResponse(catInsertError.message, 500);
    }
    createdCats = catData || [];
  }

  return NextResponse.json({
    message: `Created ${created.length} account(s), ${createdCats.length} category(ies)`,
    created,
    createdCats,
    existing: existing || [],
  }, { status: 201 });
}
