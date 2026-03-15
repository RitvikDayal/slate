"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useItemStore } from "@/stores/item-store";
import { useListStore } from "@/stores/list-store";
import { useSchedule } from "@/lib/hooks/use-schedule";
import { TaskList } from "@/components/tasks/task-list";
import { QuickAdd } from "@/components/tasks/quick-add";
import { ScheduleTimeline } from "./schedule-timeline";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import { floatingIcon, pageHeaderVariants } from "@/lib/animations";

export function TodayView() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { items, isLoading, fetchTodayItems } = useItemStore();
  const { getInbox, lists, fetchLists } = useListStore();
  const { schedule, confirmSchedule } = useSchedule(today);

  useEffect(() => {
    fetchTodayItems();
    if (lists.length === 0) fetchLists();
  }, [fetchTodayItems, lists.length, fetchLists]);

  const inbox = getInbox();
  const scheduledItems = items.filter((i) => i.scheduled_start && !i.is_completed);
  const unscheduledActive = items.filter((i) => !i.scheduled_start && !i.is_completed);
  const completedItems = items.filter((i) => i.is_completed);
  const doneCount = completedItems.length;
  const hasScheduledSection = scheduledItems.length > 0 || (schedule?.plan?.length ?? 0) > 0;

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <motion.div
        className="flex items-start justify-between px-5 pb-5 pt-8"
        variants={pageHeaderVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {format(new Date(), "EEEE")}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {format(new Date(), "MMMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          {items.length > 0 && (
            <span className="text-sm tabular-nums text-muted-foreground">
              {doneCount}/{items.length}
            </span>
          )}
          <NotificationBell />
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-5 px-2">
        {/* AI plan ready banner */}
        {schedule && schedule.status === "draft" && !schedule.user_confirmed && (
          <div className="mx-3 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-primary">AI Plan Ready</p>
              <p className="text-xs text-muted-foreground">
                {schedule.plan?.length ?? 0} items scheduled
              </p>
            </div>
            <Button
              size="sm"
              onClick={confirmSchedule}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Confirm
            </Button>
          </div>
        )}

        {/* AI Schedule Timeline */}
        {schedule?.plan && schedule.plan.length > 0 && (
          <section className="space-y-2 px-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              AI Schedule
            </p>
            <ScheduleTimeline slots={schedule.plan} />
          </section>
        )}

        {/* Scheduled items */}
        {scheduledItems.length > 0 && !schedule?.plan?.length && (
          <section>
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Scheduled
            </p>
            <TaskList items={scheduledItems} />
          </section>
        )}

        {/* Unscheduled tasks */}
        {unscheduledActive.length > 0 && (
          <section>
            {hasScheduledSection && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Tasks
              </p>
            )}
            <TaskList items={unscheduledActive} />
          </section>
        )}

        {/* Quick add */}
        {inbox?.id && <QuickAdd listId={inbox.id} defaultDueDate={today} />}

        {/* Completed */}
        {completedItems.length > 0 && (
          <section className="border-t border-border/50 pt-4">
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Completed
            </p>
            <TaskList items={completedItems} />
          </section>
        )}

        {/* Empty state */}
        {!isLoading && items.length === 0 && !schedule?.plan?.length && (
          <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
            <motion.div variants={floatingIcon} animate="animate">
              <CalendarCheck className="mb-3 h-10 w-10 text-muted-foreground/30" />
            </motion.div>
            <p className="font-medium text-foreground">Nothing planned for today</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Enjoy the calm, or add a task below
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
