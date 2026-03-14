"use client";

import { useState, useEffect, useCallback } from "react";
import type { SlackTaskSuggestion } from "@ai-todo/shared";

export function useSlackSuggestions(status?: string) {
  const [suggestions, setSuggestions] = useState<SlackTaskSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = status
        ? `/api/slack/suggestions?status=${encodeURIComponent(status)}`
        : "/api/slack/suggestions";
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch suggestions");
      }
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const acceptSuggestion = useCallback(
    async (
      id: string,
      overrides?: {
        title?: string;
        priority?: string;
        effort?: string;
        scheduled_date?: string;
      }
    ) => {
      const res = await fetch(`/api/slack/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", ...overrides }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept suggestion");
      }
      const data = await res.json();
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      return data;
    },
    []
  );

  const dismissSuggestion = useCallback(async (id: string) => {
    const res = await fetch(`/api/slack/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss" }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to dismiss suggestion");
    }
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    refetch: fetchSuggestions,
    acceptSuggestion,
    dismissSuggestion,
  };
}
