export type TaskPriority = "low" | "medium" | "high";
export type TaskEffort = "xs" | "s" | "m" | "l" | "xl";
export type TaskStatus = "pending" | "in_progress" | "done" | "cancelled";
export type TaskSource = "manual" | "slack" | "ai_suggested";
export type NotificationChannel = "push" | "email" | "in_app";
export type NotificationRefType = "task" | "event" | "schedule" | "report";
export type ScheduleSlotType = "calendar_event" | "task" | "break" | "focus";
export type ScheduleStatus = "draft" | "active" | "completed";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  timezone: string;
  morning_plan_time: string;
  eod_report_time: string;
  push_subscription: Record<string, unknown> | null;
  slack_channels: string[] | null;
  preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  effort: TaskEffort | null;
  estimated_minutes: number | null;
  status: TaskStatus;
  is_movable: boolean;
  source: TaskSource;
  source_ref: Record<string, unknown> | null;
  scheduled_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  due_date: string | null;
  completed_at: string | null;
  ai_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  ref_type: NotificationRefType;
  ref_id: string | null;
  scheduled_for: string;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  google_event_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location: string | null;
  synced_at: string;
  created_at: string;
}

export interface ScheduleSlot {
  start: string;
  end: string;
  type: ScheduleSlotType;
  ref_id: string | null;
  title: string;
  notes: string | null;
}

export interface DailySchedule {
  id: string;
  user_id: string;
  date: string;
  plan: ScheduleSlot[];
  ai_summary: string | null;
  status: ScheduleStatus;
  user_confirmed: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DailyReport {
  id: string;
  user_id: string;
  date: string;
  tasks_completed: number;
  tasks_pending: number;
  tasks_cancelled: number;
  total_focus_minutes: number;
  ai_summary: string | null;
  highlights: Record<string, unknown>[];
  sent_at: string | null;
  created_at: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  user_id: string;
  date: string;
  role: ChatRole;
  content: string;
  tool_calls: Record<string, unknown>[] | null;
  tool_results: Record<string, unknown>[] | null;
  created_at: string;
}
