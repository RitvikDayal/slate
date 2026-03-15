"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Filter, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Item, SavedView, FilterRule } from "@ai-todo/shared";
import { useViewStore } from "@/stores/view-store";
import { FilterBuilder } from "./filter-builder";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/15 text-red-400",
  medium: "bg-amber-500/15 text-amber-400",
  low: "bg-blue-500/15 text-blue-400",
};

interface SavedViewPageProps {
  viewId: string;
}

export function SavedViewPage({ viewId }: SavedViewPageProps) {
  const router = useRouter();
  const { savedViews, updateSavedView, deleteSavedView } = useViewStore();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const view = savedViews.find((v) => v.id === viewId);

  const fetchItems = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/saved-views/${viewId}/items`)
      .then((r) => r.json())
      .then((data: Item[]) => {
        setItems(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [viewId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleSaveFilters(filters: FilterRule[]) {
    await updateSavedView(viewId, { filters });
    setIsEditing(false);
    fetchItems();
  }

  async function handleDelete() {
    await deleteSavedView(viewId);
    router.push("/inbox");
  }

  const title = view?.name ?? "Saved View";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/inbox"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {view?.icon ? (
          <span className="text-lg">{view.icon}</span>
        ) : (
          <Filter className="h-5 w-5 text-primary" />
        )}
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <span className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Edit filters"
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-400"
          aria-label="Delete view"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {isEditing && view && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <p className="mb-3 text-sm font-medium text-foreground">
            Edit Filters
          </p>
          <FilterBuilder
            initialFilters={view.filters as FilterRule[]}
            onSave={handleSaveFilters}
            onCancel={() => setIsEditing(false)}
            saveLabel="Save Filters"
          />
        </div>
      )}

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
