import { NextResponse } from "next/server";
import { createClient } from "./server";

/**
 * Get authenticated Supabase client + user, or return error response.
 */
export async function getAuthenticatedClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return {
      supabase: null,
      user: null,
      errorResponse: NextResponse.json(
        { error: "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local" },
        { status: 503 }
      ),
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        supabase: null,
        user: null,
        errorResponse: NextResponse.json(
          { error: "Unauthorized, please log in" },
          { status: 401 }
        ),
      };
    }

    return { supabase, user, errorResponse: null };
  } catch (err) {
    return {
      supabase: null,
      user: null,
      errorResponse: NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to connect to database" },
        { status: 500 }
      ),
    };
  }
}

/**
 * Standard error response.
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}
