import { Job } from "bullmq";
import { runAgent } from "../ai/agent";
import { SYSTEM_PROMPTS } from "../ai/prompts";
import { MORNING_PLAN_TOOLS } from "../ai/tool-definitions";
import { trackUsage, checkBudget } from "../ai/usage-tracker";
import { supabase } from "../lib/supabase";
import type { MorningPlanJobData } from "@ai-todo/shared";

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
    .select("timezone, preferences")
    .eq("id", userId)
    .single();

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, title, description, priority, effort, estimated_minutes, status, is_movable, scheduled_date, due_date"
    )
    .eq("user_id", userId)
    .in("status", ["pending", "in_progress"])
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

**Pending Tasks (${tasks?.length || 0}):**
${
  tasks && tasks.length > 0
    ? tasks
        .map(
          (t: any) =>
            `- [${t.id}] "${t.title}" | priority: ${t.priority} | effort: ${t.effort || "unknown"} | est: ${t.estimated_minutes || "unknown"}min | movable: ${t.is_movable}${t.due_date ? ` | due: ${t.due_date}` : ""}`
        )
        .join("\n")
    : "No pending tasks."
}

**User Preferences:**
- Timezone: ${profile?.timezone || "UTC"}
- Preferences: ${JSON.stringify(profile?.preferences || {})}

Please create an optimized daily schedule. First estimate any tasks missing durations, then generate the schedule with appropriate breaks.`;

  const result = await runAgent({
    userId,
    systemPrompt: SYSTEM_PROMPTS.MORNING_PLANNER,
    userMessage,
    tools: MORNING_PLAN_TOOLS,
    maxTurns: 8,
  });

  await trackUsage(userId, result.inputTokens, result.outputTokens);

  await supabase.from("notifications").insert({
    user_id: userId,
    channel: "in_app",
    title: "Your day plan is ready!",
    body: result.finalText.slice(0, 200),
    ref_type: "schedule",
    scheduled_for: new Date().toISOString(),
  });

  job.log(
    `Morning plan complete. Tokens: ${result.inputTokens} in / ${result.outputTokens} out`
  );
  return { success: true, toolCalls: result.toolCalls.length };
}
