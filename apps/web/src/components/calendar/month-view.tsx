"use client";

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@ai-todo/shared";

interface MonthViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDayClick: (date: Date) => void;
}

const MAX_VISIBLE = 3;

export function MonthView({ events, currentDate, onDayClick }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="px-2 py-1.5 text-center text-xs text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex flex-1 flex-col">
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className="grid flex-1 grid-cols-7 border-b border-border"
          >
            {week.map((d) => {
              const dayEvents = events.filter((e) =>
                isSameDay(parseISO(e.start_time), d)
              );
              const visible = dayEvents.slice(0, MAX_VISIBLE);
              const overflow = dayEvents.length - MAX_VISIBLE;

              return (
                <div
                  key={d.toISOString()}
                  className={cn(
                    "cursor-pointer border-l border-border p-1 hover:bg-muted/50",
                    !isSameMonth(d, currentDate) && "opacity-40"
                  )}
                  onClick={() => onDayClick(d)}
                >
                  <p
                    className={cn(
                      "mb-0.5 text-xs",
                      isToday(d) &&
                        "flex h-5 w-5 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground"
                    )}
                  >
                    {format(d, "d")}
                  </p>
                  {visible.map((e) => (
                    <div
                      key={e.id}
                      className="mb-0.5 truncate rounded bg-accent/20 px-1 py-0.5 text-[10px] text-accent-foreground"
                    >
                      {e.title}
                    </div>
                  ))}
                  {overflow > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      +{overflow} more
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
