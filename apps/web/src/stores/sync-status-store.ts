"use client";

import { create } from "zustand";
import { db } from "@/lib/db";

interface SyncStatusStore {
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  setPending: (count: number) => void;
  setFailed: (count: number) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSynced: (date: Date) => void;
  refreshCounts: () => Promise<void>;
}

export const useSyncStatusStore = create<SyncStatusStore>((set) => ({
  pendingCount: 0,
  failedCount: 0,
  isSyncing: false,
  lastSyncedAt: null,
  setPending: (count) => set({ pendingCount: count }),
  setFailed: (count) => set({ failedCount: count }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSynced: (date) => set({ lastSyncedAt: date }),
  refreshCounts: async () => {
    try {
      const pending = await db.syncQueue.where("status").equals("pending").count();
      const failed = await db.syncQueue
        .where("status")
        .equals("failed")
        .filter((e) => e.retryCount >= 5)
        .count();
      set({ pendingCount: pending, failedCount: failed });
    } catch {
      // non-critical
    }
  },
}));
