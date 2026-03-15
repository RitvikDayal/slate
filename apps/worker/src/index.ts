import "dotenv/config";
import { Worker } from "bullmq";
import { createRedisConnection } from "./lib/redis.ts";
import { QUEUE_NAMES, JOB_NAMES } from "@ai-todo/shared";
import { processMorningPlan } from "./jobs/morning-plan.ts";
import { processScheduleShuffle } from "./jobs/schedule-shuffler.ts";
import { processEodReport } from "./jobs/eod-report.ts";
import { processSmartEstimate } from "./jobs/smart-estimate.ts";
import { processAutoComplete } from "./jobs/auto-complete.ts";
import { processSlackScan } from "./jobs/slack-scanner.ts";
import { processReportInsights } from "./jobs/report-insights.ts";
import { processCalendarSync } from "./jobs/calendar-sync.ts";
import { processNotificationDispatch } from "./jobs/notification-dispatcher.ts";
import { startCronScheduler } from "./cron/scheduler.ts";

console.log("Starting Slate Worker...");

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
      case JOB_NAMES.SLACK_SCAN:
        return processSlackScan(job);
      case JOB_NAMES.REPORT_INSIGHTS:
        return processReportInsights(job);
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
      `Dispatching notifications: ${job.data.notificationIds?.length ?? 0} items`
    );
    return processNotificationDispatch(job);
  },
  { connection: createRedisConnection(), concurrency: 10 }
);

const calendarWorker = new Worker(
  QUEUE_NAMES.CALENDAR,
  async (job) => {
    console.log(`Processing calendar job ${job.name} (${job.id})`);
    switch (job.name) {
      case JOB_NAMES.CALENDAR_SYNC:
        return processCalendarSync(job);
      default:
        throw new Error(`Unknown calendar job name: ${job.name}`);
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 3,
  }
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
calendarWorker.on("failed", (job, err) => {
  console.error(
    `Calendar job ${job?.name} (${job?.id}) failed:`,
    err.message
  );
});
calendarWorker.on("completed", (job) => {
  console.log(`Calendar job ${job.name} (${job.id}) completed`);
});

startCronScheduler();
console.log("Worker started. Listening for jobs...");

async function shutdown() {
  console.log("Shutting down worker...");
  await aiWorker.close();
  await notificationWorker.close();
  await calendarWorker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
