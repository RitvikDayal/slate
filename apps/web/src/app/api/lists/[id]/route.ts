import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { updateListSchema } from "@ai-todo/shared";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateListSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { updated_at: clientUpdatedAt, ...updateData } = parsed.data;

  let query = supabase.from("lists").update(updateData).eq("id", id).eq("user_id", user.id);
  if (clientUpdatedAt) {
    query = query.eq("updated_at", clientUpdatedAt);
  }
  const { data, error: dbError } = await query.select();

  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Conflict: 0 rows updated
  if (data.length === 0 && clientUpdatedAt) {
    const { data: current } = await supabase
      .from("lists").select("*").eq("id", id).eq("user_id", user.id).single();
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
  // Prevent deleting inbox
  const { data: list } = await supabase
    .from("lists")
    .select("is_inbox")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (list?.is_inbox)
    return NextResponse.json({ error: "Cannot delete inbox" }, { status: 400 });
  const { error: dbError } = await supabase
    .from("lists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
