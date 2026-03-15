import { Job } from "bullmq";
import { runAgent } from "../ai/agent.ts";
import { SYSTEM_PROMPTS } from "../ai/prompts.ts";
import { MORNING_PLAN_TOOLS } from "../ai/tool-definitions.ts";
import { trackUsage, checkBudget } from "../ai/usage-tracker.ts";
import { supabase } from "../lib/supabase.ts";
import type { ScheduleShuffleJobData } from "@ai-todo/shared";

export async function processScheduleShuffle(
  job: Job<ScheduleShuffleJobData>
) {
  const { userId, date, reason } = job.data;
  const budget = await checkBudget(userId);
  if (!budget.allowed) {
    job.log(`User ${userId} over budget -- skipping shuffle`);
    return { skipped: true, reason: "budget_exceeded" };
  }

  const { data: schedule } = await supabase
    .from("daily_schedules")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .single();

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, title, priority, effort, estimated_minutes, status, is_movable, scheduled_start, scheduled_end"
    )
    .eq("user_id", userId)
    .eq("scheduled_date", date)
    .in("status", ["pending", "in_progress"])
    .order("priority", { ascending: false });

  const { data: events } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .gte("start_time", `${date}T00:00:00`)
    .lte("start_time", `${date}T23:59:59`)
    .order("start_time", { ascending: true });

  const now = new Date();
  const userMessage = `The schedule needs reshuffling. Reason: ${reason}

Current time: ${now.toISOString()}

**Current schedule (version ${schedule?.version || 0}):**
${schedule ? JSON.stringify(schedule.plan, null, 2) : "No schedule exists yet."}

**Remaining tasks:**
${
  tasks
    ?.map(
      (t: any) =>
        `- [${t.id}] "${t.title}" | priority: ${t.priority} | est: ${t.estimated_minutes || "?"}min | movable: ${t.is_movable}`
    )
    .join("\n") || "None"
}

**Calendar events:**
${
  events
    ?.map((e: any) => `- ${e.title}: ${e.start_time} to ${e.end_time}`)
    .join("\n") || "None"
}

Re-optimize the schedule from now onwards. Keep completed slots and fixed events. Only rearrange movable tasks.`;

  const result = await runAgent({
    userId,
    systemPrompt: SYSTEM_PROMPTS.MORNING_PLANNER,
    userMessage,
    tools: MORNING_PLAN_TOOLS,
    maxTurns: 6,
  });
  await trackUsage(userId, result.inputTokens, result.outputTokens);

  await supabase.from("notifications").insert({
    user_id: userId,
    channel: "in_app",
    title: "Schedule reshuffled",
    body: `Your schedule was updated: ${reason}`,
    ref_type: "schedule",
    scheduled_for: new Date().toISOString(),
  });

  return { success: true };
}
