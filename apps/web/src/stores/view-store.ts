"use client";

import { create } from "zustand";
import type { SavedView, CreateSavedViewInput, UpdateSavedViewInput } from "@ai-todo/shared";

interface ViewStore {
  savedViews: SavedView[];
  isLoading: boolean;
  fetchSavedViews: () => Promise<void>;
  createSavedView: (data: CreateSavedViewInput) => Promise<SavedView>;
  updateSavedView: (id: string, data: UpdateSavedViewInput) => Promise<void>;
  deleteSavedView: (id: string) => Promise<void>;
}

export const useViewStore = create<ViewStore>((set) => ({
  savedViews: [],
  isLoading: false,

  fetchSavedViews: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/saved-views");
      if (res.ok) {
        const views: SavedView[] = await res.json();
        set({ savedViews: views, isLoading: false });
        return;
      }
    } catch {
      // Network error
    }
    set({ isLoading: false });
  },

  createSavedView: async (data) => {
    const res = await fetch("/api/saved-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create saved view");
    const view: SavedView = await res.json();
    set((state) => ({ savedViews: [...state.savedViews, view] }));
    return view;
  },

  updateSavedView: async (id, data) => {
    const res = await fetch(`/api/saved-views/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update saved view");
    const updated: SavedView = await res.json();
    set((state) => ({
      savedViews: state.savedViews.map((v) => (v.id === id ? updated : v)),
    }));
  },

  deleteSavedView: async (id) => {
    const res = await fetch(`/api/saved-views/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({
        savedViews: state.savedViews.filter((v) => v.id !== id),
      }));
    }
  },
}));
