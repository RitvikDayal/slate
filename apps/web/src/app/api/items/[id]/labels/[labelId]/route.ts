import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  const { supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const { id: itemId, labelId } = await params;
  const { error: dbError } = await supabase
    .from("item_labels")
    .delete()
    .eq("item_id", itemId)
    .eq("label_id", labelId);

  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
