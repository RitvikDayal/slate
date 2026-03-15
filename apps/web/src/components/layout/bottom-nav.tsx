"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Inbox, CalendarCheck, CalendarClock, MessageCircle, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";

const navItems = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/upcoming", label: "Upcoming", icon: CalendarClock },
  { href: "/chat", label: "Chat", icon: MessageCircle },
];

export function BottomNav() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);

  // Derive default list from current route
  const getDefaultListId = useCallback((): string | undefined => {
    const listMatch = pathname.match(/^\/list\/([^/]+)/);
    return listMatch?.[1];
  }, [pathname]);

  // Listen for open-create-modal event from keyboard shortcut
  useEffect(() => {
    const handler = () => setModalOpen(true);
    window.addEventListener("open-create-modal", handler);
    return () => window.removeEventListener("open-create-modal", handler);
  }, []);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch border-t border-border/60 bg-background/90 backdrop-blur-xl">
          {/* First two nav items */}
          {navItems.slice(0, 2).map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1.5 py-3 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon
                  className={cn("h-[22px] w-[22px] transition-transform", isActive && "scale-110")}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Center FAB */}
          <div className="flex flex-1 items-center justify-center">
            <motion.button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
              whileTap={{ scale: 0.9 }}
              aria-label="Create new task"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* Last two nav items */}
          {navItems.slice(2).map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1.5 py-3 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon
                  className={cn("h-[22px] w-[22px] transition-transform", isActive && "scale-110")}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <CreateTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultListId={getDefaultListId()}
      />
    </>
  );
}
