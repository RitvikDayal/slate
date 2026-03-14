import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export async function GET() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const { data: profile } = await supabase
    .from("profiles")
    .select("slack_channels")
    .eq("id", user!.id)
    .single();

  return NextResponse.json({ channels: profile?.slack_channels || [] });
}

export async function PATCH(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { channels } = body as { channels?: string[] };
  if (!Array.isArray(channels)) {
    return NextResponse.json(
      { error: "channels must be an array of strings" },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ slack_channels: channels })
    .eq("id", user!.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ channels });
}
