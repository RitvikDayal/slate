"use client";

import type { Task } from "@ai-todo/shared";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const priorityStripe: Record<string, string> = {
  high: "bg-[oklch(0.65_0.22_27)]",
  medium: "bg-primary",
  low: "bg-[oklch(0.72_0.16_145)]",
};

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
}

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const isDone = task.status === "done";

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-xl px-3 py-1 transition-colors hover:bg-card",
        isDone && "opacity-40"
      )}
    >
      {/* Priority stripe */}
      <div
        className={cn(
          "h-8 w-[3px] shrink-0 rounded-full",
          priorityStripe[task.priority]
        )}
      />

      {/* Completion toggle — 44px touch target */}
      <button
        onClick={() => !isDone && onComplete(task.id)}
        className="-mx-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors"
        aria-label={isDone ? "Completed" : "Mark complete"}
      >
        {isDone ? (
          <CheckCircle2 className="h-[18px] w-[18px] text-primary" />
        ) : (
          <Circle className="h-[18px] w-[18px] text-muted-foreground/40 transition-colors group-hover:text-muted-foreground/70" />
        )}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1 py-3">
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            isDone && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>
        {task.estimated_minutes && !isDone && (
          <p className="mt-0.5 text-xs text-muted-foreground/60">
            {task.estimated_minutes}m
          </p>
        )}
      </div>

      {!task.is_movable && (
        <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
      )}
    </div>
  );
}
