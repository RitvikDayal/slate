import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const { id: itemId } = await params;
  let body: { labelId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { error: dbError } = await supabase
    .from("item_labels")
    .insert({ item_id: itemId, label_id: body.labelId });

  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
