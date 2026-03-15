import webpush from "web-push";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:notifications@yourdomain.com",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export class SubscriptionExpiredError extends Error {
  constructor() {
    super("Push subscription expired (410 Gone)");
    this.name = "SubscriptionExpiredError";
  }
}

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("VAPID keys not configured — skipping push notification");
    return;
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "statusCode" in err &&
      (err as { statusCode: number }).statusCode === 410
    ) {
      throw new SubscriptionExpiredError();
    }
    throw err;
  }
}
