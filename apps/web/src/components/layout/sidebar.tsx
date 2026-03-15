"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Inbox,
  CalendarCheck,
  CalendarClock,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Calendar,
  MessageCircle,
  LogOut,
  BarChart3,
  GripVertical,
  AlertTriangle,
  CalendarRange,
  Clock,
  CircleSlash,
  CheckCircle,
  Filter,
} from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useListStore } from "@/stores/list-store";
import { useUIStore } from "@/stores/ui-store";
import { useViewStore } from "@/stores/view-store";
import type { User } from "@supabase/supabase-js";
import type { List } from "@ai-todo/shared";
import { layoutSpring } from "@/lib/animations";
import { SlateLogo, SlateIcon } from "@/components/brand/slate-logo";

const presetViews = [
  { slug: "high-priority", label: "High Priority", icon: AlertTriangle },
  { slug: "due-this-week", label: "Due This Week", icon: CalendarRange },
  { slug: "overdue", label: "Overdue", icon: Clock },
  { slug: "no-date", label: "No Date", icon: CircleSlash },
  { slug: "completed", label: "Completed", icon: CheckCircle },
];

const smartLists = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/upcoming", label: "Upcoming", icon: CalendarClock },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

function SortableListItem({
  list,
  isActive,
  sidebarCollapsed,
}: {
  list: List;
  isActive: boolean;
  sidebarCollapsed: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: { type: "list", listId: list.id, title: list.title },
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `list-drop-${list.id}`,
    data: { type: "list-drop-target", listId: list.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={(node: HTMLDivElement | null) => {
        setSortableRef(node);
        setDropRef(node);
      }}
      style={style}
      className="group/list-item relative"
    >
      <Link
        href={`/list/${list.id}`}
        title={list.title}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          sidebarCollapsed && "justify-center px-0",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted",
          isOver && !isDragging && "ring-2 ring-primary/50 bg-primary/5"
        )}
      >
        {!sidebarCollapsed && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex h-4 w-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover/list-item:opacity-100 [@media(pointer:coarse)]:opacity-40 active:cursor-grabbing"
            onClick={(e) => e.preventDefault()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
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
    </div>
  );
}

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const newListInputRef = useRef<HTMLInputElement>(null);
  const { lists, fetchLists, createList } = useListStore();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { savedViews, fetchSavedViews } = useViewStore();

  useEffect(() => {
    fetchLists();
    fetchSavedViews();
  }, [fetchLists, fetchSavedViews]);

  const pinnedViews = savedViews.filter((v) => v.is_pinned);

  const userLists = lists.filter((l) => !l.is_inbox && !l.is_archived);
  const userListIds = userLists.map((l) => l.id);

  return (
    <div
      className="flex h-full w-full flex-col border-r border-border bg-card"
    >
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        {sidebarCollapsed ? (
          <SlateIcon size={22} />
        ) : (
          <SlateLogo size="md" />
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
              prefetch
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
        <SortableContext
          items={userListIds}
          strategy={verticalListSortingStrategy}
        >
          {userLists.map((list) => {
            const isActive = pathname === `/list/${list.id}`;
            return (
              <SortableListItem
                key={list.id}
                list={list}
                isActive={isActive}
                sidebarCollapsed={sidebarCollapsed}
              />
            );
          })}
        </SortableContext>

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

        {/* Divider */}
        <div className="!my-3 h-px bg-border" />

        {/* Filters / Views */}
        {!sidebarCollapsed && (
          <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Filters
          </p>
        )}
        {presetViews.map((view) => {
          const href = `/views/${view.slug}`;
          const isActive = pathname === href;
          return (
            <Link
              key={view.slug}
              href={href}
              prefetch
              title={view.label}
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
              <view.icon className="relative h-[18px] w-[18px] shrink-0" />
              {!sidebarCollapsed && (
                <span className="relative">{view.label}</span>
              )}
            </Link>
          );
        })}

        {/* Pinned Saved Views */}
        {pinnedViews.length > 0 && (
          <>
            {!sidebarCollapsed && (
              <p className="mb-1 mt-3 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Saved Views
              </p>
            )}
            {pinnedViews.map((view) => {
              const href = `/saved-views/${view.id}`;
              const isActive = pathname === href;
              return (
                <Link
                  key={view.id}
                  href={href}
                  title={view.name}
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
                  {view.icon ? (
                    <span className="relative shrink-0 text-base">
                      {view.icon}
                    </span>
                  ) : (
                    <Filter className="relative h-[18px] w-[18px] shrink-0" />
                  )}
                  {!sidebarCollapsed && (
                    <span className="relative truncate">{view.name}</span>
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        {!sidebarCollapsed && (
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
            <button
              type="button"
              onClick={async () => {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();
                await supabase.auth.signOut();
                router.push("/login");
              }}
              title="Sign out"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
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
