import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { createAttachmentSchema } from "@ai-todo/shared";

const STORAGE_QUOTA_BYTES = 104857600; // 100 MB

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  // Verify item belongs to user
  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (itemError || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const { data, error: dbError } = await supabase
    .from("attachments")
    .select("*")
    .eq("item_id", id)
    .order("position");

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  // Verify item belongs to user
  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (itemError || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createAttachmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const attachmentData = parsed.data;

  // Quota check for file attachments
  if (attachmentData.type === "file" && attachmentData.size_bytes) {
    const { data: quotaResult, error: quotaError } = await supabase.rpc(
      "check_user_storage_quota",
      { p_user_id: user.id }
    );

    if (quotaError) {
      return NextResponse.json(
        { error: "Failed to check storage quota" },
        { status: 500 }
      );
    }

    const currentUsage = quotaResult as number;
    if (currentUsage + attachmentData.size_bytes > STORAGE_QUOTA_BYTES) {
      return NextResponse.json(
        { error: "Storage quota exceeded (100 MB limit)" },
        { status: 413 }
      );
    }
  }

  const { data, error: dbError } = await supabase
    .from("attachments")
    .insert({
      item_id: id,
      user_id: user.id,
      type: attachmentData.type,
      name: attachmentData.name,
      url: attachmentData.url,
      mime_type: attachmentData.mime_type ?? null,
      size_bytes: attachmentData.size_bytes ?? null,
      thumbnail_url: attachmentData.thumbnail_url ?? null,
      position: attachmentData.position ?? 0,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
