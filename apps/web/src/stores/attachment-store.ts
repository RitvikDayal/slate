"use client";

import { create } from "zustand";
import type { Attachment, CreateAttachmentInput } from "@ai-todo/shared";

interface AttachmentStore {
  attachments: Attachment[];
  isLoading: boolean;
  fetchAttachments: (itemId: string) => Promise<void>;
  addAttachment: (
    itemId: string,
    data: CreateAttachmentInput
  ) => Promise<Attachment>;
  deleteAttachment: (itemId: string, attachmentId: string) => Promise<void>;
}

export const useAttachmentStore = create<AttachmentStore>((set) => ({
  attachments: [],
  isLoading: false,

  fetchAttachments: async (itemId) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/items/${itemId}/attachments`);
      if (res.ok) {
        const attachments: Attachment[] = await res.json();
        set({ attachments, isLoading: false });
        return;
      }
    } catch {
      // Network error
    }
    set({ isLoading: false });
  },

  addAttachment: async (itemId, data) => {
    const res = await fetch(`/api/items/${itemId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err: { error: string } = await res.json();
      throw new Error(err.error || "Failed to upload");
    }
    const attachment: Attachment = await res.json();
    set((state) => ({ attachments: [...state.attachments, attachment] }));
    return attachment;
  },

  deleteAttachment: async (itemId, attachmentId) => {
    const res = await fetch(
      `/api/items/${itemId}/attachments/${attachmentId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      set((state) => ({
        attachments: state.attachments.filter((a) => a.id !== attachmentId),
      }));
    }
  },
}));
