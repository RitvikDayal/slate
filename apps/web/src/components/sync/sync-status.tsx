"use client";

import { useEffect, useRef, useState } from "react";
import { Cloud, CloudOff, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSyncStatusStore } from "@/stores/sync-status-store";
import { db } from "@/lib/db";

interface SyncStatusProps {
  compact?: boolean;
}

export function SyncStatus({ compact = false }: SyncStatusProps) {
  const { pendingCount, failedCount, isSyncing } = useSyncStatusStore();
  const [showPopover, setShowPopover] = useState(false);
  const [failedEntries, setFailedEntries] = useState<
    Array<{ id: number; entity: string; operation: string; error: string | null }>
  >([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Track prolonged failure for toast
  const [prolongedFailure, setProlongedFailure] = useState(false);
  const failureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pendingCount > 0 && !isSyncing) {
      if (!failureTimerRef.current) {
        failureTimerRef.current = setTimeout(() => {
          setProlongedFailure(true);
        }, 120000); // 2 minutes
      }
    } else {
      if (failureTimerRef.current) {
        clearTimeout(failureTimerRef.current);
        failureTimerRef.current = null;
      }
      setProlongedFailure(false);
    }
    return () => {
      if (failureTimerRef.current) clearTimeout(failureTimerRef.current);
    };
  }, [pendingCount, isSyncing]);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    }
    if (showPopover) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPopover]);

  async function loadFailedEntries() {
    const entries = await db.syncQueue
      .where("status")
      .equals("failed")
      .filter((e) => e.retryCount >= 5)
      .toArray();
    setFailedEntries(
      entries.map((e) => ({
        id: e.id!,
        entity: e.entity,
        operation: e.operation,
        error: e.error,
      }))
    );
  }

  async function retryEntry(entryId: number) {
    await db.syncQueue.update(entryId, { status: "pending", retryCount: 0, nextRetryAt: null });
    useSyncStatusStore.getState().refreshCounts();
    setFailedEntries((prev) => prev.filter((e) => e.id !== entryId));
  }

  async function discardEntry(entryId: number) {
    await db.syncQueue.delete(entryId);
    useSyncStatusStore.getState().refreshCounts();
    setFailedEntries((prev) => prev.filter((e) => e.id !== entryId));
  }

  // Determine state
  const hasError = failedCount > 0;
  const hasPending = pendingCount > 0;
  const isSynced = !isSyncing && !hasPending && !hasError;

  if (compact) {
    return (
      <div className="relative flex items-center">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            isSyncing && "animate-pulse bg-primary",
            hasError && "bg-red-500",
            hasPending && !isSyncing && "bg-amber-500",
            isSynced && "bg-emerald-500"
          )}
        />
      </div>
    );
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => {
          if (hasError) {
            loadFailedEntries();
            setShowPopover(!showPopover);
          }
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
          hasError
            ? "text-red-400 hover:bg-red-500/10 cursor-pointer"
            : "text-muted-foreground cursor-default"
        )}
      >
        {isSyncing ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Syncing...</span>
          </>
        ) : hasError ? (
          <>
            <CloudOff className="h-3 w-3" />
            <span>Sync issue</span>
          </>
        ) : hasPending ? (
          <>
            <Cloud className="h-3 w-3 text-amber-400" />
            <span className="text-amber-400">{pendingCount} pending</span>
          </>
        ) : (
          <>
            <Cloud className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-400">Synced</span>
          </>
        )}
      </button>

      {/* Prolonged failure toast */}
      {prolongedFailure && (
        <div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground shadow-lg">
          Changes saved locally. Will sync when connection is restored.
        </div>
      )}

      {/* Error popover */}
      {showPopover && hasError && (
        <div className="absolute bottom-full left-0 mb-2 w-72 rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-foreground">
            Failed sync operations
          </p>
          <div className="max-h-40 space-y-1.5 overflow-y-auto">
            {failedEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5"
              >
                <span className="truncate text-[11px] text-muted-foreground">
                  {entry.operation} {entry.entity}
                </span>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => retryEntry(entry.id)}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Retry"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => discardEntry(entry.id)}
                    className="rounded p-0.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                    title="Discard"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            {failedEntries.length === 0 && (
              <p className="text-[11px] text-muted-foreground">No failed entries</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
