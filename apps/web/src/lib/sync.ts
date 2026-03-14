import { db, type SyncQueueEntry } from "./db";

let syncStarted = false;

export async function addToSyncQueue(
  entry: Omit<SyncQueueEntry, "id" | "timestamp">
) {
  await db.syncQueue.add({
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

export async function processSyncQueue() {
  const entries = await db.syncQueue.orderBy("timestamp").toArray();
  if (entries.length === 0) return;

  for (const entry of entries) {
    try {
      await syncEntry(entry);
      if (entry.id !== undefined) {
        await db.syncQueue.delete(entry.id);
      }
    } catch {
      // Keep in queue for retry
      break;
    }
  }
}

async function syncEntry(entry: SyncQueueEntry) {
  if (entry.entity === "itemLabel") {
    if (entry.operation === "create") {
      const res = await fetch(`/api/items/${entry.entityId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId: (entry.data as Record<string, unknown>).labelId }),
      });
      if (!res.ok) throw new Error("Sync failed");
    } else if (entry.operation === "delete") {
      const res = await fetch(
        `/api/items/${entry.entityId}/labels/${(entry.data as Record<string, unknown>).labelId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Sync failed");
    }
    return;
  }

  const entityMap: Record<string, string> = {
    list: "/api/lists",
    item: "/api/items",
    label: "/api/labels",
  };

  const baseUrl = entityMap[entry.entity];
  if (!baseUrl) return;

  switch (entry.operation) {
    case "create": {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.data),
      });
      if (!res.ok) throw new Error("Sync failed");
      break;
    }
    case "update": {
      const res = await fetch(`${baseUrl}/${entry.entityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.data),
      });
      if (!res.ok) throw new Error("Sync failed");
      break;
    }
    case "delete": {
      const res = await fetch(`${baseUrl}/${entry.entityId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Sync failed");
      break;
    }
  }
}

export function startSyncListener() {
  if (syncStarted) return () => {};
  syncStarted = true;

  const onlineHandler = () => {
    processSyncQueue();
  };
  window.addEventListener("online", onlineHandler);

  // Also try syncing periodically
  const interval = setInterval(() => {
    if (navigator.onLine) {
      processSyncQueue();
    }
  }, 30000);

  return () => {
    clearInterval(interval);
    window.removeEventListener("online", onlineHandler);
    syncStarted = false;
  };
}
