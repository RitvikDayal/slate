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
    .from("daily_schedules")
    .select("*")
    .eq("user_id", user!.id)
    .eq("date", date)
    .single();

  if (dbError)
    return NextResponse.json({ error: "No schedule found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;
  const { date } = await params;
  const body = await request.json();

  const { data, error: dbError } = await supabase
    .from("daily_schedules")
    .update({
      user_confirmed: body.user_confirmed ?? undefined,
      status: body.status ?? undefined,
    })
    .eq("user_id", user!.id)
    .eq("date", date)
    .select()
    .single();

  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}
