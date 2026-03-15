import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || url === "change-me") return null;
  return new Redis({ url, token });
}

function getLimiter(prefix: string, requests: number) {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, "1 m"),
    analytics: true,
    prefix,
  });
}

export async function checkRateLimit(
  userId: string,
  type: "chat" | "tasks" | "calendar" = "chat"
): Promise<NextResponse | null> {
  const configs = {
    chat: { prefix: "ratelimit:chat", requests: 30 },
    tasks: { prefix: "ratelimit:tasks", requests: 60 },
    calendar: { prefix: "ratelimit:calendar", requests: 5 },
  } as const;

  const config = configs[type];
  const limiter = getLimiter(config.prefix, config.requests);

  // Skip rate limiting if Redis is not configured
  if (!limiter) return null;

  const { success, limit, remaining, reset } = await limiter.limit(userId);

  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again shortly." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }

  return null;
}
