export const QUEUE_NAMES = {
  AI: "ai-jobs",
  NOTIFICATIONS: "notification-jobs",
  CALENDAR: "calendar-jobs",
} as const;

export const JOB_NAMES = {
  MORNING_PLAN: "morning-plan",
  EOD_REPORT: "eod-report",
  SCHEDULE_SHUFFLE: "schedule-shuffle",
  SMART_ESTIMATE: "smart-estimate",
  AUTO_COMPLETE: "auto-complete",
  CALENDAR_SYNC: "calendar-sync",
  NOTIFICATION_DISPATCH: "notification-dispatch",
} as const;

export interface MorningPlanJobData {
  userId: string;
  date: string;
}

export interface EodReportJobData {
  userId: string;
  date: string;
}

export interface ScheduleShuffleJobData {
  userId: string;
  date: string;
  reason: string;
}

export interface SmartEstimateJobData {
  userId: string;
  taskId: string;
  title: string;
  description?: string;
}

export interface AutoCompleteJobData {
  userId: string;
  date: string;
}

export interface CalendarSyncJobData {
  userId: string;
}

export interface NotificationDispatchJobData {
  notificationIds: string[];
}
