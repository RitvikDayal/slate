"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Filter } from "lucide-react";
import Link from "next/link";
import type { Item } from "@ai-todo/shared";

const VIEW_TITLES: Record<string, string> = {
  "high-priority": "High Priority",
  "due-this-week": "Due This Week",
  overdue: "Overdue",
  "no-date": "No Date",
  completed: "Completed",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/15 text-red-400",
  medium: "bg-amber-500/15 text-amber-400",
  low: "bg-blue-500/15 text-blue-400",
};

export default function PresetViewPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/views/${slug}`)
      .then((r) => r.json())
      .then((data: Item[]) => {
        setItems(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [slug]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const title = VIEW_TITLES[slug] ?? slug;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/inbox"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Filter className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <span className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No items match this view
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
            >
              <span
                className={`h-4 w-4 shrink-0 rounded border ${
                  item.is_completed
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-border"
                }`}
              />
              <span
                className={`flex-1 text-sm ${
                  item.is_completed
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}
              >
                {item.title}
              </span>
              {item.priority !== "none" && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    PRIORITY_COLORS[item.priority] ?? ""
                  }`}
                >
                  {item.priority}
                </span>
              )}
              {item.due_date && (
                <span className="text-xs text-muted-foreground">
                  {item.due_date}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
