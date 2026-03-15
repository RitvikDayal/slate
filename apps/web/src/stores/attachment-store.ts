"use client";

import { create } from "zustand";
import type { Attachment, CreateAttachmentInput } from "@ai-todo/shared";
import { mutateLocal, generateId } from "@/lib/offline-mutation";
import { db, toLocalAttachmentMeta, fromLocalAttachmentMeta } from "@/lib/db";

interface AttachmentStore {
  attachments: Attachment[];
  isLoading: boolean;
  fetchAttachments: (itemId: string) => Promise<void>;
  addAttachment: (itemId: string, file: File) => Promise<Attachment>;
  addLink: (itemId: string, data: CreateAttachmentInput) => Promise<Attachment>;
  deleteAttachment: (itemId: string, attachmentId: string) => Promise<void>;
}

export const useAttachmentStore = create<AttachmentStore>((set, get) => ({
  attachments: [],
  isLoading: false,

  fetchAttachments: async (itemId) => {
    // 1. Serve cached attachment metadata immediately
    if (get().attachments.length === 0) {
      try {
        const cached = await db.attachmentMeta
          .where("itemId")
          .equals(itemId)
          .toArray();
        if (cached.length > 0) {
          set({
            attachments: cached.map(fromLocalAttachmentMeta),
            isLoading: false,
          });
        }
      } catch {
        // Dexie read is non-critical
      }
    }

    set({ isLoading: true });

    // 2. Revalidate from network
    try {
      const res = await fetch(`/api/items/${itemId}/attachments`);
      if (res.ok) {
        const attachments: Attachment[] = await res.json();
        set({ attachments, isLoading: false });
        try {
          await db.attachmentMeta.bulkPut(
            attachments.map(toLocalAttachmentMeta)
          );
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

  addAttachment: async (itemId, file) => {
    const id = generateId();
    const now = new Date().toISOString();
    if (file.size > 25 * 1024 * 1024) throw new Error("File too large (max 25MB)");

    const meta: Attachment = {
      id,
      item_id: itemId,
      user_id: "",
      type: "file",
      name: file.name,
      url: "",
      mime_type: file.type || null,
      size_bytes: file.size,
      thumbnail_url: null,
      position: get().attachments.length,
      created_at: now,
      updated_at: now,
    };

    set((state) => ({ attachments: [...state.attachments, meta] }));

    await mutateLocal({
      entity: "attachment",
      operation: "create",
      entityId: id,
      data: { item_id: itemId },
      dexieWrite: async () => {
        await db.attachmentMeta.put(toLocalAttachmentMeta(meta));
        await db.pendingAttachments.put({
          id,
          itemId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          blob: file as Blob,
          status: "pending",
          createdAt: now,
          retryCount: 0,
        });
      },
    });

    return meta;
  },

  addLink: async (itemId, data) => {
    const id = generateId();
    const now = new Date().toISOString();

    const meta: Attachment = {
      id,
      item_id: itemId,
      user_id: "",
      type: data.type,
      name: data.name,
      url: data.url,
      mime_type: data.mime_type ?? null,
      size_bytes: data.size_bytes ?? null,
      thumbnail_url: data.thumbnail_url ?? null,
      position: data.position ?? get().attachments.length,
      created_at: now,
      updated_at: now,
    };

    set((state) => ({ attachments: [...state.attachments, meta] }));

    await mutateLocal({
      entity: "attachment",
      operation: "create",
      entityId: id,
      data: { item_id: itemId, ...data },
      dexieWrite: async () => {
        await db.attachmentMeta.put(toLocalAttachmentMeta(meta));
      },
    });

    return meta;
  },

  deleteAttachment: async (itemId, attachmentId) => {
    set((state) => ({
      attachments: state.attachments.filter((a) => a.id !== attachmentId),
    }));
    await mutateLocal({
      entity: "attachment",
      operation: "delete",
      entityId: attachmentId,
      data: { item_id: itemId },
      dexieWrite: async () => {
        await db.attachmentMeta.delete(attachmentId);
        await db.pendingAttachments.delete(attachmentId).catch(() => {});
      },
    });
  },
}));
