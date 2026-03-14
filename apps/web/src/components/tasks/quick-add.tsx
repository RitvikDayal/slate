"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CalendarDays, Flag, FolderOpen, Check } from "lucide-react";
import * as chrono from "chrono-node";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { playCreate } from "@/lib/sounds";
import { useItemStore } from "@/stores/item-store";
import { DatePicker } from "@/components/date/date-picker";
import type { ItemPriority } from "@ai-todo/shared";

interface QuickAddProps {
  listId: string;
  defaultDueDate?: string;
}

const priorities: { value: ItemPriority; label: string; className: string }[] = [
  { value: "none", label: "None", className: "text-muted-foreground" },
  { value: "low", label: "Low", className: "text-priority-low" },
  { value: "medium", label: "Medium", className: "text-priority-medium" },
  { value: "high", label: "High", className: "text-priority-high" },
];

export function QuickAdd({ listId, defaultDueDate }: QuickAddProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [priority, setPriority] = useState<ItemPriority>("none");
  const [parsedDate, setParsedDate] = useState<string | null>(null);
  const [showPriority, setShowPriority] = useState(false);
  const [manualDate, setManualDate] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { createItem } = useItemStore();

  const parseInput = useCallback((text: string) => {
    setValue(text);
    // Parse natural language dates
    const results = chrono.parse(text);
    if (results.length > 0 && results[0].start) {
      const date = results[0].start.date();
      setParsedDate(format(date, "yyyy-MM-dd"));
    } else {
      setParsedDate(null);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const title = value.trim();
    if (!title) return;

    try {
      await createItem({
        list_id: listId,
        title,
        type: "task",
        priority,
        source: "manual",
        due_date: manualDate ?? parsedDate ?? defaultDueDate ?? undefined,
      });
      playCreate();
      setJustCreated(true);
      setTimeout(() => setJustCreated(false), 600);
      setValue("");
      setPriority("none");
      setParsedDate(null);
      setManualDate(null);
      setShowPriority(false);
    } catch {
      // Silently fail — store handles errors
    }
  }, [value, listId, priority, parsedDate, manualDate, createItem]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === "Escape") {
        setValue("");
        setIsFocused(false);
        inputRef.current?.blur();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="px-1 py-2">
      <div
        className={cn(
          "rounded-xl border transition-colors",
          isFocused
            ? "border-primary/30 bg-card"
            : "border-transparent bg-transparent"
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <AnimatePresence mode="wait">
            {justCreated ? (
              <motion.div
                key="check"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              >
                <Check className="h-[18px] w-[18px] shrink-0 text-success" />
              </motion.div>
            ) : (
              <motion.div
                key="plus"
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -90 }}
                transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              >
                <Plus className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => parseInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Delay to allow button clicks
              setTimeout(() => setIsFocused(false), 200);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Add a task..."
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
        </div>

        {/* Expanded actions */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 border-t border-border/50 px-3 py-2">
                {/* Parsed date badge */}
                {!manualDate && parsedDate && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {format(new Date(parsedDate + "T00:00:00"), "MMM d")}
                  </span>
                )}

                {/* Manual date badge */}
                {manualDate && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {format(new Date(manualDate + "T00:00:00"), "MMM d")}
                    <button
                      type="button"
                      onClick={() => setManualDate(null)}
                      className="ml-0.5 text-primary/60 hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                )}

                {/* Due date button */}
                <DatePicker
                  value={manualDate ?? parsedDate}
                  onChange={(date) => {
                    setManualDate(date);
                    if (date) setParsedDate(null); // Manual date overrides chrono
                  }}
                  trigger={
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                  }
                />

                {/* Priority button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPriority(!showPriority)}
                    className={cn(
                      "rounded-md p-1.5 transition-colors hover:bg-muted",
                      priority !== "none"
                        ? priorities.find((p) => p.value === priority)
                            ?.className
                        : "text-muted-foreground"
                    )}
                    title="Set priority"
                  >
                    <Flag className="h-4 w-4" />
                  </button>

                  {/* Priority dropdown */}
                  <AnimatePresence>
                    {showPriority && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute bottom-full left-0 mb-1 rounded-lg border border-border bg-card p-1 shadow-lg"
                      >
                        {priorities.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => {
                              setPriority(p.value);
                              setShowPriority(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                              p.className,
                              priority === p.value && "bg-muted"
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* List selector placeholder */}
                <button
                  type="button"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                  title="Move to list"
                >
                  <FolderOpen className="h-4 w-4" />
                </button>

                <div className="flex-1" />

                {/* Submit */}
                <motion.button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!value.trim()}
                  whileTap={value.trim() ? { scale: 0.93 } : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1 text-sm font-medium transition-colors",
                    value.trim()
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  Add
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
