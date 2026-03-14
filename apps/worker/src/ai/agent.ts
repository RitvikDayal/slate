import Anthropic from "@anthropic-ai/sdk";
import { handleToolCall } from "./tool-handlers";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required");
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AgentRunOptions {
  userId: string;
  systemPrompt: string;
  userMessage: string;
  tools: Tool[];
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

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  const allToolCalls: AgentRunResult["toolCalls"] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalText = "";

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    if (textBlocks.length > 0) {
      finalText = textBlocks.map((b) => b.text).join("\n");
    }

    if (response.stop_reason === "end_turn") break;

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) break;

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      const result = await handleToolCall(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        { userId }
      );
      allToolCalls.push({ name: toolUse.name, input: toolUse.input as Record<string, unknown>, result });
      toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return { finalText, toolCalls: allToolCalls, inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
}
