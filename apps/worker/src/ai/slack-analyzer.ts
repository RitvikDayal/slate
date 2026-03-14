import Anthropic from "@anthropic-ai/sdk";
import { trackUsage } from "./usage-tracker";
import { SYSTEM_PROMPTS } from "./prompts";
import type { SlackMessage, SlackAnalysisResult } from "@ai-todo/shared";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface SlackAnalysisWithIndex extends SlackAnalysisResult {
  message_index: number;
}

const ANALYZE_TOOL: Anthropic.Tool = {
  name: "analyze_message",
  description: "Return the task analysis for a Slack message",
  input_schema: {
    type: "object" as const,
    properties: {
      message_index: {
        type: "number",
        description: "1-based index of the message being analyzed",
      },
      is_task: {
        type: "boolean",
        description:
          "Whether this message represents an actionable task",
      },
      confidence: {
        type: "number",
        description: "Confidence score 0-1",
      },
      title: {
        type: "string",
        description: "Extracted task title",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"],
      },
      effort: {
        type: "string",
        enum: ["xs", "s", "m", "l", "xl"],
        description: "Estimated effort, or null",
      },
      reasoning: {
        type: "string",
        description: "Brief explanation of why this is/isn't a task",
      },
    },
    required: [
      "message_index",
      "is_task",
      "confidence",
      "title",
      "priority",
      "reasoning",
    ],
  },
};

export async function analyzeSlackMessages(
  userId: string,
  messages: SlackMessage[]
): Promise<SlackAnalysisWithIndex[]> {
  if (messages.length === 0) return [];

  // Batch messages for efficiency (up to 20 per call)
  const batches: SlackMessage[][] = [];
  for (let i = 0; i < messages.length; i += 20) {
    batches.push(messages.slice(i, i + 20));
  }

  const results: SlackAnalysisWithIndex[] = [];

  for (const batch of batches) {
    const messageList = batch
      .map(
        (m, i) =>
          `[${i + 1}] (channel: ${m.channel}, ts: ${m.ts}): ${m.text}`
      )
      .join("\n\n");

    const userMessage = `Analyze these Slack messages and call analyze_message for each one that could be a task (confidence >= 0.6). Skip messages that are clearly not tasks.\n\n${messageList}`;

    const response = await client.messages.create({
      model: "claude-haiku-3-5-20241022",
      max_tokens: 2048,
      system: SYSTEM_PROMPTS.SLACK_ANALYZER,
      tools: [ANALYZE_TOOL],
      messages: [{ role: "user", content: userMessage }],
    });

    await trackUsage(
      userId,
      response.usage.input_tokens,
      response.usage.output_tokens
    );

    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "analyze_message") {
        const input = block.input as Record<string, unknown>;
        if (input.is_task && (input.confidence as number) >= 0.6) {
          results.push({
            is_task: true,
            confidence: input.confidence as number,
            title: input.title as string,
            priority: input.priority as "low" | "medium" | "high",
            effort:
              (input.effort as "xs" | "s" | "m" | "l" | "xl") || null,
            reasoning: input.reasoning as string,
            message_index: input.message_index as number,
          });
        }
      }
    }
  }

  return results;
}
