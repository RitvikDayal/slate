"use client";

import { useState } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";
import { useCalendarEvents } from "@/lib/hooks/use-calendar-events";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ViewMode = "week" | "month";

export function CalendarView() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const rangeStart =
    viewMode === "week"
      ? startOfWeek(currentDate, { weekStartsOn: 1 })
      : startOfMonth(currentDate);
  const rangeEnd =
    viewMode === "week"
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : endOfMonth(currentDate);

  const startStr = format(rangeStart, "yyyy-MM-dd");
  const endStr = format(rangeEnd, "yyyy-MM-dd");

  const { events, tasks } = useCalendarEvents(startStr, endStr);

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () =>
    setCurrentDate(
      viewMode === "week"
        ? subWeeks(currentDate, 1)
        : subMonths(currentDate, 1)
    );
  const goNext = () =>
    setCurrentDate(
      viewMode === "week"
        ? addWeeks(currentDate, 1)
        : addMonths(currentDate, 1)
    );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrev}
            className="border-border"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="border-border text-xs"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goNext}
            className="border-border"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h1 className="ml-2 text-lg font-semibold">
            {viewMode === "week"
              ? `${format(rangeStart, "MMM d")} \u2013 ${format(rangeEnd, "MMM d, yyyy")}`
              : format(currentDate, "MMMM yyyy")}
          </h1>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          <Button
            variant={viewMode === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("week")}
            className={
              viewMode === "week" ? "bg-primary" : "text-muted-foreground"
            }
          >
            Week
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("month")}
            className={
              viewMode === "month" ? "bg-primary" : "text-muted-foreground"
            }
          >
            Month
          </Button>
        </div>
      </div>

      {/* View */}
      <div className="flex-1 overflow-auto">
        {viewMode === "week" ? (
          <WeekView events={events} tasks={tasks} startDate={rangeStart} />
        ) : (
          <MonthView
            events={events}
            tasks={tasks}
            currentDate={currentDate}
            onDayClick={(date) => {
              setCurrentDate(date);
              setViewMode("week");
            }}
          />
        )}
      </div>
    </div>
  );
}
