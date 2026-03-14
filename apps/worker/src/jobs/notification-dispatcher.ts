import { Job } from "bullmq";
import { supabase } from "../lib/supabase";
import {
  sendPushNotification,
  SubscriptionExpiredError,
} from "../services/push";
import { sendEmail } from "../services/email";
import type { NotificationDispatchJobData } from "@ai-todo/shared";

export async function processNotificationDispatch(
  job: Job<NotificationDispatchJobData>
) {
  const { notificationIds } = job.data;

  if (!notificationIds || notificationIds.length === 0) {
    console.log("No notification IDs provided, skipping");
    return;
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .in("id", notificationIds)
    .is("sent_at", null);

  if (!notifications || notifications.length === 0) {
    console.log("No pending notifications found");
    return;
  }

  for (const notif of notifications) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, push_subscription, display_name")
        .eq("id", notif.user_id)
        .single();

      if (!profile) {
        console.warn(
          `No profile found for user ${notif.user_id}, skipping notification ${notif.id}`
        );
        continue;
      }

      switch (notif.channel) {
        case "push":
          if (profile.push_subscription) {
            try {
              await sendPushNotification(
                profile.push_subscription as unknown as Parameters<
                  typeof sendPushNotification
                >[0],
                {
                  title: notif.title,
                  body: notif.body || "",
                  url: buildNotificationUrl(notif.ref_type, notif.ref_id),
                }
              );
            } catch (err) {
              if (err instanceof SubscriptionExpiredError) {
                await supabase
                  .from("profiles")
                  .update({ push_subscription: null })
                  .eq("id", notif.user_id);
                console.log(
                  `Cleared expired push subscription for user ${notif.user_id}`
                );
              } else {
                throw err;
              }
            }
          }
          break;

        case "email":
          if (profile.email) {
            await sendEmail({
              to: profile.email,
              subject: notif.title,
              html: notif.body || notif.title,
            });
          }
          break;

        case "in_app":
          // Already in DB — Supabase Realtime handles delivery to client
          break;
      }

      await supabase
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", notif.id);

      console.log(
        `Sent notification ${notif.id} (${notif.channel}) to user ${notif.user_id}`
      );
    } catch (err) {
      console.error(`Failed to send notification ${notif.id}:`, err);
    }
  }
}

function buildNotificationUrl(
  refType: string | null,
  _refId: string | null
): string {
  if (!refType) return "/today";
  switch (refType) {
    case "task":
      return "/today";
    case "schedule":
      return "/today";
    case "report":
      return "/reports";
    default:
      return "/today";
  }
}
