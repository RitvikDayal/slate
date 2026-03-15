"use client";

import type { Task } from "@ai-todo/shared";
import { TaskCard } from "./task-card";
import { format, parseISO } from "date-fns";

interface TimelineSlotProps {
  task: Task;
  onComplete: (id: string) => void;
}

export function TimelineSlot({ task, onComplete }: TimelineSlotProps) {
  return (
    <div className="relative">
      {/* Time indicator dot */}
      <div className="absolute -left-[1.3rem] top-4 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />

      {/* Time label */}
      {task.scheduled_start && (
        <p className="mb-1 text-xs font-medium text-primary">
          {format(parseISO(task.scheduled_start), "h:mm a")}
          {task.scheduled_end && (
            <span className="text-muted-foreground">
              {" — "}
              {format(parseISO(task.scheduled_end), "h:mm a")}
            </span>
          )}
        </p>
      )}

      <TaskCard task={task} onComplete={onComplete} />
    </div>
  );
}
