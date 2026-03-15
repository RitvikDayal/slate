import OpenAI from "openai";
import { handleToolCall } from "./tool-handlers.ts";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AgentRunOptions {
  userId: string;
  systemPrompt: string;
  userMessage: string;
  tools: ChatCompletionTool[];
  maxTurns?: number;
}

export interface AgentRunResult {
  finalText: string;
  toolCalls: Array<{ name: string; input: Record<string, unknown>; result: string }>;
  inputTokens: number;
  outputTokens: number;
}

export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const { userId, systemPrompt, userMessage, tools, maxTurns = 10 } = options;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const allToolCalls: AgentRunResult["toolCalls"] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalText = "";

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 4096,
      tools: tools.length > 0 ? tools : undefined,
      messages,
    });

    totalInputTokens += response.usage?.prompt_tokens ?? 0;
    totalOutputTokens += response.usage?.completion_tokens ?? 0;

    const choice = response.choices[0];
    if (!choice) break;

    const message = choice.message;

    if (message.content) {
      finalText = message.content;
    }

    if (choice.finish_reason === "stop" || !message.tool_calls?.length) break;

    // Append assistant message with tool calls
    messages.push(message);

    // Process tool calls
    for (const toolCall of message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
      const result = await handleToolCall(
        toolCall.function.name,
        args,
        { userId }
      );
      allToolCalls.push({ name: toolCall.function.name, input: args, result });
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  return { finalText, toolCalls: allToolCalls, inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
}
