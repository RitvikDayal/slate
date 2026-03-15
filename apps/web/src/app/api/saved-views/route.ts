import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { createSavedViewSchema } from "@ai-todo/shared";

export async function GET() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("saved_views")
    .select("*")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSavedViewSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  // Get next position (skip if client provided one)
  let position = parsed.data.position;
  if (position === undefined) {
    const { data: lastView } = await supabase
      .from("saved_views")
      .select("position")
      .eq("user_id", user.id)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    position = lastView ? lastView.position + 1 : 0;
  }

  const { data, error: dbError } = await supabase
    .from("saved_views")
    .upsert({ ...parsed.data, user_id: user.id, position }, { onConflict: "id" })
    .select()
    .single();

  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
