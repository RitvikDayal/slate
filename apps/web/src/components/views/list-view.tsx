"use client";

import { useEffect } from "react";
import { List as ListIcon } from "lucide-react";
import { useListStore } from "@/stores/list-store";
import { useItemStore } from "@/stores/item-store";
import { TaskList } from "@/components/tasks/task-list";
import { QuickAdd } from "@/components/tasks/quick-add";

interface ListViewProps {
  listId: string;
}

export function ListView({ listId }: ListViewProps) {
  const { lists, fetchLists } = useListStore();
  const { items, isLoading, fetchItemsByList } = useItemStore();

  const list = lists.find((l) => l.id === listId);

  useEffect(() => {
    if (lists.length === 0) {
      fetchLists();
    }
  }, [lists.length, fetchLists]);

  useEffect(() => {
    fetchItemsByList(listId);
  }, [listId, fetchItemsByList]);

  const activeItems = items.filter((i) => !i.is_completed);
  const completedItems = items.filter((i) => i.is_completed);

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pb-4 pt-8">
        {list?.icon ? (
          <span className="text-2xl">{list.icon}</span>
        ) : (
          <ListIcon className="h-6 w-6 text-primary" />
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {list?.title ?? "List"}
        </h1>
        {items.length > 0 && (
          <span className="text-sm tabular-nums text-muted-foreground">
            {activeItems.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-2">
        {isLoading && items.length === 0 ? (
          <div className="space-y-2 px-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-muted/50"
              />
            ))}
          </div>
        ) : (
          <>
            <TaskList items={activeItems} listId={listId} />

            <div className="hidden md:block">
              <QuickAdd listId={listId} />
            </div>

            {completedItems.length > 0 && (
              <div className="mt-4 border-t border-border/50 pt-4">
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Completed
                </p>
                <TaskList items={completedItems} />
              </div>
            )}

            {!isLoading && items.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
                <div className="mb-3 text-3xl opacity-30">
                  {list?.icon ?? "~"}
                </div>
                <p className="font-medium text-foreground">Empty list</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add your first task below
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
