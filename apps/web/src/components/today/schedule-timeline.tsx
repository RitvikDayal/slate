"use client";

import type { ScheduleSlot } from "@ai-todo/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const slotColors: Record<string, string> = {
  calendar_event: "border-l-blue-500 bg-blue-500/5",
  task: "border-l-indigo-500 bg-indigo-500/5",
  break: "border-l-purple-500 bg-purple-500/5",
  focus: "border-l-teal-500 bg-teal-500/5",
};

const slotBadgeColors: Record<string, string> = {
  calendar_event: "bg-blue-500/10 text-blue-400",
  task: "bg-indigo-500/10 text-indigo-400",
  break: "bg-purple-500/10 text-purple-400",
  focus: "bg-teal-500/10 text-teal-400",
};

interface ScheduleTimelineProps {
  slots: ScheduleSlot[];
}

export function ScheduleTimeline({ slots }: ScheduleTimelineProps) {
  return (
    <div className="relative space-y-1 border-l-2 border-slate-800 pl-4">
      {slots.map((slot, i) => (
        <div key={i} className="relative">
          <div className="absolute -left-[1.3rem] top-3 h-2.5 w-2.5 rounded-full border-2 border-slate-600 bg-slate-950" />

          <Card
            className={cn(
              "border-l-4 border-slate-800 bg-slate-900 p-3",
              slotColors[slot.type]
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">
                  {format(parseISO(slot.start), "h:mm a")} —{" "}
                  {format(parseISO(slot.end), "h:mm a")}
                </p>
                <p className="mt-0.5 text-sm font-medium">{slot.title}</p>
              </div>
              <Badge
                variant="outline"
                className={slotBadgeColors[slot.type]}
              >
                {slot.type.replace("_", " ")}
              </Badge>
            </div>
            {slot.notes && (
              <p className="mt-1 text-xs text-slate-500">{slot.notes}</p>
            )}
          </Card>
        </div>
      ))}
    </div>
  );
}
