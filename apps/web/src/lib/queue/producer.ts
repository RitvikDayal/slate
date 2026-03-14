import { Queue } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_NAMES } from "@ai-todo/shared";

let connection: IORedis | null = null;

function getConnection() {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return connection;
}

export function getAiQueue() {
  return new Queue(QUEUE_NAMES.AI, { connection: getConnection() });
}

export function getNotificationQueue() {
  return new Queue(QUEUE_NAMES.NOTIFICATIONS, { connection: getConnection() });
}
