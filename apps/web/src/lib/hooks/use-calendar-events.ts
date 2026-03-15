"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent } from "@ai-todo/shared";

export interface CalendarTask {
  id: string;
  title: string;
  due_date: string | null;
  scheduled_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  is_completed: boolean;
  priority: string | null;
}

export function useCalendarEvents(startDate: string, endDate: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/calendar/events?start=${startDate}&end=${endDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
        setTasks(data.tasks ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, tasks, isLoading, refetch: fetchEvents };
}
