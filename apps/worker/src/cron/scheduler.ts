import { CronJob } from "cron";
import { supabase } from "../lib/supabase";
import { aiQueue, notificationQueue } from "../queues/index";
import { JOB_NAMES } from "@ai-todo/shared";

export function startCronScheduler() {
  const minutelyCron = new CronJob("* * * * *", async () => {
    const now = new Date();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, timezone, morning_plan_time, eod_report_time");

    if (!profiles) return;
    const today = now.toISOString().split("T")[0];

    for (const profile of profiles) {
      const userNow = getTimeInTimezone(now, profile.timezone);
      const userHHMM = `${String(userNow.hours).padStart(2, "0")}:${String(userNow.minutes).padStart(2, "0")}`;

      if (userHHMM === profile.morning_plan_time.slice(0, 5)) {
        await aiQueue.add(
          JOB_NAMES.MORNING_PLAN,
          { userId: profile.id, date: today },
          {
            jobId: `morning-plan-${profile.id}-${today}`,
            attempts: 2,
          }
        );
      }

      if (userHHMM === profile.eod_report_time.slice(0, 5)) {
        await aiQueue.add(
          JOB_NAMES.EOD_REPORT,
          { userId: profile.id, date: today },
          {
            jobId: `eod-report-${profile.id}-${today}`,
            attempts: 2,
          }
        );
      }
    }

    const { data: pendingNotifications } = await supabase
      .from("notifications")
      .select("id")
      .lte("scheduled_for", now.toISOString())
      .is("sent_at", null)
      .limit(100);

    if (pendingNotifications && pendingNotifications.length > 0) {
      await notificationQueue.add(JOB_NAMES.NOTIFICATION_DISPATCH, {
        notificationIds: pendingNotifications.map((n: any) => n.id),
      });
    }
  });

  minutelyCron.start();
  console.log("Cron scheduler started (every minute)");

  // Slack scan cron — every 30 minutes
  const slackScanCron = new CronJob("*/30 * * * *", async () => {
    const { data: slackProfiles } = await supabase
      .from("profiles")
      .select("id, slack_channels")
      .not("slack_channels", "is", null);

    if (!slackProfiles) return;

    for (const profile of slackProfiles) {
      if (profile.slack_channels && profile.slack_channels.length > 0) {
        await aiQueue.add(
          JOB_NAMES.SLACK_SCAN,
          { userId: profile.id },
          {
            jobId: `slack-scan-${profile.id}-${Date.now()}`,
            attempts: 2,
          }
        );
      }
    }
  });

  slackScanCron.start();
  console.log("Slack scan cron started (every 30 minutes)");

  return minutelyCron;
}

function getTimeInTimezone(
  date: Date,
  timezone: string
): { hours: number; minutes: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  return {
    hours: parseInt(
      parts.find((p) => p.type === "hour")?.value || "0",
      10
    ),
    minutes: parseInt(
      parts.find((p) => p.type === "minute")?.value || "0",
      10
    ),
  };
}
