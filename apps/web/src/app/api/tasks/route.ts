import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { createTaskSchema } from "@ai-todo/shared";

export async function GET(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get("date"); // YYYY-MM-DD
  const status = searchParams.get("status");

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user!.id)
    .order("scheduled_start", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (date) {
    query = query.eq("scheduled_date", date);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error: dbError } = await query;

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error: dbError } = await supabase
    .from("tasks")
    .insert({ ...parsed.data, user_id: user!.id })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
