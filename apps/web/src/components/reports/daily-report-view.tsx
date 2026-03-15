"use client";

import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { useDailyReports } from "@/lib/hooks/use-daily-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function DailyReportView({ currentDate }: { currentDate: Date }) {
  const from = format(subDays(currentDate, 6), "yyyy-MM-dd");
  const to = format(currentDate, "yyyy-MM-dd");
  const { reports, isLoading } = useDailyReports(from, to);

  const chartData = useMemo(() => {
    const days: Array<{ date: string; label: string; completed: number; focus: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(currentDate, i), "yyyy-MM-dd");
      const report = reports.find((r) => r.date === d);
      days.push({
        date: d,
        label: format(subDays(currentDate, i), "EEE"),
        completed: report?.tasks_completed ?? 0,
        focus: report ? Math.round(report.total_focus_minutes / 60 * 10) / 10 : 0,
      });
    }
    return days;
  }, [reports, currentDate]);

  const totals = useMemo(() => ({
    completed: reports.reduce((s, r) => s + r.tasks_completed, 0),
    pending: reports.reduce((s, r) => s + r.tasks_pending, 0),
    focusHours: Math.round(reports.reduce((s, r) => s + r.total_focus_minutes, 0) / 60 * 10) / 10,
  }), [reports]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-success">{totals.completed}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Focus Hours</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-primary">{totals.focusHours}h</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">Completion</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-warning">
              {totals.completed + totals.pending > 0
                ? Math.round((totals.completed / (totals.completed + totals.pending)) * 100)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      <Card className="border-border bg-card p-4">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-sm text-secondary-foreground">Tasks Completed (7 days)</CardTitle>
        </CardHeader>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="completed" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Focus time chart */}
      <Card className="border-border bg-card p-4">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-sm text-secondary-foreground">Focus Hours (7 days)</CardTitle>
        </CardHeader>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="focus" fill="var(--chart-2)" radius={[4, 4, 0, 0]} name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Individual day summaries */}
      {reports.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Daily Breakdown</h3>
          {reports.map((report) => (
            <Card key={report.id} className="border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {format(new Date(report.date + "T00:00:00"), "EEEE, MMM d")}
                </span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="text-success">{report.tasks_completed} done</span>
                  <span className="text-warning">{report.tasks_pending} pending</span>
                  <span className="text-primary">{report.total_focus_minutes}m focus</span>
                </div>
              </div>
              {report.ai_summary && (
                <p className="mt-2 text-xs text-muted-foreground">{report.ai_summary}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {reports.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">No reports for this period.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Reports are generated automatically at end of day.
          </p>
        </div>
      )}
    </div>
  );
}
