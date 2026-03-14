"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeTasks(date: string, onUpdate: () => void) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`tasks-${date}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `scheduled_date=eq.${date}`,
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
