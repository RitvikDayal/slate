"use client";

import { create } from "zustand";
import type { Label } from "@ai-todo/shared";
import { mutateLocal, generateId, labelToApiPayload } from "@/lib/offline-mutation";
import { db, toLocalLabel, fromLocalLabel } from "@/lib/db";

interface LabelStore {
  labels: Label[];
  isLoading: boolean;
  fetchLabels: () => Promise<void>;
  createLabel: (data: { name: string; color: string }) => Promise<Label>;
  deleteLabel: (id: string) => Promise<void>;
}

export const useLabelStore = create<LabelStore>((set, get) => ({
  labels: [],
  isLoading: false,

  fetchLabels: async () => {
    // 1. Serve cached labels immediately
    if (get().labels.length === 0) {
      try {
        const cached = await db.labels.toArray();
        if (cached.length > 0) {
          const labels = cached.map((l) => ({
            ...fromLocalLabel(l),
            created_at: "",
          })) as Label[];
          set({ labels, isLoading: false });
        }
      } catch {
        // Dexie read is non-critical
      }
    }

    set({ isLoading: true });

    // 2. Revalidate from network
    try {
      const res = await fetch("/api/labels");
      if (res.ok) {
        const labels: Label[] = await res.json();

        // Auto-seed default labels for new users (one-time per device)
        if (
          labels.length === 0 &&
          typeof window !== "undefined" &&
          !localStorage.getItem("slate-labels-seeded")
        ) {
          const { DEFAULT_LABELS } = await import(
            "@/lib/constants/default-labels"
          );
          const created: Label[] = [];
          for (const def of DEFAULT_LABELS) {
            const id = generateId();
            const now = new Date().toISOString();
            const label: Label = {
              id,
              user_id: "",
              name: def.name,
              color: def.color,
              created_at: now,
            };
            created.push(label);
            await mutateLocal({
              entity: "label",
              operation: "create",
              entityId: id,
              data: labelToApiPayload(
                label as unknown as Record<string, unknown>
              ),
              dexieWrite: () => db.labels.put(toLocalLabel(label)),
            });
          }
          localStorage.setItem("slate-labels-seeded", "1");
          set({ labels: created, isLoading: false });
          return;
        }

        set({ labels, isLoading: false });
        try {
          await db.labels.bulkPut(labels.map(toLocalLabel));
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

  createLabel: async (data) => {
    const id = generateId();
    const now = new Date().toISOString();
    const label: Label = {
      id,
      user_id: "",
      name: data.name,
      color: data.color,
      created_at: now,
    };
    set((state) => ({ labels: [...state.labels, label] }));
    await mutateLocal({
      entity: "label",
      operation: "create",
      entityId: id,
      data: labelToApiPayload(label as unknown as Record<string, unknown>),
      dexieWrite: () => db.labels.put(toLocalLabel(label)),
    });
    return label;
  },

  deleteLabel: async (id) => {
    set((state) => ({
      labels: state.labels.filter((l) => l.id !== id),
    }));
    await mutateLocal({
      entity: "label",
      operation: "delete",
      entityId: id,
      data: {},
      dexieWrite: () => db.labels.delete(id),
    });
  },
}));
