import { z } from "zod";

export const notificationPreferencesSchema = z.object({
  push_enabled: z.boolean().default(true),
  email_enabled: z.boolean().default(true),
  email_morning_plan: z.boolean().default(true),
  email_eod_report: z.boolean().default(true),
  email_task_reminders: z.boolean().default(false),
  in_app_enabled: z.boolean().default(true),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
