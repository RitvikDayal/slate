"use client";

import {
  format,
  addDays,
  isSameDay,
  parseISO,
  differenceInMinutes,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@ai-todo/shared";

interface WeekViewProps {
  events: CalendarEvent[];
  startDate: Date;
}

const HOUR_START = 7;
const HOUR_END = 22;
const HOUR_HEIGHT = 60; // px per hour
const TOTAL_HOURS = HOUR_END - HOUR_START;

export function WeekView({ events, startDate }: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);

  const allDayEvents = events.filter((e) => e.is_all_day);
  const timedEvents = events.filter((e) => !e.is_all_day);

  function getEventStyle(event: CalendarEvent) {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    const startMinutes =
      start.getHours() * 60 + start.getMinutes() - HOUR_START * 60;
    const duration = differenceInMinutes(end, start);
    return {
      top: `${(startMinutes / 60) * HOUR_HEIGHT}px`,
      height: `${Math.max((duration / 60) * HOUR_HEIGHT, 20)}px`,
    };
  }

  return (
    <div className="flex flex-col">
      {/* All-day events row */}
      {allDayEvents.length > 0 && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
          <div className="p-1 text-xs text-muted-foreground">All day</div>
          {days.map((day) => {
            const dayEvents = allDayEvents.filter((e) =>
              isSameDay(parseISO(e.start_time), day)
            );
            return (
              <div
                key={day.toISOString()}
                className="border-l border-border p-1"
              >
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    className="mb-0.5 truncate rounded bg-accent/20 px-1.5 py-0.5 text-xs text-accent-foreground"
                  >
                    {e.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
        <div />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="border-l border-border px-2 py-2 text-center"
          >
            <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
            <p
              className={cn(
                "text-lg font-semibold",
                isSameDay(day, new Date()) &&
                  "mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
              )}
            >
              {format(day, "d")}
            </p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div
        className="grid grid-cols-[60px_repeat(7,1fr)]"
        style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
      >
        {/* Time labels */}
        <div className="relative">
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute right-2 text-xs text-muted-foreground"
              style={{ top: `${(hour - HOUR_START) * HOUR_HEIGHT}px` }}
            >
              {format(new Date(2000, 0, 1, hour), "h a")}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const dayEvents = timedEvents.filter((e) =>
            isSameDay(parseISO(e.start_time), day)
          );
          return (
            <div
              key={day.toISOString()}
              className="relative border-l border-border"
            >
              {/* Hour lines */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-border/50"
                  style={{
                    top: `${(hour - HOUR_START) * HOUR_HEIGHT}px`,
                  }}
                />
              ))}

              {/* Events */}
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  className="absolute left-1 right-1 overflow-hidden rounded border-l-2 border-primary bg-primary/15 px-1.5 py-0.5"
                  style={getEventStyle(event)}
                >
                  <p className="truncate text-xs font-medium text-primary">
                    {event.title}
                  </p>
                  <p className="text-[10px] text-primary/80">
                    {format(parseISO(event.start_time), "h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
