"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { staggerContainer, taskItemVariants } from "@/lib/animations";
import { useItemStore } from "@/stores/item-store";
import { TaskItem } from "./task-item";
import type { Item } from "@ai-todo/shared";

interface TaskListProps {
  items: Item[];
  depth?: number;
  listId?: string;
}

export function TaskList({ items, depth = 0, listId }: TaskListProps) {
  const allItems = useItemStore((s) => s.items);
  const reorderItems = useItemStore((s) => s.reorderItems);
  const topLevelItems = items.filter((i) => !i.parent_item_id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !listId) return;
    const ids = topLevelItems
      .filter((i) => i.type === "task")
      .map((i) => i.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newIds = [...ids];
    newIds.splice(oldIndex, 1);
    newIds.splice(newIndex, 0, active.id as string);
    reorderItems(listId, newIds);
  }

  const taskIds = topLevelItems
    .filter((i) => i.type === "task")
    .map((i) => i.id);

  const listContent = (
    <motion.div
      variants={depth === 0 ? staggerContainer : undefined}
      initial={depth === 0 ? "hidden" : undefined}
      animate={depth === 0 ? "visible" : undefined}
      className="space-y-0.5"
    >
      <AnimatePresence mode="popLayout">
        {topLevelItems.map((item) => {
          if (item.type === "heading") {
            return (
              <motion.div
                key={item.id}
                variants={taskItemVariants}
                layout
                className="px-3 pb-1 pt-4 first:pt-0"
              >
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.title}
                </h3>
              </motion.div>
            );
          }

          if (item.type === "note") {
            return (
              <motion.div
                key={item.id}
                variants={taskItemVariants}
                layout
                className="px-3 py-2"
              >
                <p className="text-sm text-muted-foreground">{item.title}</p>
              </motion.div>
            );
          }

          const children = allItems.filter(
            (c) => c.parent_item_id === item.id
          );

          return (
            <TaskItem
              key={item.id}
              item={item}
              depth={depth}
              childItems={children}
            />
          );
        })}
      </AnimatePresence>
    </motion.div>
  );

  if (depth === 0 && listId) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={taskIds}
          strategy={verticalListSortingStrategy}
        >
          {listContent}
        </SortableContext>
      </DndContext>
    );
  }

  return listContent;
}
