import { Job } from "bullmq";
import { supabase } from "../lib/supabase.ts";
import { runAgent } from "../ai/agent.ts";
import { trackUsage } from "../ai/usage-tracker.ts";
import type { ReportInsightsJobData } from "@ai-todo/shared";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

const INSIGHTS_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "save_insights",
      description: "Save the generated productivity insights",
      parameters: {
        type: "object",
        properties: {
          insights: {
            type: "string",
            description: "Markdown-formatted productivity insights",
          },
          highlights: {
            type: "array",
            description: "Key highlights as short bullet points",
            items: { type: "string" },
          },
        },
        required: ["insights"],
      },
    },
  },
];

interface ReportRow {
  id: string;
  date: string;
  tasks_completed: number;
  tasks_pending: number;
  tasks_cancelled: number;
  total_focus_minutes: number;
  ai_summary: string | null;
}

export async function processReportInsights(
  job: Job<ReportInsightsJobData>
) {
  const { userId, startDate, endDate } = job.data;

  // Fetch daily reports for the period
  const { data: reports } = await supabase
    .from("daily_reports")
    .select("id, date, tasks_completed, tasks_pending, tasks_cancelled, total_focus_minutes, ai_summary")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (!reports || reports.length === 0) {
    return { success: false, error: "No reports found for period" };
  }

  const typedReports = reports as ReportRow[];

  const totalCompleted = typedReports.reduce(
    (s, r) => s + r.tasks_completed,
    0
  );
  const totalPending = typedReports.reduce(
    (s, r) => s + r.tasks_pending,
    0
  );
  const totalFocus = typedReports.reduce(
    (s, r) => s + r.total_focus_minutes,
    0
  );

  const userMessage = `Generate productivity insights for the period ${startDate} to ${endDate}.

**Daily breakdown:**
${typedReports
  .map(
    (r) =>
      `- ${r.date}: ${r.tasks_completed} completed, ${r.tasks_pending} pending, ${r.total_focus_minutes}min focus`
  )
  .join("\n")}

**Totals:**
- Completed: ${totalCompleted} tasks
- Still pending: ${totalPending} tasks
- Total focus time: ${totalFocus} minutes (${Math.round(totalFocus / 60)}h)
- Completion rate: ${Math.round((totalCompleted / Math.max(1, totalCompleted + totalPending)) * 100)}%
- Average daily focus: ${Math.round(totalFocus / typedReports.length)} minutes

Please provide:
1. A brief overall assessment
2. Trends you notice (improving, declining, consistent)
3. One specific actionable suggestion for improvement
4. Encouragement

Use the save_insights tool to store your analysis.`;

  const result = await runAgent({
    userId,
    systemPrompt: `You are an AI productivity coach analyzing task completion data.
Provide concise, actionable insights. Be encouraging but honest.
Use markdown formatting for readability.
Always call save_insights to store your analysis.`,
    userMessage,
    tools: INSIGHTS_TOOLS,
    maxTurns: 3,
  });

  await trackUsage(userId, result.inputTokens, result.outputTokens);

  // Update the latest report with AI insights
  const latestReport = typedReports[typedReports.length - 1];
  if (latestReport && result.finalText) {
    await supabase
      .from("daily_reports")
      .update({ ai_summary: result.finalText })
      .eq("id", latestReport.id);
  }

  return { success: true };
}
