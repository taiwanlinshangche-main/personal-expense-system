import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

// Fixed user ID for single-user mode (no auth)
const ANON_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Get Supabase client using service role key (bypasses RLS).
 * Returns a fixed user ID since there is no auth.
 */
export async function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return {
      supabase: null,
      userId: null,
      workspaceId: null,
      errorResponse: NextResponse.json(
        {
          error:
            "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
        },
        { status: 503 }
      ),
    };
  }

  const supabase = createServerClient(url, serviceKey);

  // Look up active workspace for the user
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", ANON_USER_ID)
    .eq("is_active", true)
    .single();

  return {
    supabase,
    userId: ANON_USER_ID,
    workspaceId: (workspace?.id as string) ?? null,
    errorResponse: null,
  };
}

/**
 * Standard error response.
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}
