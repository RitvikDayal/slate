"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { panelEnter } from "@/lib/animations";
import { useUIStore } from "@/stores/ui-store";
import { useItemStore } from "@/stores/item-store";
import { TaskDetail } from "@/components/tasks/task-detail";
import { cn } from "@/lib/utils";

export function DetailPanel() {
  const { setDetailPanelOpen } = useUIStore();
  const { selectedItemId, items } = useItemStore();

  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null;

  const pathname = usePathname();

  const handleClose = useCallback(() => {
    setDetailPanelOpen(false);
  }, [setDetailPanelOpen]);

  // Close panel on route navigation (skip initial mount)
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      handleClose();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  return (
    <>
      {/* Mobile backdrop */}
      <motion.div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      />

      {/* Panel */}
      <motion.div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full flex-col border-l border-border bg-card",
          "w-full md:w-[480px]"
        )}
        variants={panelEnter}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Task Details
          </h2>
          <motion.button
            type="button"
            onClick={handleClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedItem ? (
            <TaskDetail item={selectedItem} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No item selected
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
