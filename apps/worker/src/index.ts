import "dotenv/config";
import { Worker } from "bullmq";
import { createRedisConnection } from "./lib/redis";
import { QUEUE_NAMES, JOB_NAMES } from "@ai-todo/shared";
import { processMorningPlan } from "./jobs/morning-plan";
import { processScheduleShuffle } from "./jobs/schedule-shuffler";
import { processEodReport } from "./jobs/eod-report";
import { processSmartEstimate } from "./jobs/smart-estimate";
import { processAutoComplete } from "./jobs/auto-complete";
import { startCronScheduler } from "./cron/scheduler";

console.log("Starting AI Todo Worker...");

const aiWorker = new Worker(
  QUEUE_NAMES.AI,
  async (job) => {
    console.log(`Processing job ${job.name} (${job.id})`);
    switch (job.name) {
      case JOB_NAMES.MORNING_PLAN:
        return processMorningPlan(job);
      case JOB_NAMES.EOD_REPORT:
        return processEodReport(job);
      case JOB_NAMES.SCHEDULE_SHUFFLE:
        return processScheduleShuffle(job);
      case JOB_NAMES.SMART_ESTIMATE:
        return processSmartEstimate(job);
      case JOB_NAMES.AUTO_COMPLETE:
        return processAutoComplete(job);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 5,
    limiter: { max: 10, duration: 60_000 },
  }
);

const notificationWorker = new Worker(
  QUEUE_NAMES.NOTIFICATIONS,
  async (job) => {
    console.log(
      `Dispatching notifications: ${job.data.notificationIds.length} items`
    );
    const { supabase } = await import("./lib/supabase");
    for (const id of job.data.notificationIds) {
      await supabase
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", id);
    }
  },
  { connection: createRedisConnection(), concurrency: 10 }
);

aiWorker.on("failed", (job, err) => {
  console.error(`AI job ${job?.name} (${job?.id}) failed:`, err.message);
});
aiWorker.on("completed", (job) => {
  console.log(`AI job ${job.name} (${job.id}) completed`);
});
notificationWorker.on("failed", (job, err) => {
  console.error(`Notification job (${job?.id}) failed:`, err.message);
});

startCronScheduler();
console.log("Worker started. Listening for jobs...");

async function shutdown() {
  console.log("Shutting down worker...");
  await aiWorker.close();
  await notificationWorker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
