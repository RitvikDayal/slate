import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end query parameters are required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start) || !dateRegex.test(end)) {
    return NextResponse.json(
      { error: "start and end must be in YYYY-MM-DD format" },
      { status: 400 }
    );
  }

  const [eventsResult, tasksResult] = await Promise.all([
    supabase
      .from("calendar_events")
      .select(
        "id, google_event_id, title, description, start_time, end_time, is_all_day, location, synced_at"
      )
      .eq("user_id", user!.id)
      .gte("start_time", `${start}T00:00:00`)
      .lte("start_time", `${end}T23:59:59`)
      .order("start_time", { ascending: true }),
    supabase
      .from("items")
      .select(
        "id, title, due_date, scheduled_date, scheduled_start, scheduled_end, is_completed, priority"
      )
      .eq("user_id", user!.id)
      .eq("is_archived", false)
      .or(
        `and(due_date.gte.${start},due_date.lte.${end}),and(scheduled_date.gte.${start},scheduled_date.lte.${end})`
      ),
  ]);

  if (eventsResult.error) {
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }

  if (tasksResult.error) {
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    events: eventsResult.data,
    tasks: tasksResult.data,
  });
}
