import { Job } from "bullmq";
import { runAgent } from "../ai/agent.ts";
import { SYSTEM_PROMPTS } from "../ai/prompts.ts";
import { MORNING_PLAN_TOOLS } from "../ai/tool-definitions.ts";
import { trackUsage, checkBudget } from "../ai/usage-tracker.ts";
import { supabase } from "../lib/supabase.ts";
import { scheduleTaskReminders } from "../services/reminder-scheduler.ts";
import { renderMorningPlanEmail } from "../services/email-templates.ts";
import { GoogleCalendarService, TokenRefreshError } from "../services/google-calendar.ts";
import type { MorningPlanJobData, ScheduleSlot } from "@ai-todo/shared";

export async function processMorningPlan(job: Job<MorningPlanJobData>) {
  const { userId, date } = job.data;
  job.log(`Starting morning plan for user ${userId} on ${date}`);

  const budget = await checkBudget(userId);
  if (!budget.allowed) {
    job.log(
      `Warning: User ${userId} is over budget but morning plan is essential`
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, preferences, display_name")
    .eq("id", userId)
    .single();

  // I3: Sync Google Calendar before generating schedule
  try {
    const calendarService = new GoogleCalendarService(supabase, userId);
    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);
    const syncResult = await calendarService.syncEvents(dayStart, dayEnd);
    job.log(`Calendar synced: ${syncResult.synced} events, ${syncResult.deleted} removed`);
  } catch (err) {
    if (err instanceof TokenRefreshError) {
      job.log(`Calendar sync skipped: ${err.message}`);
    } else {
      job.log(`Calendar sync failed (continuing without): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const { data: items } = await supabase
    .from("items")
    .select(
      "id, title, type, priority, effort, estimated_minutes, is_completed, is_movable, scheduled_date, due_date, list_id"
    )
    .eq("user_id", userId)
    .eq("is_completed", false)
    .eq("is_archived", false)
    .or(`scheduled_date.eq.${date},scheduled_date.is.null,due_date.lte.${date}`)
    .order("priority", { ascending: false });

  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, title, start_time, end_time, is_all_day, location")
    .eq("user_id", userId)
    .gte("start_time", `${date}T00:00:00`)
    .lte("start_time", `${date}T23:59:59`)
    .order("start_time", { ascending: true });

  const userMessage = `Here is the data for today (${date}):

**Calendar Events:**
${
  events && events.length > 0
    ? events
        .map(
          (e: any) =>
            `- ${e.title}: ${e.start_time} to ${e.end_time}${e.location ? ` (${e.location})` : ""}`
        )
        .join("\n")
    : "No calendar events today."
}

**Pending Items (${items?.length || 0}):**
${
  items && items.length > 0
    ? items
        .map(
          (t) =>
            `- [${t.id}] "${t.title}" | priority: ${t.priority} | effort: ${t.effort || "unknown"} | est: ${t.estimated_minutes || "unknown"}min | movable: ${t.is_movable}${t.due_date ? ` | due: ${t.due_date}` : ""}`
        )
        .join("\n")
    : "No pending items."
}

**User Preferences:**
- Timezone: ${profile?.timezone || "UTC"}
- Preferences: ${JSON.stringify(profile?.preferences || {})}

Please create an optimized daily schedule. First estimate any items missing durations, then generate the schedule with appropriate breaks.`;

  const result = await runAgent({
    userId,
    systemPrompt: SYSTEM_PROMPTS.MORNING_PLANNER,
    userMessage,
    tools: MORNING_PLAN_TOOLS,
    maxTurns: 8,
  });

  await trackUsage(userId, result.inputTokens, result.outputTokens);

  // I1: Wire notifications after schedule generation
  const now = new Date().toISOString();

  // Always create in_app + push notifications for the morning plan
  await supabase.from("notifications").insert([
    {
      user_id: userId,
      channel: "in_app" as const,
      title: "Your day plan is ready!",
      body: result.finalText.slice(0, 200),
      ref_type: "schedule" as const,
      scheduled_for: now,
    },
    {
      user_id: userId,
      channel: "push" as const,
      title: "Your day plan is ready!",
      body: result.finalText.slice(0, 200),
      ref_type: "schedule" as const,
      scheduled_for: now,
    },
  ]);

  // Fetch the schedule that was just created to get slots
  const { data: schedule } = await supabase
    .from("daily_schedules")
    .select("plan, ai_summary")
    .eq("user_id", userId)
    .eq("date", date)
    .single();

  const scheduleSlots = (schedule?.plan as ScheduleSlot[]) || [];

  // Create email notification if user opted in
  const emailEnabled = (profile?.preferences as Record<string, unknown> | null)?.email_morning_plan !== false;
  if (emailEnabled) {
    const summary = (schedule?.ai_summary as string) || result.finalText.slice(0, 200);
    const userName = (profile?.display_name as string) || "";

    const emailHtml = renderMorningPlanEmail(userName, date, scheduleSlots, summary);

    await supabase.from("notifications").insert({
      user_id: userId,
      channel: "email" as const,
      title: `Your morning plan for ${date}`,
      body: emailHtml,
      ref_type: "schedule" as const,
      scheduled_for: now,
    });
  }

  // Schedule task reminders for each task slot with a scheduled_start
  for (const slot of scheduleSlots) {
    if (slot.type === "task" && slot.ref_id && slot.start) {
      await scheduleTaskReminders(
        supabase,
        userId,
        slot.ref_id,
        slot.title,
        new Date(slot.start)
      );
    }
  }

  job.log(
    `Morning plan complete. Tokens: ${result.inputTokens} in / ${result.outputTokens} out`
  );
  return { success: true, toolCalls: result.toolCalls.length };
}
