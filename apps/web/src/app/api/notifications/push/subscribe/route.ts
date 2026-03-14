import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subscription } = body;
  if (!subscription) {
    return NextResponse.json(
      { error: "Missing subscription" },
      { status: 400 }
    );
  }

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ push_subscription: subscription })
    .eq("id", user!.id);

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
