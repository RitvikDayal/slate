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

export type ItemType = "task" | "note" | "heading";
export type ItemPriority = "none" | "low" | "medium" | "high";
export type ItemEffort = "xs" | "s" | "m" | "l" | "xl";
export type ItemSource = "manual" | "slack" | "ai_suggested" | "gmail";

export interface List {
  id: string;
  user_id: string;
  title: string;
  icon: string | null;
  color: string | null;
  position: number;
  parent_list_id: string | null;
  is_inbox: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  list_id: string;
  user_id: string;
  parent_item_id: string | null;
  type: ItemType;
  title: string;
  content_json: Record<string, unknown> | null;
  is_completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  due_time: string | null;
  reminder_at: string | null;
  recurrence_rule: string | null;
  priority: ItemPriority;
  effort: ItemEffort | null;
  estimated_minutes: number | null;
  position: number;
  is_movable: boolean;
  source: ItemSource;
  source_ref: Record<string, unknown> | null;
  scheduled_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  ai_notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Client-side computed
  children?: Item[];
  labels?: Label[];
}

export interface Label {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ItemLabel {
  item_id: string;
  label_id: string;
}

export type AttachmentType = "file" | "link";

export interface Attachment {
  id: string;
  item_id: string;
  user_id: string;
  type: AttachmentType;
  name: string;
  url: string;
  mime_type: string | null;
  size_bytes: number | null;
  thumbnail_url: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface SavedView {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  filters: Array<{
    field: string;
    op: string;
    value: string | number | boolean | null;
  }>;
  sort_by: string;
  is_pinned: boolean;
  position: number;
  created_at: string;
  updated_at: string;
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
