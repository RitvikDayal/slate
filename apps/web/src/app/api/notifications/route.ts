import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
    50
  );
  const offset = Math.max(
    parseInt(searchParams.get("offset") || "0", 10) || 0,
    0
  );

  const { data, error: dbError } = await supabase
    .from("notifications")
    .select("id, title, body, channel, read_at, created_at, ref_type, ref_id")
    .eq("user_id", user!.id)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
