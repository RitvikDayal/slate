import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const { date } = await params;

  const { data, error: dbError } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", user!.id)
    .eq("date", date)
    .single();

  if (dbError) {
    return NextResponse.json({ error: "No report found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
