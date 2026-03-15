import { db, type SyncQueueEntry } from "./db";

export function generateId(): string {
  return crypto.randomUUID();
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSyncFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    const { processQueue } = await import("./sync");
    processQueue();
  }, 300);
}

async function deduplicateQueue(
  entity: SyncQueueEntry["entity"],
  operation: SyncQueueEntry["operation"],
  entityId: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const existing = await db.syncQueue
    .where("entityId")
    .equals(entityId)
    .and((e) => e.status === "pending" && e.entity === entity)
    .first();

  if (!existing) return false;

  if (operation === "delete") {
    if (existing.operation === "create") {
      await db.syncQueue.delete(existing.id!);
      return true;
    }
    await db.syncQueue.delete(existing.id!);
    return false;
  }

  if (operation === "update") {
    await db.syncQueue.update(existing.id!, {
      data: { ...existing.data, ...data },
    });
    return true;
  }

  if (operation === "reorder") {
    await db.syncQueue.update(existing.id!, { data });
    return true;
  }

  return false;
}

interface MutateLocalParams {
  entity: SyncQueueEntry["entity"];
  operation: SyncQueueEntry["operation"];
  entityId: string;
  data: Record<string, unknown>;
  dexieWrite: () => Promise<void>;
}

export async function mutateLocal({
  entity,
  operation,
  entityId,
  data,
  dexieWrite,
}: MutateLocalParams): Promise<void> {
  try {
    await dexieWrite();

    const handled = await deduplicateQueue(entity, operation, entityId, data);
    if (!handled) {
      await db.syncQueue.add({
        entity,
        operation,
        entityId,
        data,
        status: "pending",
        retryCount: 0,
        nextRetryAt: null,
        error: null,
        timestamp: new Date().toISOString(),
      });
    }

    scheduleSyncFlush();
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      console.warn("IndexedDB quota exceeded, mutation queued in-memory only");
    }
  }
}

export function itemToApiPayload(item: Record<string, unknown>): Record<string, unknown> {
  return {
    id: item.id,
    list_id: item.list_id,
    parent_item_id: item.parent_item_id,
    type: item.type,
    title: item.title,
    content_json: item.content_json,
    due_date: item.due_date,
    due_time: item.due_time,
    priority: item.priority,
    effort: item.effort,
    estimated_minutes: item.estimated_minutes,
    position: item.position,
    source: item.source,
    source_ref: item.source_ref,
    is_completed: item.is_completed,
    is_archived: item.is_archived,
    is_movable: item.is_movable,
    scheduled_date: item.scheduled_date,
    scheduled_start: item.scheduled_start,
    scheduled_end: item.scheduled_end,
    ai_notes: item.ai_notes,
    recurrence_rule: item.recurrence_rule,
    updated_at: item.updated_at,
  };
}

export function listToApiPayload(list: Record<string, unknown>): Record<string, unknown> {
  return {
    id: list.id,
    title: list.title,
    icon: list.icon,
    color: list.color,
    parent_list_id: list.parent_list_id,
    position: list.position,
    is_archived: list.is_archived,
    updated_at: list.updated_at,
  };
}

export function labelToApiPayload(label: Record<string, unknown>): Record<string, unknown> {
  return { id: label.id, name: label.name, color: label.color };
}

export function savedViewToApiPayload(view: Record<string, unknown>): Record<string, unknown> {
  return {
    id: view.id,
    name: view.name,
    icon: view.icon,
    color: view.color,
    filters: view.filters,
    sort_by: view.sort_by,
    is_pinned: view.is_pinned,
    position: view.position,
    updated_at: view.updated_at,
  };
}
