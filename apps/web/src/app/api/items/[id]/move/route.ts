import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { moveItemSchema } from "@ai-todo/shared";

export async function POST(
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
  const parsed = moveItemSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const updateData: Record<string, unknown> = {
    list_id: parsed.data.target_list_id,
  };
  if (parsed.data.position !== undefined)
    updateData.position = parsed.data.position;
  const { data, error: dbError } = await supabase
    .from("items")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}
