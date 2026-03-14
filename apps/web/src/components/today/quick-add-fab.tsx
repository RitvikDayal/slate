"use client";

import { useState, useRef } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CreateTaskInput } from "@ai-todo/shared";
import { format } from "date-fns";

interface QuickAddFabProps {
  onAdd: (input: CreateTaskInput) => Promise<unknown>;
}

export function QuickAddFab({ onAdd }: QuickAddFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        title: title.trim(),
        scheduled_date: format(new Date(), "yyyy-MM-dd"),
      });
      setTitle("");
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full bg-indigo-600 shadow-lg hover:bg-indigo-500 md:bottom-8"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 md:bottom-8 md:left-auto md:right-4 md:w-96">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-xl"
      >
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you need to do?"
          className="border-0 bg-transparent text-sm focus-visible:ring-0"
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          size="sm"
          disabled={!title.trim() || isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-500"
        >
          Add
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setIsOpen(false)}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
