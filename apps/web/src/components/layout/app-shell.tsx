"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { DetailPanel } from "./detail-panel";
import { CommandPalette } from "@/components/search/command-palette";
import { registerShortcut, initShortcuts } from "@/lib/shortcuts";
import { useItemStore } from "@/stores/item-store";
import { useUIStore } from "@/stores/ui-store";

export function AppShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const { sidebarCollapsed, detailPanelOpen } = useUIStore();
  const router = useRouter();

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

  return (
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
          {children}
        </main>
      </div>
      <AnimatePresence>
        {detailPanelOpen && <DetailPanel />}
      </AnimatePresence>
      <BottomNav />
      <CommandPalette />
    </div>
  );
}
