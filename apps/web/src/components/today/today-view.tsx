"use client";

import { useTasks } from "@/lib/hooks/use-tasks";
import { TaskCard } from "./task-card";
import { QuickAddFab } from "./quick-add-fab";
import { TimelineSlot } from "./timeline-slot";
import { format } from "date-fns";

export function TodayView() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { tasks, isLoading, completeTask, createTask } = useTasks(today);

  const scheduledTasks = tasks.filter((t) => t.scheduled_start);
  const unscheduledTasks = tasks.filter((t) => !t.scheduled_start);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Date header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {format(new Date(), "EEEE")}
          </h1>
          <p className="text-sm text-slate-400">
            {format(new Date(), "MMMM d, yyyy")}
          </p>
        </div>
        <div className="text-right text-sm text-slate-400">
          {tasks.filter((t) => t.status === "done").length}/{tasks.length} done
        </div>
      </div>

      {/* Timeline for scheduled tasks */}
      {scheduledTasks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400">Schedule</h2>
          <div className="relative space-y-1 border-l-2 border-slate-800 pl-4">
            {scheduledTasks.map((task) => (
              <TimelineSlot key={task.id} task={task} onComplete={completeTask} />
            ))}
          </div>
        </section>
      )}

      {/* Unscheduled tasks */}
      {unscheduledTasks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400">Unscheduled</h2>
          <div className="space-y-2">
            {unscheduledTasks.map((task) => (
              <TaskCard key={task.id} task={task} onComplete={completeTask} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!isLoading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-slate-400">No tasks for today</p>
          <p className="text-sm text-slate-500">Tap + to add your first task</p>
        </div>
      )}

      <QuickAddFab onAdd={createTask} />
    </div>
  );
}
