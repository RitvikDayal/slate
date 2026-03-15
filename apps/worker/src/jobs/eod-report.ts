import { Job } from "bullmq";
import { runAgent } from "../ai/agent.ts";
import { SYSTEM_PROMPTS } from "../ai/prompts.ts";
import { EOD_TOOLS } from "../ai/tool-definitions.ts";
import { trackUsage } from "../ai/usage-tracker.ts";
import { supabase } from "../lib/supabase.ts";
import { renderEodReportEmail } from "../services/email-templates.ts";
import type { EodReportJobData } from "@ai-todo/shared";

export async function processEodReport(job: Job<EodReportJobData>) {
  const { userId, date } = job.data;

  const { data: allItems } = await supabase
    .from("items")
    .select(
      "id, title, is_completed, priority, scheduled_start, scheduled_end, completed_at, list_id"
    )
    .eq("user_id", userId)
    .eq("scheduled_date", date)
    .eq("is_archived", false);

  const items = allItems || [];
  const completed = items.filter((t) => t.is_completed);
  const pending = items.filter((t) => !t.is_completed);

  let focusMinutes = 0;
  for (const t of completed) {
    if (t.scheduled_start && t.scheduled_end) {
      focusMinutes += Math.round(
        (new Date(t.scheduled_end).getTime() -
          new Date(t.scheduled_start).getTime()) /
          60_000
      );
    }
  }

  const userMessage = `Generate an end-of-day report for ${date}.

**Stats:**
- Completed: ${completed.length} items
- Pending: ${pending.length} items
- Total focus time: ${focusMinutes} minutes

**Completed items:**
${completed.map((t) => `- "${t.title}" (${t.priority})`).join("\n") || "None"}

**Still pending:**
${pending.map((t) => `- "${t.title}" (${t.priority})`).join("\n") || "None"}

Please write a concise, encouraging summary.`;

  const result = await runAgent({
    userId,
    systemPrompt: SYSTEM_PROMPTS.EOD_REPORTER,
    userMessage,
    tools: EOD_TOOLS,
    maxTurns: 3,
  });
  await trackUsage(userId, result.inputTokens, result.outputTokens);

  const { data: report } = await supabase
    .from("daily_reports")
    .upsert(
      {
        user_id: userId,
        date,
        tasks_completed: completed.length,
        tasks_pending: pending.length,
        tasks_cancelled: 0,
        total_focus_minutes: focusMinutes,
        ai_summary: result.finalText,
        highlights: completed
          .slice(0, 5)
          .map((t) => ({ title: t.title, priority: t.priority })),
        sent_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();

  // I2: Create in_app notification
  await supabase.from("notifications").insert({
    user_id: userId,
    channel: "in_app" as const,
    title: "Your daily report is ready",
    body: result.finalText.slice(0, 200),
    ref_type: "report" as const,
    scheduled_for: new Date().toISOString(),
  });

  // I2: Create email notification if user opted in
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, preferences")
    .eq("id", userId)
    .single();

  const emailEnabled = (profile?.preferences as Record<string, unknown> | null)?.email_eod_report !== false;
  if (emailEnabled) {
    const userName = (profile?.display_name as string) || "";
    const emailHtml = renderEodReportEmail(userName, date, {
      tasks_completed: completed.length,
      tasks_pending: pending.length,
      total_focus_minutes: focusMinutes,
      ai_summary: result.finalText,
    });

    await supabase.from("notifications").insert({
      user_id: userId,
      channel: "email" as const,
      title: `End-of-day report for ${date}`,
      body: emailHtml,
      ref_type: "report" as const,
      scheduled_for: new Date().toISOString(),
    });
  }

  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  for (const item of pending) {
    await supabase
      .from("items")
      .update({
        scheduled_date: tomorrowStr,
        scheduled_start: null,
        scheduled_end: null,
        ai_notes: `Carried over from ${date}`,
      })
      .eq("id", item.id);
  }

  return { success: true, reportId: report?.id };
}
