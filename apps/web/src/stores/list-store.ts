"use client";

import { create } from "zustand";
import type { List, CreateListInput, UpdateListInput } from "@ai-todo/shared";
import { mutateLocal, generateId, listToApiPayload } from "@/lib/offline-mutation";
import { db, toLocalList, fromLocalList } from "@/lib/db";

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
    // 1. Serve cached lists immediately
    if (get().lists.length === 0) {
      try {
        const cached = await db.lists.toArray();
        if (cached.length > 0) {
          set({ lists: cached.map(fromLocalList), isLoading: false });
        }
      } catch {
        // Dexie read is non-critical
      }
    }

    // 2. Revalidate from network in background
    try {
      const res = await fetch("/api/lists");
      if (res.ok) {
        const lists: List[] = await res.json();
        set({ lists, isLoading: false });
        try {
          await db.lists.bulkPut(lists.map(toLocalList));
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

  createList: async (data) => {
    const id = generateId();
    const now = new Date().toISOString();
    const newList: List = {
      id,
      user_id: "",
      title: data.title,
      icon: data.icon ?? null,
      color: data.color ?? null,
      position: data.position ?? get().lists.length,
      parent_list_id: data.parent_list_id ?? null,
      is_inbox: false,
      is_archived: false,
      created_at: now,
      updated_at: now,
    };
    set((state) => ({ lists: [...state.lists, newList] }));
    await mutateLocal({
      entity: "list",
      operation: "create",
      entityId: id,
      data: listToApiPayload(newList as unknown as Record<string, unknown>),
      dexieWrite: () => db.lists.put(toLocalList(newList)),
    });
    return newList;
  },

  updateList: async (id, data) => {
    const prev = get().lists.find((l) => l.id === id);
    if (!prev) return;
    const now = new Date().toISOString();
    const updated: List = { ...prev, ...data, updated_at: now };
    set((state) => ({
      lists: state.lists.map((l) => (l.id === id ? updated : l)),
    }));
    await mutateLocal({
      entity: "list",
      operation: "update",
      entityId: id,
      data: listToApiPayload(updated as unknown as Record<string, unknown>),
      dexieWrite: () => db.lists.put(toLocalList(updated)),
    });
  },

  deleteList: async (id) => {
    set((state) => ({
      lists: state.lists.filter((l) => l.id !== id),
      selectedListId: state.selectedListId === id ? null : state.selectedListId,
    }));
    await mutateLocal({
      entity: "list",
      operation: "delete",
      entityId: id,
      data: {},
      dexieWrite: async () => {
        await db.lists.delete(id);
        // Cascade: remove pending sync entries for items in this list
        const childEntries = await db.syncQueue
          .where("entity")
          .equals("item")
          .filter(
            (e) =>
              e.status === "pending" &&
              (e.data as Record<string, unknown>).list_id === id
          )
          .toArray();
        for (const entry of childEntries) {
          if (entry.id !== undefined) await db.syncQueue.delete(entry.id);
        }
      },
    });
  },

  reorderLists: async (orderedIds) => {
    set((state) => {
      const listMap = new Map(state.lists.map((l) => [l.id, l]));
      const reordered = orderedIds
        .map((id) => listMap.get(id))
        .filter((l): l is List => l !== undefined);
      const remaining = state.lists.filter((l) => !orderedIds.includes(l.id));
      return { lists: [...reordered, ...remaining] };
    });

    await mutateLocal({
      entity: "list",
      operation: "reorder",
      entityId: "lists",
      data: { orderedIds },
      dexieWrite: async () => {
        // Update positions in Dexie
        const lists = get().lists;
        for (let i = 0; i < lists.length; i++) {
          const list = lists[i];
          if (list) {
            await db.lists.update(list.id, { position: i });
          }
        }
      },
    });
  },

  setSelectedList: (id) => set({ selectedListId: id }),

  getInbox: () => get().lists.find((l) => l.is_inbox),
}));
