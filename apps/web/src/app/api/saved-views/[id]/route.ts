import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { updateSavedViewSchema } from "@ai-todo/shared";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSavedViewSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { updated_at: clientUpdatedAt, ...updateData } = parsed.data;

  let query = supabase.from("saved_views").update(updateData).eq("id", id).eq("user_id", user.id);
  if (clientUpdatedAt) {
    query = query.eq("updated_at", clientUpdatedAt);
  }
  const { data, error: dbError } = await query.select();

  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Conflict: 0 rows updated
  if (data.length === 0 && clientUpdatedAt) {
    const { data: current } = await supabase
      .from("saved_views").select("*").eq("id", id).eq("user_id", user.id).single();
    return NextResponse.json({ conflict: true, current });
  }

  return NextResponse.json(data[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const { error: dbError } = await supabase
    .from("saved_views")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
