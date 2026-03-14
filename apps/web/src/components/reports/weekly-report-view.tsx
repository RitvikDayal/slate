"use client";

import { useState } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { useWeeklyReport } from "@/lib/hooks/use-weekly-report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const PIE_COLORS = ["#34d399", "#fbbf24", "#f87171"];

export function WeeklyReportView({ currentDate }: { currentDate: Date }) {
  const weekDate = format(currentDate, "yyyy-MM-dd");
  const { report, isLoading, generateInsights } = useWeeklyReport(weekDate);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  const monday = startOfWeek(currentDate, { weekStartsOn: 1 });
  const sunday = endOfWeek(currentDate, { weekStartsOn: 1 });

  const handleGenerateInsights = async () => {
    setGeneratingInsights(true);
    try {
      await generateInsights(
        format(monday, "yyyy-MM-dd"),
        format(sunday, "yyyy-MM-dd")
      );
    } catch {
      // Error handled by hook
    } finally {
      setGeneratingInsights(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!report || report.dailyReports.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-slate-400">No data for this week.</p>
        <p className="mt-1 text-sm text-slate-500">
          Reports are generated automatically at end of day.
        </p>
      </div>
    );
  }

  const pieData = [
    { name: "Completed", value: report.totals.tasks_completed },
    { name: "Pending", value: report.totals.tasks_pending },
    { name: "Cancelled", value: report.totals.tasks_cancelled },
  ].filter((d) => d.value > 0);

  const dailyChartData = report.dailyReports.map((d) => ({
    label: format(new Date(d.date + "T00:00:00"), "EEE"),
    completed: d.tasks_completed,
    focus: Math.round((d.total_focus_minutes / 60) * 10) / 10,
  }));

  const focusHours = Math.round((report.totals.total_focus_minutes / 60) * 10) / 10;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-xs text-slate-400">Completed</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-green-400">
              {report.totals.tasks_completed}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-400" />
              <span className="text-xs text-slate-400">Focus</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-indigo-400">{focusHours}h</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-slate-400">Completion</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-yellow-400">
              {report.totals.completion_rate}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-slate-400">Avg Focus/Day</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-purple-400">
              {Math.round(report.totals.avg_focus_minutes_per_day)}m
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily bar chart */}
        <Card className="border-slate-800 bg-slate-900 p-4">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-sm text-slate-300">Daily Tasks</CardTitle>
          </CardHeader>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="completed" fill="#818cf8" radius={[4, 4, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Task distribution pie */}
        <Card className="border-slate-800 bg-slate-900 p-4">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-sm text-slate-300">Task Distribution</CardTitle>
          </CardHeader>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4">
            {pieData.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {entry.name}: {entry.value}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="border-slate-800 bg-slate-900 p-4">
        <CardHeader className="px-0 pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <CardTitle className="text-sm text-slate-300">AI Insights</CardTitle>
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={handleGenerateInsights}
              disabled={generatingInsights}
              className="border-slate-700 text-slate-400"
            >
              {generatingInsights ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3 w-3" />
              )}
              {report.aiInsights ? "Refresh" : "Generate"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {report.aiInsights ? (
            <div className="rounded-lg bg-slate-950 p-4 text-sm leading-relaxed text-slate-300">
              {report.aiInsights}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Click &ldquo;Generate&rdquo; to get AI-powered productivity insights for this week.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
