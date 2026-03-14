"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import { Inbox, CalendarCheck, CalendarClock, MessageCircle, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useItemStore } from "@/stores/item-store";
import { useListStore } from "@/stores/list-store";
import { playCreate } from "@/lib/sounds";

const navItems = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/upcoming", label: "Upcoming", icon: CalendarClock },
  { href: "/chat", label: "Chat", icon: MessageCircle },
];

export function BottomNav() {
  const pathname = usePathname();
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { createItem } = useItemStore();
  const { lists, fetchLists } = useListStore();

  // Resolve which list to add to based on current route
  const getTargetListId = useCallback(() => {
    const listMatch = pathname.match(/^\/list\/([^/]+)/);
    if (listMatch) return listMatch[1];
    const inbox = lists.find((l) => l.is_inbox);
    return inbox?.id ?? lists[0]?.id ?? null;
  }, [pathname, lists]);

  const handleSubmit = useCallback(async () => {
    const title = value.trim();
    if (!title) return;

    // Ensure lists are loaded
    if (lists.length === 0) await fetchLists();

    const listId = getTargetListId();
    if (!listId) return;

    try {
      await createItem({ list_id: listId, title, type: "task", priority: "none", source: "manual" });
      playCreate();
      setJustCreated(true);
      setTimeout(() => setJustCreated(false), 700);
      setValue("");
    } catch {
      // silently fail
    }
  }, [value, lists, fetchLists, getTargetListId, createItem]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Quick-add bar */}
      <div className="border-t border-border/40 bg-background/95 px-3 py-2.5 backdrop-blur-xl">
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border px-4 py-0.5 transition-colors",
            isFocused ? "border-primary/40 bg-card" : "border-border/60 bg-card/60"
          )}
        >
          <AnimatePresence mode="wait">
            {justCreated ? (
              <motion.div
                key="check"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Check className="h-4 w-4 shrink-0 text-success" />
              </motion.div>
            ) : (
              <motion.div key="plus" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}>
                <Plus
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isFocused ? "text-primary/70" : "text-muted-foreground/40"
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
              if (e.key === "Escape") { setValue(""); inputRef.current?.blur(); }
            }}
            placeholder="Add a task..."
            className="flex-1 bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
          />

          <AnimatePresence>
            {value.trim() && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 8 }}
                transition={{ duration: 0.15 }}
                type="button"
                onClick={handleSubmit}
                className="shrink-0 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground active:scale-95"
              >
                Add
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex items-stretch border-t border-border/60 bg-background/90 backdrop-blur-xl">
        {navItems.map((item) => {
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
  );
}
