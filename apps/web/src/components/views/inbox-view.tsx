"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Inbox, Plus } from "lucide-react";
import { useListStore } from "@/stores/list-store";
import { useItemStore } from "@/stores/item-store";
import { TaskList } from "@/components/tasks/task-list";
import { QuickAdd } from "@/components/tasks/quick-add";
import { floatingIcon, pageHeaderVariants } from "@/lib/animations";

export function InboxView() {
  const { lists, fetchLists, getInbox } = useListStore();
  const { items, isLoading, fetchItemsByList } = useItemStore();

  const inbox = getInbox();

  useEffect(() => {
    if (lists.length === 0) fetchLists();
  }, [lists.length, fetchLists]);

  useEffect(() => {
    if (inbox?.id) fetchItemsByList(inbox.id);
  }, [inbox?.id, fetchItemsByList]);

  const activeItems = items.filter((i) => !i.is_completed);
  const completedItems = items.filter((i) => i.is_completed);

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <motion.div
        className="flex items-center gap-3 px-5 pb-4 pt-8"
        variants={pageHeaderVariants}
        initial="hidden"
        animate="visible"
      >
        <Inbox className="h-6 w-6 text-blue-400" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Inbox
        </h1>
        {items.length > 0 && (
          <span className="text-sm tabular-nums text-muted-foreground">
            {activeItems.length}
          </span>
        )}
      </motion.div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-2">
        {isLoading && items.length === 0 ? (
          <div className="space-y-2 px-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-10 shimmer rounded-lg bg-muted/50"
              />
            ))}
          </div>
        ) : (
          <>
            <TaskList items={activeItems} listId={inbox?.id} />

            {inbox?.id && <QuickAdd listId={inbox.id} />}

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
                <motion.div variants={floatingIcon} initial="hidden" animate="visible">
                  <Inbox className="mb-3 h-10 w-10 text-muted-foreground/30" />
                </motion.div>
                <p className="font-medium text-foreground">Inbox zero</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Tasks from quick-add, Slack, and email land here
                </p>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-create-modal"))}
                  className="mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Add your first task
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
