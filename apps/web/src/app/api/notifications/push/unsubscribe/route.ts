import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export async function POST() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ push_subscription: null })
    .eq("id", user!.id);

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
