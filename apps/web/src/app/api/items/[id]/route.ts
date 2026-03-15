import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { updateItemSchema } from "@ai-todo/shared";

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
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { label_ids, ...updateData } = parsed.data;
  // Handle completion timestamps
  if (updateData.is_completed === true) {
    (updateData as Record<string, unknown>).completed_at =
      new Date().toISOString();
  } else if (updateData.is_completed === false) {
    (updateData as Record<string, unknown>).completed_at = null;
  }
  const { data, error: dbError } = await supabase
    .from("items")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  if (label_ids !== undefined) {
    await supabase.from("item_labels").delete().eq("item_id", id);
    if (label_ids.length > 0) {
      await supabase
        .from("item_labels")
        .insert(
          label_ids.map((lid) => ({ item_id: data.id, label_id: lid }))
        );
    }
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;
  const { error: dbError } = await supabase
    .from("items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
