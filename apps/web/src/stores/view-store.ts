"use client";

import { create } from "zustand";
import type {
  SavedView,
  CreateSavedViewInput,
  UpdateSavedViewInput,
} from "@ai-todo/shared";
import {
  mutateLocal,
  generateId,
  savedViewToApiPayload,
} from "@/lib/offline-mutation";
import { db, toLocalSavedView, fromLocalSavedView } from "@/lib/db";

interface ViewStore {
  savedViews: SavedView[];
  isLoading: boolean;
  fetchSavedViews: () => Promise<void>;
  createSavedView: (data: CreateSavedViewInput) => Promise<SavedView>;
  updateSavedView: (id: string, data: UpdateSavedViewInput) => Promise<void>;
  deleteSavedView: (id: string) => Promise<void>;
}

export const useViewStore = create<ViewStore>((set, get) => ({
  savedViews: [],
  isLoading: false,

  fetchSavedViews: async () => {
    // 1. Serve cached views immediately
    if (get().savedViews.length === 0) {
      try {
        const cached = await db.savedViews.toArray();
        if (cached.length > 0) {
          set({ savedViews: cached.map(fromLocalSavedView), isLoading: false });
        }
      } catch {
        // Dexie read is non-critical
      }
    }

    set({ isLoading: true });

    // 2. Revalidate from network
    try {
      const res = await fetch("/api/saved-views");
      if (res.ok) {
        const views: SavedView[] = await res.json();
        set({ savedViews: views, isLoading: false });
        try {
          await db.savedViews.bulkPut(views.map(toLocalSavedView));
        } catch {
          // Dexie cache write is non-critical
        }
        return;
      }
    } catch {
      // Network error — cached data (if any) is already showing
    }
    set({ isLoading: false });
  },

  createSavedView: async (data) => {
    const id = generateId();
    const now = new Date().toISOString();
    const view: SavedView = {
      id,
      user_id: "",
      name: data.name,
      icon: data.icon ?? null,
      color: data.color ?? null,
      filters: data.filters ?? [],
      sort_by: data.sort_by ?? "due_date:asc",
      is_pinned: data.is_pinned ?? false,
      position: data.position ?? get().savedViews.length,
      created_at: now,
      updated_at: now,
    };
    set((state) => ({ savedViews: [...state.savedViews, view] }));
    await mutateLocal({
      entity: "savedView",
      operation: "create",
      entityId: id,
      data: savedViewToApiPayload(
        view as unknown as Record<string, unknown>
      ),
      dexieWrite: () => db.savedViews.put(toLocalSavedView(view)),
    });
    return view;
  },

  updateSavedView: async (id, data) => {
    const prev = get().savedViews.find((v) => v.id === id);
    if (!prev) return;
    const now = new Date().toISOString();
    const updated: SavedView = { ...prev, ...data, updated_at: now };
    set((state) => ({
      savedViews: state.savedViews.map((v) => (v.id === id ? updated : v)),
    }));
    await mutateLocal({
      entity: "savedView",
      operation: "update",
      entityId: id,
      data: savedViewToApiPayload(
        updated as unknown as Record<string, unknown>
      ),
      dexieWrite: () => db.savedViews.put(toLocalSavedView(updated)),
    });
  },

  deleteSavedView: async (id) => {
    set((state) => ({
      savedViews: state.savedViews.filter((v) => v.id !== id),
    }));
    await mutateLocal({
      entity: "savedView",
      operation: "delete",
      entityId: id,
      data: {},
      dexieWrite: () => db.savedViews.delete(id),
    });
  },
}));
