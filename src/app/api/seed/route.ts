import { NextResponse } from "next/server";
import { getClient, errorResponse } from "@/lib/supabase/api-utils";
import type { SupabaseClient } from "@supabase/supabase-js";

// --- Per-workspace default data ---

const PERSONAL_ACCOUNTS = [
  { name: "Cash", group: null, initial_balance: 0, sort_order: 0 },
  { name: "SinoPac ATM", group: "sinopac", initial_balance: 0, sort_order: 1 },
  { name: "SinoPac Card", group: "sinopac", initial_balance: 0, sort_order: 2 },
  { name: "Taiwan Bank", group: null, initial_balance: 0, sort_order: 3 },
];

const PERSONAL_CATEGORIES = [
  { name: "Food", emoji: "🍔", sort_order: 0, is_default: true },
  { name: "Transport", emoji: "🚗", sort_order: 1, is_default: true },
  { name: "Living", emoji: "🏠", sort_order: 2, is_default: true },
  { name: "Love", emoji: "❤️", sort_order: 3, is_default: true },
];

const COMPANY_ACCOUNTS = [
  { name: "Taiwan Bank", group: null, initial_balance: 0, sort_order: 0 },
];

const COMPANY_CATEGORIES = [
  { name: "Travel", emoji: "✈️", sort_order: 0, is_default: true },
  { name: "Meals", emoji: "🍱", sort_order: 1, is_default: true },
  { name: "Office", emoji: "🏢", sort_order: 2, is_default: true },
  { name: "Transport", emoji: "🚕", sort_order: 3, is_default: true },
];

// --- Helper: seed accounts + categories for one workspace ---

async function seedWorkspaceData(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  defaultAccounts: typeof PERSONAL_ACCOUNTS,
  defaultCategories: typeof PERSONAL_CATEGORIES
) {
  const result = { accounts: 0, categories: 0, warning: undefined as string | undefined };

  // Seed accounts
  const { data: existingAccounts } = await supabase
    .from("accounts")
    .select("name")
    .eq("workspace_id", workspaceId);

  const existingAccountNames = new Set(
    (existingAccounts || []).map((a: { name: string }) => a.name)
  );

  const accountsToInsert = defaultAccounts
    .filter((a) => !existingAccountNames.has(a.name))
    .map((a) => ({ ...a, user_id: userId, workspace_id: workspaceId }));

  if (accountsToInsert.length > 0) {
    const { data, error } = await supabase
      .from("accounts")
      .insert(accountsToInsert)
      .select();

    if (error) {
      result.warning = error.message;
    } else {
      result.accounts = data?.length ?? 0;
    }
  }

  // Seed categories
  try {
    const { data: existingCats, error: catCheckError } = await supabase
      .from("categories")
      .select("name")
      .eq("workspace_id", workspaceId);

    if (catCheckError) {
      result.warning = catCheckError.message;
    } else {
      const existingCatNames = new Set(
        (existingCats || []).map((c: { name: string }) => c.name)
      );

      const catsToInsert = defaultCategories
        .filter((c) => !existingCatNames.has(c.name))
        .map((c) => ({ ...c, user_id: userId, workspace_id: workspaceId }));

      if (catsToInsert.length > 0) {
        const { data, error } = await supabase
          .from("categories")
          .insert(catsToInsert)
          .select();

        if (error) {
          result.warning = error.message;
        } else {
          result.categories = data?.length ?? 0;
        }
      }
    }
  } catch {
    result.warning = result.warning || "Categories table may not exist yet";
  }

  return result;
}

// POST /api/seed — create workspaces + default accounts & categories
export async function POST() {
  const { supabase, userId, errorResponse: clientError } = await getClient();
  if (clientError) return clientError;

  // 1. Ensure the anonymous profile exists
  await supabase!
    .from("profiles")
    .upsert({ id: userId!, display_name: "Anonymous" }, { onConflict: "id" });

  // 2. Create workspaces if they don't exist
  const workspaceDefs = [
    { name: "Personal", type: "personal", emoji: "🏠", sort_order: 0, is_active: true },
    { name: "Company", type: "company", emoji: "🏢", sort_order: 1, is_active: false },
  ];

  for (const ws of workspaceDefs) {
    await supabase!
      .from("workspaces")
      .upsert(
        { user_id: userId!, ...ws },
        { onConflict: "user_id,name" }
      );
  }

  // 3. Fetch workspaces to get their IDs
  const { data: workspaces, error: wsError } = await supabase!
    .from("workspaces")
    .select("id, name, type")
    .eq("user_id", userId!)
    .order("sort_order");

  if (wsError || !workspaces || workspaces.length === 0) {
    return errorResponse(wsError?.message || "Failed to create workspaces", 500);
  }

  const personalWs = workspaces.find((w: { type: string }) => w.type === "personal");
  const companyWs = workspaces.find((w: { type: string }) => w.type === "company");

  // 4. Seed Personal workspace
  let personalResult = { accounts: 0, categories: 0, warning: undefined as string | undefined };
  if (personalWs) {
    personalResult = await seedWorkspaceData(
      supabase!,
      userId!,
      personalWs.id,
      PERSONAL_ACCOUNTS,
      PERSONAL_CATEGORIES
    );
  }

  // 5. Seed Company workspace
  let companyResult = { accounts: 0, categories: 0, warning: undefined as string | undefined };
  if (companyWs) {
    companyResult = await seedWorkspaceData(
      supabase!,
      userId!,
      companyWs.id,
      COMPANY_ACCOUNTS,
      COMPANY_CATEGORIES
    );
  }

  const warnings = [personalResult.warning, companyResult.warning].filter(Boolean);

  return NextResponse.json({
    message: [
      `Personal: ${personalResult.accounts} account(s), ${personalResult.categories} category(ies)`,
      `Company: ${companyResult.accounts} account(s), ${companyResult.categories} category(ies)`,
    ].join("; "),
    workspaces: workspaces.length,
    personal: personalResult,
    company: companyResult,
    ...(warnings.length > 0 && { warnings }),
  }, { status: 201 });
}
