"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { ChevronRight, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { taskItemVariants, layoutSpring } from "@/lib/animations";
import { playComplete, playUncomplete } from "@/lib/sounds";
import { useItemStore } from "@/stores/item-store";
import { useUIStore } from "@/stores/ui-store";
import type { Item } from "@ai-todo/shared";

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMM d");
}

function isDueDateOverdue(dateStr: string): boolean {
  const date = new Date(dateStr + "T23:59:59");
  return isPast(date) && !isToday(new Date(dateStr + "T00:00:00"));
}

const priorityColors: Record<string, string> = {
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
};

const effortLabels: Record<string, string> = {
  xs: "XS",
  s: "S",
  m: "M",
  l: "L",
  xl: "XL",
};

// Easing
const easeOutQuart: [number, number, number, number] = [0.25, 1, 0.5, 1];

interface TaskItemProps {
  item: Item;
  depth?: number;
  childItems?: Item[];
}

export function TaskItem({ item, depth = 0, childItems = [] }: TaskItemProps) {
  const { toggleComplete, setSelectedItem } = useItemStore();
  const allItems = useItemStore((s) => s.items);
  const { setDetailPanelOpen } = useUIStore();
  const [justCompleted, setJustCompleted] = useState(false);
  const [childrenVisible, setChildrenVisible] = useState(false);
  const hasChildren = childItems.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const sortStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    paddingLeft: (depth ?? 0) * 24,
  };

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (item.is_completed) {
        playUncomplete();
      } else {
        playComplete();
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 600);
      }
      toggleComplete(item.id);
    },
    [item.id, item.is_completed, toggleComplete]
  );

  const handleClick = useCallback(() => {
    setSelectedItem(item.id);
    setDetailPanelOpen(true);
  }, [item.id, setSelectedItem, setDetailPanelOpen]);

  const isChecked = item.is_completed;

  return (
    <motion.div
      ref={setNodeRef}
      style={sortStyle}
      variants={taskItemVariants}
      layout
      transition={layoutSpring}
      className="group"
    >
      <div
        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50 active:bg-muted/70"
        onClick={handleClick}
      >
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex h-4 w-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Disclosure chevron */}
        {hasChildren ? (
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setChildrenVisible(!childrenVisible);
            }}
            animate={{ rotate: childrenVisible ? 90 : 0 }}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </motion.button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Animated Checkbox */}
        <motion.button
          type="button"
          onClick={handleToggle}
          whileTap={{ scale: 0.85 }}
          className={cn(
            "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
            isChecked
              ? "border-success bg-success"
              : "border-border hover:border-primary/60"
          )}
        >
          <AnimatePresence>
            {isChecked && (
              <motion.svg
                key="checkmark"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                <motion.path
                  d="M2.5 6.5L5 9L9.5 3.5"
                  stroke="var(--color-background)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.25, ease: easeOutQuart }}
                />
              </motion.svg>
            )}
          </AnimatePresence>

          {/* Completion ring burst */}
          {justCompleted && (
            <motion.span
              className="absolute inset-0 rounded-md border-2 border-success"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.4, ease: easeOutQuart }}
            />
          )}
        </motion.button>

        {/* Title with animated strikethrough */}
        <span className="relative min-w-0 flex-1 truncate text-[15px] leading-tight">
          <span
            className={cn(
              "transition-opacity duration-300",
              isChecked ? "text-muted-foreground opacity-40" : "text-foreground"
            )}
          >
            {item.title}
          </span>
          {/* Animated strikethrough line */}
          {isChecked && (
            <motion.span
              className="absolute left-0 top-1/2 h-[1.5px] w-full bg-muted-foreground/40"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3, ease: easeOutQuart, delay: 0.05 }}
            />
          )}
        </span>

        {/* Metadata */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Due date */}
          {item.due_date && !isChecked && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                isDueDateOverdue(item.due_date)
                  ? "bg-destructive/10 text-destructive"
                  : isToday(new Date(item.due_date + "T00:00:00"))
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {formatDueDate(item.due_date)}
            </span>
          )}

          {/* Effort badge */}
          {item.effort && !isChecked && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {effortLabels[item.effort] ?? item.effort}
            </span>
          )}

          {/* Priority dot */}
          {item.priority !== "none" && !isChecked && (
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                priorityColors[item.priority] ?? "bg-muted-foreground"
              )}
            />
          )}
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {childrenVisible && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {childItems
              .sort((a, b) => a.position - b.position)
              .map((child) => {
                const grandChildren = allItems.filter(
                  (c) => c.parent_item_id === child.id
                );
                return (
                  <TaskItem
                    key={child.id}
                    item={child}
                    depth={depth + 1}
                    childItems={grandChildren}
                  />
                );
              })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
