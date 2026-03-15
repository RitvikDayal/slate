"use client";

import { create } from "zustand";
import type {
  Item,
  CreateItemInput,
  UpdateItemInput,
  MoveItemInput,
} from "@ai-todo/shared";
import { db, toLocalItem, fromLocalItem } from "@/lib/db";

interface ItemStore {
  items: Item[];
  isLoading: boolean;
  selectedItemId: string | null;
  fetchItemsByList: (listId: string) => Promise<void>;
  fetchTodayItems: () => Promise<void>;
  fetchUpcomingItems: () => Promise<void>;
  createItem: (data: CreateItemInput) => Promise<Item>;
  updateItem: (id: string, data: UpdateItemInput) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  reorderItems: (listId: string, orderedIds: string[]) => Promise<void>;
  moveItem: (id: string, data: MoveItemInput) => Promise<void>;
  setSelectedItem: (id: string | null) => void;
  getItemsByParent: (parentId: string | null) => Item[];
}

export const useItemStore = create<ItemStore>((set, get) => ({
  items: [],
  isLoading: false,
  selectedItemId: null,

  fetchItemsByList: async (listId) => {
    // 1. Serve cached items immediately
    if (get().items.length === 0) {
      try {
        const cached = await db.items
          .where("listId")
          .equals(listId)
          .toArray();
        if (cached.length > 0) {
          set({ items: cached.map((c) => fromLocalItem(c) as Item), isLoading: false });
        }
      } catch {
        // Dexie read is non-critical
      }
    }

    // 2. Revalidate from network
    try {
      const res = await fetch(`/api/items?list_id=${listId}`);
      if (res.ok) {
        const items: Item[] = await res.json();
        set({ items, isLoading: false });
        try {
          await db.items.bulkPut(items.map(toLocalItem));
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

  fetchTodayItems: async () => {
    // 1. Serve cached items immediately
    if (get().items.length === 0) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const cached = await db.items
          .where("dueDate")
          .equals(today)
          .toArray();
        if (cached.length > 0) {
          set({ items: cached.map((c) => fromLocalItem(c) as Item), isLoading: false });
        }
      } catch {
        // Dexie read is non-critical
      }
    }

    // 2. Revalidate from network
    try {
      const res = await fetch("/api/views/today");
      if (res.ok) {
        const items: Item[] = await res.json();
        set({ items, isLoading: false });
        try {
          await db.items.bulkPut(items.map(toLocalItem));
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

  fetchUpcomingItems: async () => {
    // 1. Serve cached items immediately
    if (get().items.length === 0) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const cached = await db.items
          .where("dueDate")
          .above(today)
          .toArray();
        if (cached.length > 0) {
          set({ items: cached.map((c) => fromLocalItem(c) as Item), isLoading: false });
        }
      } catch {
        // Dexie read is non-critical
      }
    }

    // 2. Revalidate from network
    try {
      const res = await fetch("/api/views/upcoming");
      if (res.ok) {
        const items: Item[] = await res.json();
        set({ items, isLoading: false });
        try {
          await db.items.bulkPut(items.map(toLocalItem));
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

  createItem: async (data) => {
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create item");
    const item: Item = await res.json();
    set((state) => ({ items: [...state.items, item] }));
    return item;
  },

  updateItem: async (id, data) => {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update item");
    const updated: Item = await res.json();
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? updated : i)),
    }));
  },

  toggleComplete: async (id) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const isCompleted = !item.is_completed;
    // Optimistic update
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id
          ? {
              ...i,
              is_completed: isCompleted,
              completed_at: isCompleted ? new Date().toISOString() : null,
            }
          : i
      ),
    }));
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_completed: isCompleted,
      }),
    });
    if (!res.ok) {
      // Revert on failure
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? item : i)),
      }));
    }
  },

  deleteItem: async (id) => {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
        selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
      }));
    }
  },

  reorderItems: async (listId, orderedIds) => {
    const prevItems = get().items;

    set((state) => {
      const itemMap = new Map(state.items.map((i) => [i.id, i]));
      const reordered = orderedIds
        .map((id) => itemMap.get(id))
        .filter((i): i is Item => i !== undefined);
      const remaining = state.items.filter(
        (i) => i.list_id !== listId || !orderedIds.includes(i.id)
      );
      return { items: [...reordered, ...remaining] };
    });

    try {
      const res = await fetch("/api/items/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: listId, orderedIds }),
      });
      if (!res.ok) throw new Error("Reorder failed");
    } catch {
      set({ items: prevItems });
    }
  },

  moveItem: async (id, data) => {
    const res = await fetch(`/api/items/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to move item");
    const updated: Item = await res.json();
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? updated : i)),
    }));
  },

  setSelectedItem: (id) => set({ selectedItemId: id }),

  getItemsByParent: (parentId) =>
    get()
      .items.filter((i) => i.parent_item_id === parentId)
      .sort((a, b) => a.position - b.position),
}));
