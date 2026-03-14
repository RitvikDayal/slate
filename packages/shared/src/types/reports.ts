export interface WeeklyReport {
  startDate: string; // YYYY-MM-DD (Monday)
  endDate: string; // YYYY-MM-DD (Sunday)
  dailyReports: DailyReportSummary[];
  totals: WeeklyTotals;
  aiInsights: string | null;
}

export interface DailyReportSummary {
  date: string;
  tasks_completed: number;
  tasks_pending: number;
  tasks_cancelled: number;
  total_focus_minutes: number;
}

export interface WeeklyTotals {
  tasks_completed: number;
  tasks_pending: number;
  tasks_cancelled: number;
  total_focus_minutes: number;
  completion_rate: number; // 0-100
  avg_focus_minutes_per_day: number;
}

export interface ProductivityTrend {
  date: string;
  completed: number;
  focus_minutes: number;
}
