"use client";

import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import type { CreateTaskInput } from "@ai-todo/shared";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface QuickAddFabProps {
  onAdd: (input: CreateTaskInput) => Promise<unknown>;
}

export function QuickAddFab({ onAdd }: QuickAddFabProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        title: title.trim(),
        priority: "medium",
        is_movable: true,
        scheduled_date: format(new Date(), "yyyy-MM-dd"),
      });
      setTitle("");
      inputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasText = title.trim().length > 0;

  return (
    <div className="fixed bottom-[60px] left-0 right-0 z-40 border-t border-border/40 bg-background/95 px-4 py-3 backdrop-blur-xl md:bottom-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex items-center gap-2 rounded-2xl border bg-card px-4 py-0.5 transition-all duration-150",
          isFocused
            ? "border-primary/40 shadow-[0_0_0_3px_oklch(0.82_0.17_82_/_0.08)]"
            : "border-border"
        )}
      >
        <Plus
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isFocused ? "text-primary/70" : "text-muted-foreground/40"
          )}
        />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Add a task…"
          className="flex-1 bg-transparent py-3.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          disabled={isSubmitting}
          autoComplete="off"
          autoCorrect="off"
        />
        {hasText && (
          <button
            type="submit"
            disabled={isSubmitting}
            className="shrink-0 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-all active:scale-95 disabled:opacity-50"
          >
            Add
          </button>
        )}
      </form>
    </div>
  );
}
