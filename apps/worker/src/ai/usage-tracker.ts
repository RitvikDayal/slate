import { redis } from "../lib/redis.ts";

const DAILY_INPUT_TOKEN_LIMIT = 100_000;
const DAILY_OUTPUT_TOKEN_LIMIT = 50_000;

function getUsageKey(userId: string, date: string, type: "input" | "output"): string {
  return `ai:usage:${userId}:${date}:${type}`;
}

export async function trackUsage(userId: string, inputTokens: number, outputTokens: number): Promise<void> {
  const date = new Date().toISOString().split("T")[0];
  const inputKey = getUsageKey(userId, date, "input");
  const outputKey = getUsageKey(userId, date, "output");

  await redis.incrby(inputKey, inputTokens);
  await redis.incrby(outputKey, outputTokens);
  await redis.expire(inputKey, 172800);
  await redis.expire(outputKey, 172800);
}

export async function checkBudget(userId: string): Promise<{
  allowed: boolean;
  inputUsed: number;
  outputUsed: number;
  inputLimit: number;
  outputLimit: number;
}> {
  const date = new Date().toISOString().split("T")[0];
  const inputUsed = parseInt(await redis.get(getUsageKey(userId, date, "input")) || "0", 10);
  const outputUsed = parseInt(await redis.get(getUsageKey(userId, date, "output")) || "0", 10);

  return {
    allowed: inputUsed < DAILY_INPUT_TOKEN_LIMIT && outputUsed < DAILY_OUTPUT_TOKEN_LIMIT,
    inputUsed,
    outputUsed,
    inputLimit: DAILY_INPUT_TOKEN_LIMIT,
    outputLimit: DAILY_OUTPUT_TOKEN_LIMIT,
  };
}
