"use client";

import { useCallback, useEffect, useState } from "react";
import type { DailySchedule } from "@ai-todo/shared";

export function useSchedule(date: string) {
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSchedule = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/schedule/${date}`);
      if (res.ok) {
        setSchedule(await res.json());
      } else {
        setSchedule(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const confirmSchedule = async () => {
    const res = await fetch(`/api/schedule/${date}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_confirmed: true, status: "active" }),
    });
    if (res.ok) {
      setSchedule(await res.json());
    }
  };

  return { schedule, isLoading, fetchSchedule, confirmSchedule };
}
