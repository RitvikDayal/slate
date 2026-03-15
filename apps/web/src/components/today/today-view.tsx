"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useItemStore } from "@/stores/item-store";
import { useListStore } from "@/stores/list-store";
import { useSchedule } from "@/lib/hooks/use-schedule";
import { TaskList } from "@/components/tasks/task-list";
import { QuickAdd } from "@/components/tasks/quick-add";
import { ScheduleTimeline } from "./schedule-timeline";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Plus, Sparkles, Settings, Check } from "lucide-react";
import { format } from "date-fns";
import { floatingIcon, pageHeaderVariants } from "@/lib/animations";
import { playAllComplete, haptic } from "@/lib/sounds";
import { useRouter } from "next/navigation";

export function TodayView() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { items, isLoading, fetchTodayItems } = useItemStore();
  const { getInbox, lists, fetchLists } = useListStore();
  const { schedule, confirmSchedule } = useSchedule(today);
  const router = useRouter();
  const [celebrated, setCelebrated] = useState(false);

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

  // All-tasks-complete celebration
  const allDone = items.length > 0 && items.every((i) => i.is_completed);
  useEffect(() => {
    if (allDone && !celebrated) {
      setCelebrated(true);
      playAllComplete();
      haptic("medium");
    }
    if (!allDone) {
      setCelebrated(false);
    }
  }, [allDone, celebrated]);

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
        {completedItems.length > 0 && !allDone && (
          <section className="border-t border-border/50 pt-4">
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Completed
            </p>
            <TaskList items={completedItems} />
          </section>
        )}

        {/* All-tasks-complete celebration */}
        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-1 flex-col items-center justify-center py-16 text-center"
            >
              <div className="relative">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Check className="h-12 w-12 text-success" />
                </motion.div>
                {/* Burst particles */}
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                  <motion.span
                    key={angle}
                    className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: ["var(--color-primary)", "var(--color-success)", "var(--color-warning)"][i % 3],
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos((angle * Math.PI) / 180) * 40,
                      y: Math.sin((angle * Math.PI) / 180) * 40,
                      opacity: 0,
                      scale: 0,
                    }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  />
                ))}
              </div>
              <p className="mt-4 text-lg font-semibold text-foreground">All done!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {doneCount} task{doneCount !== 1 ? "s" : ""} completed today
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!isLoading && items.length === 0 && !schedule?.plan?.length && (
          <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
            <motion.div variants={floatingIcon} initial="hidden" animate="visible">
              <CalendarCheck className="mb-3 h-10 w-10 text-muted-foreground/30" />
            </motion.div>
            <p className="font-medium text-foreground">Nothing planned for today</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started with one of these actions
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-create-modal"))}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                Add a task
              </button>
              <button
                type="button"
                onClick={() => router.push("/chat")}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Sparkles className="h-4 w-4" />
                Ask AI to plan
              </button>
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
                Sync calendar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Onboarding modal */}
      <WelcomeModal />
    </div>
  );
}
