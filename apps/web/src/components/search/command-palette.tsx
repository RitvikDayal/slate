"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, CheckSquare, FolderOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useItemStore } from "@/stores/item-store";
import { useListStore } from "@/stores/list-store";
import { useUIStore } from "@/stores/ui-store";
import { scaleIn } from "@/lib/animations";

interface SearchResult {
  id: string;
  title: string;
  type: "task" | "note" | "list";
  subtitle?: string;
}

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useItemStore((s) => s.items);
  const lists = useListStore((s) => s.lists);

  const allResults: SearchResult[] = query.trim()
    ? [
        ...lists
          .filter((l) =>
            l.title.toLowerCase().includes(query.toLowerCase())
          )
          .map((l) => ({
            id: l.id,
            title: l.title,
            type: "list" as const,
            subtitle: l.icon || undefined,
          })),
        ...items
          .filter((i) =>
            i.title.toLowerCase().includes(query.toLowerCase())
          )
          .map((i) => ({
            id: i.id,
            title: i.title,
            type: i.type === "note" ? ("note" as const) : ("task" as const),
            subtitle: i.is_completed ? "Completed" : undefined,
          })),
      ]
    : [];

  const results = allResults.slice(0, 20);
  const totalCount = allResults.length;

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) close();
        else open();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, open, close]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      close();
    }
  };

  const handleSelect = (result: SearchResult) => {
    if (result.type === "list") {
      router.push(`/list/${result.id}`);
    } else {
      useItemStore.getState().setSelectedItem(result.id);
      useUIStore.getState().setDetailPanelOpen(true);
    }
    close();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "list":
        return FolderOpen;
      case "note":
        return FileText;
      default:
        return CheckSquare;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search tasks, notes, lists..."
                className="flex-1 bg-transparent py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                ESC
              </kbd>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="max-h-72 overflow-y-auto p-1.5">
                {results.map((result, index) => {
                  const Icon = getIcon(result.type);
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        index === selectedIndex
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Result cap message */}
            {totalCount > 20 && (
              <div className="border-t border-border px-4 py-2 text-center text-xs text-muted-foreground">
                Showing 20 of {totalCount} — refine your search
              </div>
            )}

            {/* Empty state */}
            {query.trim() && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results found
              </div>
            )}

            {/* Hint */}
            {!query.trim() && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Type to search across tasks, notes, and lists
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
