"use client";

import { useEffect, useState } from "react";
import type { DailyReport } from "@ai-todo/shared";
import { Card } from "@/components/ui/card";
import { format, subDays } from "date-fns";

export function ReportsView() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      const dates = Array.from({ length: 7 }, (_, i) =>
        format(subDays(new Date(), i), "yyyy-MM-dd")
      );

      const results: DailyReport[] = [];
      for (const date of dates) {
        const res = await fetch(`/api/reports/${date}`);
        if (res.ok) results.push(await res.json());
      }

      setReports(results);
      setIsLoading(false);
    }
    fetchReports();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-slate-400">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold">Reports</h1>

      {reports.length === 0 && (
        <p className="text-slate-400">
          No reports yet. Reports are generated at end of day.
        </p>
      )}

      {reports.map((report) => (
        <Card key={report.id} className="border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {format(new Date(report.date), "EEEE, MMM d")}
            </h2>
            <div className="text-sm text-slate-400">
              {report.tasks_completed}/
              {report.tasks_completed + report.tasks_pending} done
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded bg-green-900/30 p-2">
              <p className="text-lg font-bold text-green-400">
                {report.tasks_completed}
              </p>
              <p className="text-xs text-slate-400">Completed</p>
            </div>
            <div className="rounded bg-yellow-900/30 p-2">
              <p className="text-lg font-bold text-yellow-400">
                {report.tasks_pending}
              </p>
              <p className="text-xs text-slate-400">Pending</p>
            </div>
            <div className="rounded bg-indigo-900/30 p-2">
              <p className="text-lg font-bold text-indigo-400">
                {report.total_focus_minutes}m
              </p>
              <p className="text-xs text-slate-400">Focus</p>
            </div>
          </div>

          {report.ai_summary && (
            <p className="mt-3 text-sm text-slate-300">{report.ai_summary}</p>
          )}
        </Card>
      ))}
    </div>
  );
}
