"use client";

import { create } from "zustand";
import type { Label } from "@ai-todo/shared";

interface LabelStore {
  labels: Label[];
  isLoading: boolean;
  fetchLabels: () => Promise<void>;
  createLabel: (data: { name: string; color: string }) => Promise<Label>;
  deleteLabel: (id: string) => Promise<void>;
}

export const useLabelStore = create<LabelStore>((set) => ({
  labels: [],
  isLoading: false,

  fetchLabels: async () => {
    set({ isLoading: true });
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
            try {
              const createRes = await fetch("/api/labels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(def),
              });
              if (createRes.ok) {
                created.push(await createRes.json());
              }
            } catch {
              // Continue with remaining labels
            }
          }
          localStorage.setItem("slate-labels-seeded", "1");
          set({ labels: created, isLoading: false });
          return;
        }

        set({ labels, isLoading: false });
        return;
      }
    } catch {
      // Network error
    }
    set({ isLoading: false });
  },

  createLabel: async (data) => {
    const res = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create label");
    const label: Label = await res.json();
    set((state) => ({ labels: [...state.labels, label] }));
    return label;
  },

  deleteLabel: async (id) => {
    const res = await fetch(`/api/labels/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({
        labels: state.labels.filter((l) => l.id !== id),
      }));
    }
  },
}));
