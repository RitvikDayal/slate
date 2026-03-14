import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getCalendarQueue } from "@/lib/queue/producer";
import { JOB_NAMES } from "@ai-todo/shared";

export async function POST() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const rateLimited = await checkRateLimit(user!.id, "calendar");
  if (rateLimited) return rateLimited;

  const queue = getCalendarQueue();
  await queue.add(
    JOB_NAMES.CALENDAR_SYNC,
    { userId: user!.id },
    {
      jobId: `cal-sync-${user!.id}-${Date.now()}`,
    }
  );

  return NextResponse.json({ queued: true }, { status: 202 });
}

export async function GET() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("calendar_events")
    .select("synced_at")
    .eq("user_id", user!.id)
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to fetch sync status" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    lastSyncedAt: data?.synced_at || null,
  });
}
