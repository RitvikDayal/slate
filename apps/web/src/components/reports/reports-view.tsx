"use client";

import { useState } from "react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { DailyReportView } from "./daily-report-view";
import { WeeklyReportView } from "./weekly-report-view";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays, Calendar } from "lucide-react";

type ViewMode = "daily" | "weekly";

export function ReportsView() {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigateBack = () => {
    setCurrentDate((d) => subDays(d, viewMode === "daily" ? 7 : 7));
  };

  const navigateForward = () => {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + (viewMode === "daily" ? 7 : 7));
      return next > new Date() ? new Date() : next;
    });
  };

  const dateLabel = viewMode === "daily"
    ? `${format(subDays(currentDate, 6), "MMM d")} - ${format(currentDate, "MMM d, yyyy")}`
    : `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`;

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track your productivity and trends.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-card p-1">
          <Button
            variant={viewMode === "daily" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("daily")}
          >
            <CalendarDays className="mr-1.5 h-4 w-4" />
            Daily
          </Button>
          <Button
            variant={viewMode === "weekly" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("weekly")}
          >
            <Calendar className="mr-1.5 h-4 w-4" />
            Weekly
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" onClick={navigateBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-secondary-foreground">{dateLabel}</span>
        <Button variant="ghost" size="icon-sm" onClick={navigateForward}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="mt-6">
        {viewMode === "daily" ? (
          <DailyReportView currentDate={currentDate} />
        ) : (
          <WeeklyReportView currentDate={currentDate} />
        )}
      </div>
    </div>
  );
}
