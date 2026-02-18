import { NextResponse } from "next/server";
import { getClient, errorResponse } from "@/lib/supabase/api-utils";

// GET /api/workspaces — list all workspaces for the user
export async function GET() {
  const { supabase, userId, errorResponse: clientError } = await getClient();
  if (clientError) return clientError;

  const { data, error } = await supabase!
    .from("workspaces")
    .select("*")
    .eq("user_id", userId!)
    .order("sort_order", { ascending: true });

  if (error) {
    // If workspaces table doesn't exist yet, return empty array
    if (error.message.includes("does not exist") || error.code === "42P01") {
      return NextResponse.json([]);
    }
    return errorResponse(error.message, 500);
  }

  return NextResponse.json(data);
}
