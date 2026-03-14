"use client";

import { useState, useEffect, useCallback } from "react";
import type { WeeklyReport } from "@ai-todo/shared";

export function useWeeklyReport(weekDate: string) {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!weekDate) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/reports/weekly?week=${encodeURIComponent(weekDate)}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch weekly report");
      }
      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [weekDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const generateInsights = useCallback(
    async (startDate: string, endDate: string) => {
      const res = await fetch("/api/reports/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate insights");
      }
      return res.json();
    },
    []
  );

  return { report, isLoading, error, refetch: fetchReport, generateInsights };
}
