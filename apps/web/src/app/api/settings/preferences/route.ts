import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { notificationPreferencesSchema } from "@ai-todo/shared";

export async function GET() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user!.id)
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Parse with defaults so missing keys get default values
  const preferences = notificationPreferencesSchema.parse(
    data?.preferences ?? {}
  );

  return NextResponse.json(preferences);
}

export async function PATCH(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = notificationPreferencesSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Fetch current preferences first
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user!.id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const currentPrefs = notificationPreferencesSchema.parse(
    profile?.preferences ?? {}
  );
  const updatedPrefs = { ...currentPrefs, ...parsed.data };

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ preferences: updatedPrefs })
    .eq("id", user!.id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(updatedPrefs);
}
