import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { createListSchema } from "@ai-todo/shared";

export async function GET() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;
  const { data, error: dbError } = await supabase
    .from("lists")
    .select("*")
    .eq("user_id", user.id)
    .order("position");
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createListSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { data, error: dbError } = await supabase
    .from("lists")
    .upsert({ ...parsed.data, user_id: user.id }, { onConflict: "id" })
    .select()
    .single();
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
