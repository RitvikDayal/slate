"use client";

import { create } from "zustand";
import type { List, CreateListInput, UpdateListInput } from "@ai-todo/shared";

interface ListStore {
  lists: List[];
  isLoading: boolean;
  selectedListId: string | null;
  fetchLists: () => Promise<void>;
  createList: (data: CreateListInput) => Promise<List>;
  updateList: (id: string, data: UpdateListInput) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  reorderLists: (orderedIds: string[]) => Promise<void>;
  setSelectedList: (id: string | null) => void;
  getInbox: () => List | undefined;
}

export const useListStore = create<ListStore>((set, get) => ({
  lists: [],
  isLoading: true,
  selectedListId: null,

  fetchLists: async () => {
    set({ isLoading: true });
    const res = await fetch("/api/lists");
    if (res.ok) {
      const lists: List[] = await res.json();
      set({ lists, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  createList: async (data) => {
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create list");
    const list: List = await res.json();
    set((state) => ({ lists: [...state.lists, list] }));
    return list;
  },

  updateList: async (id, data) => {
    const res = await fetch(`/api/lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update list");
    const updated: List = await res.json();
    set((state) => ({
      lists: state.lists.map((l) => (l.id === id ? updated : l)),
    }));
  },

  deleteList: async (id) => {
    const res = await fetch(`/api/lists/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({
        lists: state.lists.filter((l) => l.id !== id),
        selectedListId: state.selectedListId === id ? null : state.selectedListId,
      }));
    }
  },

  reorderLists: async (orderedIds) => {
    const prevLists = get().lists;

    set((state) => {
      const listMap = new Map(state.lists.map((l) => [l.id, l]));
      const reordered = orderedIds
        .map((id) => listMap.get(id))
        .filter((l): l is List => l !== undefined);
      const remaining = state.lists.filter((l) => !orderedIds.includes(l.id));
      return { lists: [...reordered, ...remaining] };
    });

    try {
      const res = await fetch("/api/lists/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) throw new Error("Reorder failed");
    } catch {
      set({ lists: prevLists });
    }
  },

  setSelectedList: (id) => set({ selectedListId: id }),

  getInbox: () => get().lists.find((l) => l.is_inbox),
}));
