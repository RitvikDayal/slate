"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeSchedule(date: string, onUpdate: () => void) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`schedule-${date}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_schedules",
          filter: `date=eq.${date}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, onUpdate]);
}
