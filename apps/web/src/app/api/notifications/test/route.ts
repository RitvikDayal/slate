import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export async function POST() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("notifications")
    .insert({
      user_id: user!.id,
      channel: "in_app",
      title: "Test notification",
      body: "This is a test notification to verify your setup is working.",
      ref_type: "task",
      ref_id: null,
      scheduled_for: new Date().toISOString(),
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
