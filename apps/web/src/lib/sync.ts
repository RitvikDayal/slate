import { db, type SyncQueueEntry } from "./db";
import { useSyncStatusStore } from "@/stores/sync-status-store";

let isProcessing = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let syncStarted = false;

function getBackoffDelay(retryCount: number): number {
  return Math.min(Math.pow(2, retryCount) * 1000, 60000);
}

function getApiUrl(entry: SyncQueueEntry): { url: string; method: string } {
  const entityRoutes: Record<string, string> = {
    item: "/api/items",
    list: "/api/lists",
    label: "/api/labels",
    savedView: "/api/saved-views",
  };

  // Special operations
  if (entry.operation === "reorder") {
    if (entry.entity === "item") return { url: "/api/items/reorder", method: "POST" };
    if (entry.entity === "list") return { url: "/api/lists/reorder", method: "POST" };
  }
  if (entry.operation === "move") {
    return { url: `/api/items/${entry.entityId}/move`, method: "POST" };
  }

  // itemLabel special routing
  if (entry.entity === "itemLabel") {
    const [itemId, labelId] = entry.entityId.split(":");
    if (entry.operation === "create") return { url: `/api/items/${itemId}/labels`, method: "POST" };
    if (entry.operation === "delete")
      return { url: `/api/items/${itemId}/labels/${labelId}`, method: "DELETE" };
  }

  // Attachment routing
  if (entry.entity === "attachment") {
    const itemId = entry.data.item_id as string;
    if (entry.operation === "create")
      return { url: `/api/items/${itemId}/attachments`, method: "POST" };
    if (entry.operation === "delete")
      return { url: `/api/items/${itemId}/attachments/${entry.entityId}`, method: "DELETE" };
  }

  const base = entityRoutes[entry.entity];
  if (entry.operation === "create") return { url: base, method: "POST" };
  if (entry.operation === "update") return { url: `${base}/${entry.entityId}`, method: "PATCH" };
  if (entry.operation === "delete") return { url: `${base}/${entry.entityId}`, method: "DELETE" };

  return { url: base, method: "POST" };
}

export async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  const store = useSyncStatusStore.getState();
  store.setSyncing(true);

  try {
    const now = new Date().toISOString();
    const entries = await db.syncQueue
      .where("status")
      .anyOf(["pending", "failed"])
      .filter((e) => e.status === "pending" || (e.nextRetryAt !== null && e.nextRetryAt <= now))
      .sortBy("timestamp");

    // Auth check before processing
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        store.setFailed(entries.length);
        return;
      }
    }

    for (const entry of entries) {
      await db.syncQueue.update(entry.id!, { status: "processing" });

      try {
        await syncEntry(entry);
        await db.syncQueue.delete(entry.id!);
      } catch (err) {
        const status = (err as { status?: number }).status;
        const isServerError = status !== undefined && status >= 500;
        const isNetworkError = err instanceof TypeError;

        const newRetryCount = (entry.retryCount ?? 0) + 1;
        const nextRetryAt = new Date(
          Date.now() + getBackoffDelay(newRetryCount)
        ).toISOString();

        await db.syncQueue.update(entry.id!, {
          status: "failed",
          retryCount: newRetryCount,
          nextRetryAt,
          error: err instanceof Error ? err.message : "Unknown error",
        });

        if (isServerError || isNetworkError) break;
      }
    }
  } finally {
    isProcessing = false;
    const store = useSyncStatusStore.getState();
    store.setSyncing(false);
    store.refreshCounts();
  }
}

async function syncEntry(entry: SyncQueueEntry): Promise<void> {
  // Handle attachment uploads separately
  if (entry.entity === "attachment" && entry.operation === "create") {
    await syncAttachmentUpload(entry);
    return;
  }

  const { url, method } = getApiUrl(entry);

  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (method !== "DELETE") {
    options.body = JSON.stringify(entry.data);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    const error = Object.assign(new Error(`Sync failed: ${res.status}`), {
      status: res.status,
    });
    throw error;
  }

  if (method === "PATCH") {
    const body = await res.json();
    if (body.conflict) {
      await reconcileConflict(entry.entity, entry.entityId, body.current);
      return;
    }
    await reconcileSuccess(entry.entity, entry.entityId, body);
  } else if (method === "POST" && entry.operation === "create") {
    const body = await res.json();
    await reconcileSuccess(entry.entity, entry.entityId, body);
  }
}

async function reconcileSuccess(
  entity: string,
  entityId: string,
  serverData: Record<string, unknown>
): Promise<void> {
  const { toLocalItem, toLocalList, toLocalLabel, toLocalSavedView } = await import("./db");

  switch (entity) {
    case "item":
      await db.items.put(toLocalItem(serverData as never));
      break;
    case "list":
      await db.lists.put(toLocalList(serverData as never));
      break;
    case "label":
      await db.labels.put(toLocalLabel(serverData as never));
      break;
    case "savedView":
      await db.savedViews.put(toLocalSavedView(serverData as never));
      break;
  }
}

async function reconcileConflict(
  entity: string,
  entityId: string,
  serverData: Record<string, unknown>
): Promise<void> {
  await reconcileSuccess(entity, entityId, serverData);

  switch (entity) {
    case "item": {
      const { useItemStore } = await import("@/stores/item-store");
      useItemStore.setState((state) => ({
        items: state.items.map((i) =>
          i.id === entityId ? ({ ...i, ...serverData } as typeof i) : i
        ),
      }));
      break;
    }
    case "list": {
      const { useListStore } = await import("@/stores/list-store");
      useListStore.setState((state) => ({
        lists: state.lists.map((l) =>
          l.id === entityId ? ({ ...l, ...serverData } as typeof l) : l
        ),
      }));
      break;
    }
  }
}

async function syncAttachmentUpload(entry: SyncQueueEntry): Promise<void> {
  const pending = await db.pendingAttachments.get(entry.entityId);
  if (!pending) {
    return;
  }

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const path = `${entry.data.item_id}/${entry.entityId}/${pending.fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(path, pending.blob, { contentType: pending.mimeType });

  if (uploadError) {
    throw Object.assign(new Error(uploadError.message), { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);

  const res = await fetch(`/api/items/${entry.data.item_id}/attachments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: entry.entityId,
      type: "file",
      name: pending.fileName,
      url: urlData.publicUrl,
      mime_type: pending.mimeType,
      size_bytes: pending.size,
    }),
  });

  if (!res.ok) {
    throw Object.assign(new Error(`Attachment metadata POST failed: ${res.status}`), {
      status: res.status,
    });
  }

  await db.pendingAttachments.delete(entry.entityId);
  await db.attachmentMeta.update(entry.entityId, { url: urlData.publicUrl });
}

export function startSyncListener(): () => void {
  if (syncStarted) return () => {};
  syncStarted = true;

  useSyncStatusStore.getState().refreshCounts();

  const onlineHandler = () => processQueue();

  const visibilityHandler = () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      processQueue();
    }
  };

  window.addEventListener("online", onlineHandler);
  document.addEventListener("visibilitychange", visibilityHandler);

  syncInterval = setInterval(() => {
    if (navigator.onLine) processQueue();
  }, 30000);

  if (navigator.onLine) processQueue();

  return () => {
    if (syncInterval) clearInterval(syncInterval);
    window.removeEventListener("online", onlineHandler);
    document.removeEventListener("visibilitychange", visibilityHandler);
    syncStarted = false;
  };
}
