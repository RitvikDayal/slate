"use client";

import { useState, useEffect, useCallback } from "react";
import type { DailyReport } from "@ai-todo/shared";

export function useDailyReports(from: string, to: string) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!from || !to) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/reports/daily?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch reports");
      }
      const data = await res.json();
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, isLoading, error, refetch: fetchReports };
}
