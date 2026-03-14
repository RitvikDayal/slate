"use client";

import type { Task } from "@ai-todo/shared";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const priorityColors = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low: "bg-green-500/10 text-green-400 border-green-500/20",
};

const effortLabels: Record<string, string> = {
  xs: "XS", s: "S", m: "M", l: "L", xl: "XL",
};

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
}

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const isDone = task.status === "done";

  return (
    <Card
      className={cn(
        "flex items-center gap-3 border-slate-800 bg-slate-900 p-3 transition-all",
        isDone && "opacity-50"
      )}
    >
      <button
        onClick={() => !isDone && onComplete(task.id)}
        className="shrink-0"
      >
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-green-400" />
        ) : (
          <Circle className="h-5 w-5 text-slate-600 hover:text-indigo-400" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", isDone && "line-through text-slate-500")}>
          {task.title}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="outline" className={priorityColors[task.priority]}>
            {task.priority.toUpperCase()}
          </Badge>
          {task.effort && (
            <Badge variant="outline" className="border-slate-700 text-slate-400">
              {effortLabels[task.effort]}
            </Badge>
          )}
          {task.estimated_minutes && (
            <span className="text-xs text-slate-500">
              {task.estimated_minutes}m
            </span>
          )}
        </div>
      </div>

      {!task.is_movable && (
        <Lock className="h-4 w-4 shrink-0 text-slate-600" />
      )}
    </Card>
  );
}
