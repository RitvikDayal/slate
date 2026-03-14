"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent } from "@ai-todo/shared";

export function useCalendarEvents(startDate: string, endDate: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/calendar/events?start=${startDate}&end=${endDate}`
      );
      if (res.ok) {
        setEvents(await res.json());
      }
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, isLoading, refetch: fetchEvents };
}
