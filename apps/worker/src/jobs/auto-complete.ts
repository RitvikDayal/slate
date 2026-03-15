import { Job } from "bullmq";
import { handleToolCall } from "../ai/tool-handlers.ts";
import type { AutoCompleteJobData } from "@ai-todo/shared";

export async function processAutoComplete(
  job: Job<AutoCompleteJobData>
) {
  const { userId, date } = job.data;
  const result = await handleToolCall(
    "auto_check_completions",
    { date },
    { userId }
  );
  const parsed = JSON.parse(result);
  job.log(`Auto-complete result: ${parsed.message}`);
  return parsed;
}
