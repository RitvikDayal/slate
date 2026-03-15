"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { GripVertical } from "lucide-react";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { DetailPanel } from "./detail-panel";
import { PageTransition } from "./page-transition";
import { CommandPalette } from "@/components/search/command-palette";
import { registerShortcut, initShortcuts } from "@/lib/shortcuts";
import { useItemStore } from "@/stores/item-store";
import { useListStore } from "@/stores/list-store";
import { useUIStore } from "@/stores/ui-store";

interface DragItem {
  type: "list" | "task" | "subtask";
  id: string;
  title: string;
}

export function AppShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const { sidebarCollapsed, detailPanelOpen } = useUIStore();
  const router = useRouter();
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  useEffect(() => {
    const cleanup = initShortcuts();

    const unregN = registerShortcut({
      key: "n",
      handler: () => {
        window.dispatchEvent(new CustomEvent("open-create-modal"));
      },
      description: "New task",
    });

    const unregE = registerShortcut({
      key: "e",
      handler: () => {
        const { selectedItemId } = useItemStore.getState();
        if (selectedItemId) {
          useUIStore.getState().setDetailPanelOpen(true);
        }
      },
      description: "Edit selected item",
    });

    const unregComma = registerShortcut({
      key: ",",
      meta: true,
      handler: () => {
        router.push("/settings");
      },
      description: "Open settings",
    });

    return () => {
      cleanup();
      unregN();
      unregE();
      unregComma();
    };
  }, [router]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data) {
      setActiveItem({
        type: data.type as DragItem["type"],
        id: event.active.id as string,
        title: (data.title as string) || "",
      });
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) return;

    // List reorder: dragging a list over another list
    if (activeData.type === "list" && overData.type === "list") {
      const { lists, reorderLists } = useListStore.getState();
      const userLists = lists.filter((l) => !l.is_inbox && !l.is_archived);
      const userListIds = userLists.map((l) => l.id);
      const oldIndex = userListIds.indexOf(active.id as string);
      const newIndex = userListIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newIds = [...userListIds];
      newIds.splice(oldIndex, 1);
      newIds.splice(newIndex, 0, active.id as string);
      reorderLists(newIds);
      return;
    }

    // Cross-list move: dragging a task over a sidebar list drop target
    if (
      activeData.type === "task" &&
      overData.type === "list-drop-target" &&
      overData.listId
    ) {
      const taskId = active.id as string;
      const targetListId = overData.listId as string;
      useItemStore.getState().moveItem(taskId, {
        target_list_id: targetListId,
      });
      return;
    }

    // Task reorder within a list
    if (activeData.type === "task" && overData.type === "task") {
      const listId = activeData.listId as string | undefined;
      if (listId) {
        const { items, reorderItems } = useItemStore.getState();
        const listItems = items
          .filter((i) => i.list_id === listId && !i.parent_item_id)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const ids = listItems.map((i) => i.id);
        const oldIndex = ids.indexOf(active.id as string);
        const newIndex = ids.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) return;
        const newIds = [...ids];
        newIds.splice(oldIndex, 1);
        newIds.splice(newIndex, 0, active.id as string);
        reorderItems(listId, newIds);
      }
      return;
    }

    // Subtask reorder
    if (activeData.type === "subtask" && overData.type === "subtask") {
      const parentId = activeData.parentId as string | undefined;
      if (parentId) {
        const { items, reorderItems } = useItemStore.getState();
        const parentItem = items.find((i) => i.id === parentId);
        if (!parentItem) return;
        const subtasks = items
          .filter((i) => i.parent_item_id === parentId)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const ids = subtasks.map((i) => i.id);
        const oldIndex = ids.indexOf(active.id as string);
        const newIndex = ids.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) return;
        const newIds = [...ids];
        newIds.splice(oldIndex, 1);
        newIds.splice(newIndex, 0, active.id as string);
        reorderItems(parentItem.list_id, newIds);
      }
      return;
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-screen bg-background text-foreground">
        <motion.aside
          className="hidden md:flex"
          animate={{ width: sidebarCollapsed ? 60 : 256 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <Sidebar user={user} />
        </motion.aside>
        <div className="flex min-h-0 flex-1 flex-col">
          <main className="flex-1 overflow-y-auto pb-[calc(128px+env(safe-area-inset-bottom,0px))] md:pb-0">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <AnimatePresence>
          {detailPanelOpen && <DetailPanel />}
        </AnimatePresence>
        <BottomNav />
        <CommandPalette />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {activeItem.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
