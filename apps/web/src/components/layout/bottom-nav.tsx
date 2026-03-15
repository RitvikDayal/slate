"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Inbox,
  CalendarCheck,
  CalendarClock,
  Plus,
  MoreHorizontal,
  Calendar,
  MessageCircle,
  BarChart3,
  Settings,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { useListStore } from "@/stores/list-store";
import { SyncStatus } from "@/components/sync/sync-status";

const primaryNav = [
  { href: "/inbox", label: "Inbox", icon: Inbox, iconColor: "text-blue-400" },
  { href: "/today", label: "Today", icon: CalendarCheck, iconColor: "text-emerald-400" },
  { href: "/upcoming", label: "Upcoming", icon: CalendarClock, iconColor: "text-amber-400" },
];

const moreItems = [
  { href: "/calendar", label: "Calendar", icon: Calendar, iconColor: "text-purple-400" },
  { href: "/chat", label: "Chat", icon: MessageCircle, iconColor: "text-pink-400" },
  { href: "/reports", label: "Reports", icon: BarChart3, iconColor: "text-teal-400" },
  { href: "/settings", label: "Settings", icon: Settings, iconColor: "text-zinc-400" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const newListInputRef = useRef<HTMLInputElement>(null);
  const { lists, createList } = useListStore();

  const userLists = lists.filter((l) => !l.is_inbox && !l.is_archived);

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

  // Close "more" menu on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Check if a "more" item is currently active
  const moreIsActive =
    moreItems.some((item) => pathname.startsWith(item.href)) ||
    pathname.startsWith("/list/");

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />

            {/* Menu */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-border bg-card pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-3"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            >
              {/* Handle */}
              <div className="mb-2 flex justify-center">
                <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Navigation items */}
              <div className="px-4 pb-2">
                <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Navigation
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {moreItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-[11px] font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground active:bg-muted"
                        )}
                      >
                        <item.icon className={cn("h-5 w-5", !isActive && item.iconColor)} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* User lists */}
              <div className="px-4 pb-2 pt-1">
                <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Lists
                </p>
                {userLists.length > 0 && (
                  <div className="grid grid-cols-2 gap-1">
                    {userLists.slice(0, 6).map((list) => {
                      const isActive = pathname === `/list/${list.id}`;
                      return (
                        <Link
                          key={list.id}
                          href={`/list/${list.id}`}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground active:bg-muted"
                          )}
                        >
                          {list.icon ? (
                            <span className="shrink-0 text-base">
                              {list.icon}
                            </span>
                          ) : (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  list.color || "var(--color-muted-foreground)",
                              }}
                            />
                          )}
                          <span className="truncate">{list.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* New list creation */}
                {isCreatingList ? (
                  <div className="mt-2 px-1">
                    <input
                      ref={newListInputRef}
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && newListName.trim()) {
                          const list = await createList({ title: newListName.trim() });
                          setNewListName("");
                          setIsCreatingList(false);
                          setMoreOpen(false);
                          router.push(`/list/${list.id}`);
                        }
                        if (e.key === "Escape") {
                          setNewListName("");
                          setIsCreatingList(false);
                        }
                      }}
                      onBlur={() => {
                        if (!newListName.trim()) {
                          setNewListName("");
                          setIsCreatingList(false);
                        }
                      }}
                      placeholder="List name..."
                      className="w-full rounded-lg border border-primary/30 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingList(true);
                      setTimeout(() => newListInputRef.current?.focus(), 50);
                    }}
                    className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors active:bg-muted"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New List</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="relative flex items-stretch border-t border-border/60 bg-background/90 backdrop-blur-xl">
          <div className="absolute right-2 top-0.5 z-10">
            <SyncStatus compact />
          </div>
          {/* Left nav items: Inbox, Today */}
          {primaryNav.slice(0, 2).map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[22px] w-[22px] transition-transform",
                    isActive ? "scale-110" : item.iconColor
                  )}
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
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
              whileTap={{ scale: 0.9 }}
              aria-label="Create new task"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* Right nav items: Upcoming */}
          {primaryNav.slice(2).map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[22px] w-[22px] transition-transform",
                    isActive ? "scale-110" : item.iconColor
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              moreIsActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal
              className={cn(
                "h-[22px] w-[22px] transition-transform",
                moreIsActive && "scale-110"
              )}
              strokeWidth={moreIsActive ? 2.5 : 1.8}
            />
            <span>More</span>
          </button>
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
