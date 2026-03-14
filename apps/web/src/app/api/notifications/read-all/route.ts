import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export async function POST() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const { error: dbError } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user!.id)
    .eq("channel", "in_app")
    .is("read_at", null);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
