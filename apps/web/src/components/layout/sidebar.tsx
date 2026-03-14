"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Inbox,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Calendar,
  MessageCircle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useListStore } from "@/stores/list-store";
import { useUIStore } from "@/stores/ui-store";
import type { User } from "@supabase/supabase-js";
import { layoutSpring } from "@/lib/animations";

const smartLists = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/upcoming", label: "Upcoming", icon: CalendarClock },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const newListInputRef = useRef<HTMLInputElement>(null);
  const { lists, fetchLists, createList } = useListStore();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const userLists = lists.filter((l) => !l.is_inbox && !l.is_archived);

  return (
    <div
      className="flex h-full w-full flex-col border-r border-border bg-card"
    >
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        {!sidebarCollapsed && (
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            AI Todo
          </h1>
        )}
      </div>

      {/* Smart Lists */}
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        <p
          className={cn(
            "mb-1 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground",
            sidebarCollapsed && "sr-only"
          )}
        >
          Views
        </p>
        {smartLists.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                sidebarCollapsed && "justify-center px-0",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={layoutSpring}
                />
              )}
              <item.icon className="relative h-[18px] w-[18px] shrink-0" />
              {!sidebarCollapsed && <span className="relative">{item.label}</span>}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="!my-3 h-px bg-border" />

        {/* User Lists */}
        {!sidebarCollapsed && (
          <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Lists
          </p>
        )}
        {userLists.map((list) => {
          const isActive = pathname === `/list/${list.id}`;
          return (
            <Link
              key={list.id}
              href={`/list/${list.id}`}
              title={list.title}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                sidebarCollapsed && "justify-center px-0",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {list.icon ? (
                <span className="shrink-0 text-base">{list.icon}</span>
              ) : (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: list.color || "var(--color-muted-foreground)",
                  }}
                />
              )}
              {!sidebarCollapsed && (
                <span className="truncate">{list.title}</span>
              )}
            </Link>
          );
        })}

        {/* New List button */}
        {!sidebarCollapsed && (
          <>
            <button
              type="button"
              onClick={() => {
                setIsCreating(true);
                setTimeout(() => newListInputRef.current?.focus(), 50);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              <Plus className="h-[18px] w-[18px]" />
              <span>New List</span>
            </button>
            {isCreating && (
              <div className="px-3 py-1">
                <input
                  ref={newListInputRef}
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && newListName.trim()) {
                      const list = await createList({ title: newListName.trim() });
                      setNewListName("");
                      setIsCreating(false);
                      router.push(`/list/${list.id}`);
                    }
                    if (e.key === "Escape") {
                      setNewListName("");
                      setIsCreating(false);
                    }
                  }}
                  onBlur={() => {
                    if (!newListName.trim()) {
                      setNewListName("");
                      setIsCreating(false);
                    }
                  }}
                  placeholder="List name..."
                  className="w-full rounded-md border border-primary/30 bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            )}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        {!sidebarCollapsed && (
          <p className="mb-2 truncate px-1 text-xs text-muted-foreground">
            {user.email}
          </p>
        )}
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted",
            sidebarCollapsed && "w-full justify-center"
          )}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-[18px] w-[18px]" />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
    </div>
  );
}
