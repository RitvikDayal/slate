import type { SupabaseClient } from "@supabase/supabase-js";

export async function scheduleTaskReminders(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  taskTitle: string,
  scheduledStart: Date
): Promise<void> {
  const reminderTime = new Date(scheduledStart.getTime() - 30 * 60 * 1000);

  // Don't schedule reminders in the past
  if (reminderTime <= new Date()) return;

  // Delete existing unsent reminders for this task
  await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .eq("ref_type", "task")
    .eq("ref_id", taskId)
    .is("sent_at", null);

  // Create push + in_app reminders (30 minutes before start)
  const reminders = (["push", "in_app"] as const).map((channel) => ({
    user_id: userId,
    channel,
    title: "Upcoming task",
    body: `"${taskTitle}" starts in 30 minutes`,
    ref_type: "task" as const,
    ref_id: taskId,
    scheduled_for: reminderTime.toISOString(),
  }));

  await supabase.from("notifications").insert(reminders);
}
