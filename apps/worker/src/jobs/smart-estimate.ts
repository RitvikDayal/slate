import { Job } from "bullmq";
import { runAgent } from "../ai/agent";
import { SYSTEM_PROMPTS } from "../ai/prompts";
import { INTELLIGENCE_TOOLS } from "../ai/tool-definitions";
import { trackUsage, checkBudget } from "../ai/usage-tracker";
import type { SmartEstimateJobData } from "@ai-todo/shared";

export async function processSmartEstimate(
  job: Job<SmartEstimateJobData>
) {
  const { userId, taskId, title, description } = job.data;
  const budget = await checkBudget(userId);
  if (!budget.allowed) return { skipped: true, reason: "budget_exceeded" };

  const userMessage = `Please estimate this task:
Title: "${title}"
${description ? `Description: "${description}"` : "No description provided."}

Task ID: ${taskId}

Use the estimate_task tool to save your estimate.`;

  const result = await runAgent({
    userId,
    systemPrompt: SYSTEM_PROMPTS.SMART_ESTIMATOR,
    userMessage,
    tools: INTELLIGENCE_TOOLS.filter((t) => t.function.name === "estimate_task"),
    maxTurns: 2,
  });

  await trackUsage(userId, result.inputTokens, result.outputTokens);
  return { success: true, estimate: result.toolCalls[0]?.input };
}
