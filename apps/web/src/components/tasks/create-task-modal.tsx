"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Calendar,
  Flag,
  Tag,
  ChevronDown,
  List as ListIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useItemStore } from "@/stores/item-store";
import { useListStore } from "@/stores/list-store";
import { useLabelStore } from "@/stores/label-store";
import { playCreate } from "@/lib/sounds";
import { VoiceCaptureButton } from "./voice-capture-button";
import type { ItemPriority } from "@ai-todo/shared";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  defaultListId?: string;
}

const PRIORITY_CONFIG: Record<ItemPriority, { label: string; color: string; dot: string }> = {
  none: { label: "No priority", color: "text-muted-foreground", dot: "bg-muted-foreground/30" },
  low: { label: "Low", color: "text-blue-400", dot: "bg-blue-400" },
  medium: { label: "Medium", color: "text-amber-400", dot: "bg-amber-400" },
  high: { label: "High", color: "text-red-400", dot: "bg-red-400" },
};

const PRIORITY_OPTIONS: ItemPriority[] = ["none", "low", "medium", "high"];

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export function CreateTaskModal({ open, onClose, defaultListId }: CreateTaskModalProps) {
  const isMobile = !useMediaQuery("(min-width: 768px)");
  const titleRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [selectedListId, setSelectedListId] = useState<string | null>(defaultListId ?? null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [priority, setPriority] = useState<ItemPriority>("none");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown state
  const [showListPicker, setShowListPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  // Stores
  const { createItem } = useItemStore();
  const { lists, fetchLists } = useListStore();
  const { labels, fetchLabels } = useLabelStore();

  // Ensure lists/labels are loaded
  useEffect(() => {
    if (open) {
      if (lists.length === 0) void fetchLists();
      if (labels.length === 0) void fetchLabels();
    }
  }, [open, lists.length, labels.length, fetchLists, fetchLabels]);

  // Set default list when lists load
  useEffect(() => {
    if (open && !selectedListId && lists.length > 0) {
      const inbox = lists.find((l) => l.is_inbox);
      setSelectedListId(inbox?.id ?? lists[0]?.id ?? null);
    }
  }, [open, selectedListId, lists]);

  // Auto-focus title on open
  useEffect(() => {
    if (open) {
      // Small delay to let animation start
      const t = setTimeout(() => titleRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Listen for open-create-modal event (keyboard shortcut)
  useEffect(() => {
    const handler = () => {
      // This will be handled by the parent that renders this modal
    };
    window.addEventListener("open-create-modal", handler);
    return () => window.removeEventListener("open-create-modal", handler);
  }, []);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setTitle("");
      setDueDate(null);
      setPriority("none");
      setSelectedLabelIds([]);
      setIsSubmitting(false);
      setShowListPicker(false);
      setShowPriorityPicker(false);
      setShowDatePicker(false);
      setShowLabelPicker(false);
      if (defaultListId) {
        setSelectedListId(defaultListId);
      } else {
        const inbox = lists.find((l) => l.is_inbox);
        setSelectedListId(inbox?.id ?? lists[0]?.id ?? null);
      }
    }
  }, [open, defaultListId, lists]);

  const closeAllPickers = useCallback(() => {
    setShowListPicker(false);
    setShowPriorityPicker(false);
    setShowDatePicker(false);
    setShowLabelPicker(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || !selectedListId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createItem({
        list_id: selectedListId,
        title: trimmed,
        type: "task",
        priority,
        source: "manual",
        due_date: dueDate ?? undefined,
        label_ids: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
      });
      playCreate();
      onClose();
    } catch {
      // Silently fail
    } finally {
      setIsSubmitting(false);
    }
  }, [title, selectedListId, isSubmitting, createItem, priority, dueDate, selectedLabelIds, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void handleSubmit();
      }
    },
    [onClose, handleSubmit]
  );

  const toggleLabel = useCallback((labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  }, []);

  const selectedList = lists.find((l) => l.id === selectedListId);
  const selectedLabels = labels.filter((l) => selectedLabelIds.includes(l.id));

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const mobileSheetVariants = {
    hidden: { y: "100%" },
    visible: {
      y: 0,
      transition: { type: "spring" as const, damping: 30, stiffness: 300 },
    },
    exit: {
      y: "100%",
      transition: { duration: 0.2, ease: "easeIn" as const },
    },
  };

  const desktopModalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring" as const, damping: 30, stiffness: 400 },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 10,
      transition: { duration: 0.15 },
    },
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => {
              closeAllPickers();
              onClose();
            }}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            className={cn(
              "fixed z-50",
              isMobile
                ? "inset-x-0 bottom-0 top-0"
                : "left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2"
            )}
            variants={isMobile ? mobileSheetVariants : desktopModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            <div
              className={cn(
                "flex h-full flex-col bg-card",
                isMobile
                  ? "rounded-t-2xl"
                  : "rounded-2xl border border-border/60 shadow-2xl shadow-black/40"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
                <span className="text-sm font-medium text-muted-foreground">New task</span>
                <div className="h-10 w-10" /> {/* Spacer for centering */}
              </div>

              {/* Title input + mic */}
              <div className="flex items-center gap-2 px-5 py-3">
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                      e.preventDefault();
                      void handleSubmit();
                    }
                  }}
                  placeholder="What needs to be done?"
                  className="flex-1 bg-transparent text-lg font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                />
                <VoiceCaptureButton
                  onTranscript={(text) => setTitle(text)}
                  className="shrink-0"
                />
              </div>

              {/* Metadata chips row */}
              <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
                {/* List selector chip */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      closeAllPickers();
                      setShowListPicker(!showListPicker);
                    }}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
                      showListPicker
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/50 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    <ListIcon className="h-3.5 w-3.5" />
                    <span className="max-w-[120px] truncate">
                      {selectedList?.title ?? "Select list"}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                  <AnimatePresence>
                    {showListPicker && (
                      <DropdownMenu onClose={() => setShowListPicker(false)}>
                        {lists
                          .filter((l) => !l.is_archived)
                          .map((list) => (
                            <button
                              key={list.id}
                              type="button"
                              onClick={() => {
                                setSelectedListId(list.id);
                                setShowListPicker(false);
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                list.id === selectedListId
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground hover:bg-muted"
                              )}
                            >
                              {list.icon ? (
                                <span className="text-sm">{list.icon}</span>
                              ) : (
                                <ListIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span className="truncate">{list.title}</span>
                              {list.id === selectedListId && (
                                <Check className="ml-auto h-3.5 w-3.5 text-primary" />
                              )}
                            </button>
                          ))}
                      </DropdownMenu>
                    )}
                  </AnimatePresence>
                </div>

                {/* Date chip */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      closeAllPickers();
                      setShowDatePicker(!showDatePicker);
                    }}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
                      dueDate
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : showDatePicker
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-muted/50 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{dueDate ? format(new Date(dueDate + "T00:00:00"), "MMM d") : "Date"}</span>
                    {dueDate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDueDate(null);
                        }}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                        aria-label="Clear date"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </button>
                  <AnimatePresence>
                    {showDatePicker && (
                      <DropdownMenu onClose={() => setShowDatePicker(false)}>
                        <DateQuickPicks
                          onSelect={(date) => {
                            setDueDate(date);
                            setShowDatePicker(false);
                          }}
                        />
                      </DropdownMenu>
                    )}
                  </AnimatePresence>
                </div>

                {/* Priority chip */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      closeAllPickers();
                      setShowPriorityPicker(!showPriorityPicker);
                    }}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
                      priority !== "none"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : showPriorityPicker
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-muted/50 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    {priority !== "none" && (
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          PRIORITY_CONFIG[priority].dot
                        )}
                      />
                    )}
                    <span>{PRIORITY_CONFIG[priority].label}</span>
                  </button>
                  <AnimatePresence>
                    {showPriorityPicker && (
                      <DropdownMenu onClose={() => setShowPriorityPicker(false)}>
                        {PRIORITY_OPTIONS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setPriority(p);
                              setShowPriorityPicker(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                              p === priority
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            <span
                              className={cn(
                                "h-2.5 w-2.5 rounded-full",
                                PRIORITY_CONFIG[p].dot
                              )}
                            />
                            <span>{PRIORITY_CONFIG[p].label}</span>
                            {p === priority && (
                              <Check className="ml-auto h-3.5 w-3.5 text-primary" />
                            )}
                          </button>
                        ))}
                      </DropdownMenu>
                    )}
                  </AnimatePresence>
                </div>

                {/* Label chip */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      closeAllPickers();
                      setShowLabelPicker(!showLabelPicker);
                    }}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
                      selectedLabels.length > 0
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : showLabelPicker
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-muted/50 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span>
                      {selectedLabels.length > 0
                        ? selectedLabels.map((l) => l.name).join(", ")
                        : "Labels"}
                    </span>
                  </button>
                  <AnimatePresence>
                    {showLabelPicker && (
                      <DropdownMenu onClose={() => setShowLabelPicker(false)}>
                        {labels.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">
                            No labels yet
                          </p>
                        ) : (
                          labels.map((label) => (
                            <button
                              key={label.id}
                              type="button"
                              onClick={() => toggleLabel(label.id)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                selectedLabelIds.includes(label.id)
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground hover:bg-muted"
                              )}
                            >
                              <LabelDot color={label.color} />
                              <span className="truncate">{label.name}</span>
                              {selectedLabelIds.includes(label.id) && (
                                <Check className="ml-auto h-3.5 w-3.5 text-primary" />
                              )}
                            </button>
                          ))
                        )}
                      </DropdownMenu>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Selected labels display */}
              {selectedLabels.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3">
                  {selectedLabels.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      <LabelDot color={label.color} size="sm" />
                      {label.name}
                      <button
                        type="button"
                        onClick={() => toggleLabel(label.id)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        aria-label={`Remove ${label.name}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Bottom bar with keyboard hint and submit FAB */}
              <div className="flex items-center justify-between px-5 pb-5">
                <span className="hidden text-xs text-muted-foreground/50 md:block">
                  <kbd className="rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium">
                    {"\u2318"}
                  </kbd>{" "}
                  +{" "}
                  <kbd className="rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium">
                    Enter
                  </kbd>{" "}
                  to save
                </span>
                <motion.button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!title.trim() || isSubmitting}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200",
                    title.trim() && !isSubmitting
                      ? "bg-primary text-primary-foreground shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
                      : "bg-muted text-muted-foreground/30 shadow-none"
                  )}
                  whileTap={title.trim() && !isSubmitting ? { scale: 0.9 } : undefined}
                  aria-label="Create task"
                >
                  <Check className="h-5 w-5" />
                </motion.button>
              </div>

              {/* Safe area padding on mobile */}
              {isMobile && (
                <div style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Helper components                                           */
/* ──────────────────────────────────────────────────────────── */

function DropdownMenu({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      className="absolute left-0 top-full z-10 mt-1 min-w-[180px] max-h-[240px] overflow-y-auto rounded-xl border border-border/60 bg-card p-1 shadow-xl shadow-black/30"
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.12 }}
    >
      {children}
    </motion.div>
  );
}

function LabelDot({ color, size = "md" }: { color: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full",
        size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"
      )}
      style={{ backgroundColor: color }}
    />
  );
}

function DateQuickPicks({ onSelect }: { onSelect: (date: string) => void }) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const toDateStr = (d: Date) => format(d, "yyyy-MM-dd");

  const picks = [
    { label: "Today", date: toDateStr(today), sub: format(today, "EEE") },
    { label: "Tomorrow", date: toDateStr(tomorrow), sub: format(tomorrow, "EEE") },
    { label: "Next week", date: toDateStr(nextWeek), sub: format(nextWeek, "EEE, MMM d") },
  ];

  return (
    <div className="flex flex-col">
      {picks.map((pick) => (
        <button
          key={pick.date}
          type="button"
          onClick={() => onSelect(pick.date)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
        >
          <span>{pick.label}</span>
          <span className="text-xs text-muted-foreground">{pick.sub}</span>
        </button>
      ))}
    </div>
  );
}
