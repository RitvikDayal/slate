import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { startOfWeek, endOfWeek, format } from "date-fns";
import type { WeeklyReport, DailyReportSummary, WeeklyTotals } from "@ai-todo/shared";

export async function GET(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;

  const weekParam = request.nextUrl.searchParams.get("week");
  if (!weekParam) {
    return NextResponse.json(
      { error: "week query parameter is required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const targetDate = new Date(weekParam + "T00:00:00");
  const monday = startOfWeek(targetDate, { weekStartsOn: 1 });
  const sunday = endOfWeek(targetDate, { weekStartsOn: 1 });
  const startDate = format(monday, "yyyy-MM-dd");
  const endDate = format(sunday, "yyyy-MM-dd");

  const { data: reports, error: dbError } = await supabase
    .from("daily_reports")
    .select(
      "date, tasks_completed, tasks_pending, tasks_cancelled, total_focus_minutes, ai_summary"
    )
    .eq("user_id", user!.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const dailyReports: DailyReportSummary[] = (reports || []).map((r) => ({
    date: r.date,
    tasks_completed: r.tasks_completed,
    tasks_pending: r.tasks_pending,
    tasks_cancelled: r.tasks_cancelled,
    total_focus_minutes: r.total_focus_minutes,
  }));

  const totals: WeeklyTotals = {
    tasks_completed: dailyReports.reduce((s, d) => s + d.tasks_completed, 0),
    tasks_pending: dailyReports.reduce((s, d) => s + d.tasks_pending, 0),
    tasks_cancelled: dailyReports.reduce((s, d) => s + d.tasks_cancelled, 0),
    total_focus_minutes: dailyReports.reduce(
      (s, d) => s + d.total_focus_minutes,
      0
    ),
    completion_rate:
      dailyReports.length > 0
        ? Math.round(
            (dailyReports.reduce((s, d) => s + d.tasks_completed, 0) /
              Math.max(
                1,
                dailyReports.reduce(
                  (s, d) =>
                    s + d.tasks_completed + d.tasks_pending + d.tasks_cancelled,
                  0
                )
              )) *
              100
          )
        : 0,
    avg_focus_minutes_per_day:
      dailyReports.length > 0
        ? Math.round(
            dailyReports.reduce((s, d) => s + d.total_focus_minutes, 0) /
              dailyReports.length
          )
        : 0,
  };

  // Check if we have AI insights already cached
  // Look for the most recent report with ai_summary as a proxy
  const latestWithSummary = reports?.find((r) => r.ai_summary);

  const weeklyReport: WeeklyReport = {
    startDate,
    endDate,
    dailyReports,
    totals,
    aiInsights: latestWithSummary?.ai_summary || null,
  };

  return NextResponse.json(weeklyReport);
}
