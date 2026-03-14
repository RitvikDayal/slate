import { Queue } from "bullmq";
import { redis } from "../lib/redis";
import { QUEUE_NAMES } from "@ai-todo/shared";

export const aiQueue = new Queue(QUEUE_NAMES.AI, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 60_000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const calendarQueue = new Queue(QUEUE_NAMES.CALENDAR, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 60_000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 2000 },
  },
});
