"use client";

import { create } from "zustand";
import type {
  Item,
  CreateItemInput,
  UpdateItemInput,
  MoveItemInput,
} from "@ai-todo/shared";
import { db, toLocalItem, fromLocalItem } from "@/lib/db";
import { mutateLocal, generateId, itemToApiPayload } from "@/lib/offline-mutation";

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
    const id = generateId();
    const now = new Date().toISOString();
    const newItem: Item = {
      id,
      list_id: data.list_id,
      user_id: "", // will be set by server
      parent_item_id: data.parent_item_id ?? null,
      type: data.type ?? "task",
      title: data.title ?? "",
      content_json: data.content_json ?? null,
      is_completed: false,
      completed_at: null,
      due_date: data.due_date ?? null,
      due_time: data.due_time ?? null,
      reminder_at: null,
      recurrence_rule: data.recurrence_rule ?? null,
      priority: data.priority ?? "none",
      effort: data.effort ?? null,
      estimated_minutes: data.estimated_minutes ?? null,
      position: data.position ?? get().items.length,
      is_movable: true,
      source: data.source ?? "manual",
      source_ref: data.source_ref ?? null,
      scheduled_date: null,
      scheduled_start: null,
      scheduled_end: null,
      ai_notes: null,
      is_archived: false,
      created_at: now,
      updated_at: now,
      labels: [],
    };

    set((state) => ({ items: [...state.items, newItem] }));

    await mutateLocal({
      entity: "item",
      operation: "create",
      entityId: id,
      data: { ...itemToApiPayload(newItem as unknown as Record<string, unknown>), label_ids: data.label_ids },
      dexieWrite: async () => {
        await db.items.put(toLocalItem(newItem));
        if (data.label_ids?.length) {
          await db.itemLabels.bulkPut(data.label_ids.map((lid) => ({ itemId: id, labelId: lid })));
        }
      },
    });

    return newItem;
  },

  updateItem: async (id, data) => {
    const now = new Date().toISOString();
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const updated = { ...item, ...data, updated_at: now };
    set((state) => ({ items: state.items.map((i) => (i.id === id ? updated : i)) }));

    await mutateLocal({
      entity: "item",
      operation: "update",
      entityId: id,
      data: { ...data, updated_at: now },
      dexieWrite: async () => { await db.items.put(toLocalItem(updated)); },
    });
  },

  toggleComplete: async (id) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const isCompleted = !item.is_completed;
    const now = new Date().toISOString();
    const updated = {
      ...item,
      is_completed: isCompleted,
      completed_at: isCompleted ? now : null,
      updated_at: now,
    };

    set((state) => ({
      items: state.items.map((i) => (i.id === id ? updated : i)),
    }));

    await mutateLocal({
      entity: "item",
      operation: "update",
      entityId: id,
      data: { is_completed: isCompleted, updated_at: now },
      dexieWrite: async () => { await db.items.put(toLocalItem(updated)); },
    });
  },

  deleteItem: async (id) => {
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    }));

    await mutateLocal({
      entity: "item",
      operation: "delete",
      entityId: id,
      data: {},
      dexieWrite: async () => { await db.items.delete(id); },
    });
  },

  reorderItems: async (listId, orderedIds) => {
    set((state) => {
      const itemMap = new Map(state.items.map((i) => [i.id, i]));
      const reordered = orderedIds.map((oid) => itemMap.get(oid)).filter((i): i is Item => i !== undefined);
      const remaining = state.items.filter((i) => i.list_id !== listId || !orderedIds.includes(i.id));
      return { items: [...reordered, ...remaining] };
    });

    await mutateLocal({
      entity: "item",
      operation: "reorder",
      entityId: listId,
      data: { list_id: listId, orderedIds },
      dexieWrite: async () => {
        for (let i = 0; i < orderedIds.length; i++) {
          await db.items.update(orderedIds[i], { position: i });
        }
      },
    });
  },

  moveItem: async (id, data) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const now = new Date().toISOString();
    const updated = { ...item, list_id: data.target_list_id, updated_at: now };

    set((state) => ({
      items: state.items.map((i) => (i.id === id ? updated : i)),
    }));

    await mutateLocal({
      entity: "item",
      operation: "move",
      entityId: id,
      data: { target_list_id: data.target_list_id, position: data.position },
      dexieWrite: async () => { await db.items.put(toLocalItem(updated)); },
    });
  },

  setSelectedItem: (id) => set({ selectedItemId: id }),

  getItemsByParent: (parentId) =>
    get()
      .items.filter((i) => i.parent_item_id === parentId)
      .sort((a, b) => a.position - b.position),
}));
