"use client";

import { useEffect, useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { useItemStore } from "@/stores/item-store";
import { TaskList } from "@/components/tasks/task-list";

function formatGroupDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMM d");
}

export function UpcomingView() {
  const { items, isLoading, fetchUpcomingItems } = useItemStore();

  useEffect(() => {
    fetchUpcomingItems();
  }, [fetchUpcomingItems]);

  // Group items by due_date
  const groupedItems = useMemo(() => {
    const groups = new Map<string, typeof items>();
    const withDate = items.filter((i) => i.due_date && !i.is_completed);
    const noDate = items.filter((i) => !i.due_date && !i.is_completed);

    for (const item of withDate) {
      const key = item.due_date!;
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    }

    // Sort by date
    const sorted = Array.from(groups.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    return { sorted, noDate };
  }, [items]);

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pb-4 pt-8">
        <CalendarClock className="h-6 w-6 text-amber-400" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Upcoming
        </h1>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-6 px-2">
        {isLoading && items.length === 0 ? (
          <div className="space-y-2 px-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-muted/50"
              />
            ))}
          </div>
        ) : (
          <>
            {groupedItems.sorted.map(([date, dateItems]) => (
              <section key={date}>
                <p className="mb-1 px-3 text-[13px] font-semibold text-foreground">
                  {formatGroupDate(date)}
                </p>
                <TaskList items={dateItems} />
              </section>
            ))}

            {groupedItems.noDate.length > 0 && (
              <section>
                <p className="mb-1 px-3 text-[13px] font-semibold text-muted-foreground">
                  No date
                </p>
                <TaskList items={groupedItems.noDate} />
              </section>
            )}

            {!isLoading && items.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
                <CalendarClock className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="font-medium text-foreground">All clear</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No upcoming tasks scheduled
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
