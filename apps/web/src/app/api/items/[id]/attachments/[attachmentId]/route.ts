import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id, attachmentId } = await params;
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  // Fetch attachment to verify ownership and get storage path
  const { data: attachment, error: fetchError } = await supabase
    .from("attachments")
    .select("*")
    .eq("id", attachmentId)
    .eq("item_id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !attachment) {
    return NextResponse.json(
      { error: "Attachment not found" },
      { status: 404 }
    );
  }

  // Delete from storage if file type
  if (attachment.type === "file") {
    // Extract storage path from URL — path format: {user_id}/{filename}
    const url = new URL(attachment.url);
    const storagePath = url.pathname.split("/storage/v1/object/public/attachments/").pop()
      ?? url.pathname.split("/storage/v1/object/sign/attachments/").pop()
      ?? `${user.id}/${attachment.name}`;

    await supabase.storage.from("attachments").remove([storagePath]);
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
