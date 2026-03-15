"use client";

import type { ScheduleSlot } from "@ai-todo/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const slotColors: Record<string, string> = {
  calendar_event: "border-l-event-text bg-event-bg",
  task: "border-l-primary bg-primary/5",
  break: "border-l-info bg-info/5",
  focus: "border-l-success bg-success/5",
};

const slotBadgeColors: Record<string, string> = {
  calendar_event: "bg-event-bg text-event-text",
  task: "bg-primary/10 text-primary",
  break: "bg-info/10 text-info",
  focus: "bg-success/10 text-success",
};

interface ScheduleTimelineProps {
  slots: ScheduleSlot[];
}

export function ScheduleTimeline({ slots }: ScheduleTimelineProps) {
  return (
    <div className="relative space-y-1 border-l-2 border-border pl-4">
      {slots.map((slot, i) => (
        <div key={i} className="relative">
          <div className="absolute -left-[1.3rem] top-3 h-2.5 w-2.5 rounded-full border-2 border-muted-foreground bg-background" />

          <Card
            className={cn(
              "border-l-4 border-border bg-card p-3",
              slotColors[slot.type]
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
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
              <p className="mt-1 text-xs text-muted-foreground">{slot.notes}</p>
            )}
          </Card>
        </div>
      ))}
    </div>
  );
}
