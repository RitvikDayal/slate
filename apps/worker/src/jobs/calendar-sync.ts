import { Job } from "bullmq";
import type { CalendarSyncJobData } from "@ai-todo/shared";
import { supabase } from "../lib/supabase";
import {
  GoogleCalendarService,
  TokenRefreshError,
} from "../services/google-calendar";

export async function processCalendarSync(
  job: Job<CalendarSyncJobData>
): Promise<{ success: boolean; synced: number; deleted: number }> {
  const { userId, timeMin: timeMinStr, timeMax: timeMaxStr } = job.data;
  job.log(`Starting calendar sync for user ${userId}`);

  // Look up user timezone for default range
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();

  const timezone = profile?.timezone || "UTC";

  // Default range: today through 7 days out
  let timeMin: Date;
  let timeMax: Date;

  if (timeMinStr) {
    timeMin = new Date(timeMinStr);
  } else {
    // Start of today in user's timezone
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
    timeMin = new Date(`${todayStr}T00:00:00Z`);
  }

  if (timeMaxStr) {
    timeMax = new Date(timeMaxStr);
  } else {
    timeMax = new Date(timeMin.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  job.log(`Sync range: ${timeMin.toISOString()} to ${timeMax.toISOString()}`);

  const service = new GoogleCalendarService(supabase, userId);

  try {
    const result = await service.syncEvents(timeMin, timeMax);
    job.log(
      `Calendar sync complete: ${result.synced} synced, ${result.deleted} deleted`
    );
    return { success: true, ...result };
  } catch (error) {
    if (error instanceof TokenRefreshError) {
      job.log(`Token refresh error: ${error.message}. Will not retry.`);

      // Insert in-app notification telling user to reconnect
      await supabase.from("notifications").insert({
        user_id: userId,
        channel: "in_app",
        title: "Google Calendar disconnected",
        body: "Please reconnect your Google Calendar to continue syncing events.",
        ref_type: "event",
        scheduled_for: new Date().toISOString(),
      });

      // Don't retry — throw with a flag that BullMQ can check
      const err = new Error(error.message);
      (err as Error & { unrecoverable: boolean }).unrecoverable = true;
      throw err;
    }

    throw error;
  }
}
