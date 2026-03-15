import Dexie, { type EntityTable } from "dexie";
import type {
  Item,
  List,
  Label,
  SavedView,
  Attachment,
  ItemType,
  ItemPriority,
  ItemEffort,
  ItemSource,
  AttachmentType,
} from "@ai-todo/shared";

interface LocalList {
  id: string;
  userId: string;
  title: string;
  icon: string | null;
  color: string | null;
  position: number;
  parentListId: string | null;
  isInbox: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LocalItem {
  id: string;
  listId: string;
  userId: string;
  parentItemId: string | null;
  type: ItemType;
  title: string;
  contentJson: Record<string, unknown> | null;
  isCompleted: boolean;
  completedAt: string | null;
  dueDate: string | null;
  dueTime: string | null;
  reminderAt: string | null;
  recurrenceRule: string | null;
  priority: ItemPriority;
  effort: ItemEffort | null;
  estimatedMinutes: number | null;
  position: number;
  isMovable: boolean;
  source: ItemSource;
  sourceRef: Record<string, unknown> | null;
  scheduledDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  aiNotes: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LocalLabel {
  id: string;
  userId: string;
  name: string;
  color: string;
}

interface LocalItemLabel {
  itemId: string;
  labelId: string;
}

interface LocalSavedView {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  color: string | null;
  filters: Array<{ field: string; op: string; value: string | number | boolean | null }>;
  sortBy: string;
  isPinned: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface LocalAttachmentMeta {
  id: string;
  itemId: string;
  userId: string;
  type: AttachmentType;
  name: string;
  url: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  thumbnailUrl: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface PendingAttachment {
  id: string;
  itemId: string;
  fileName: string;
  mimeType: string;
  size: number;
  blob: Blob;
  status: "pending" | "uploading" | "failed";
  createdAt: string;
  retryCount: number;
}

interface SyncQueueEntry {
  id?: number;
  entity: "list" | "item" | "label" | "itemLabel" | "savedView" | "attachment";
  entityId: string;
  operation: "create" | "update" | "delete" | "reorder" | "move";
  data: Record<string, unknown>;
  status: "pending" | "processing" | "failed";
  retryCount: number;
  nextRetryAt: string | null;
  error: string | null;
  timestamp: string;
}

const db = new Dexie("AITodoApp") as Dexie & {
  lists: EntityTable<LocalList, "id">;
  items: EntityTable<LocalItem, "id">;
  labels: EntityTable<LocalLabel, "id">;
  itemLabels: EntityTable<LocalItemLabel, "itemId">;
  syncQueue: EntityTable<SyncQueueEntry, "id">;
  savedViews: EntityTable<LocalSavedView, "id">;
  attachmentMeta: EntityTable<LocalAttachmentMeta, "id">;
  pendingAttachments: EntityTable<PendingAttachment, "id">;
};

db.version(1).stores({
  lists: "id, userId, parentListId, position, updatedAt",
  items: "id, listId, parentItemId, position, isCompleted, dueDate, updatedAt",
  labels: "id, userId",
  itemLabels: "[itemId+labelId], itemId, labelId",
  syncQueue: "++id, entity, entityId, operation, timestamp",
});

db.version(2)
  .stores({
    lists: "id, userId, parentListId, position, updatedAt",
    items: "id, listId, parentItemId, position, isCompleted, dueDate, updatedAt",
    labels: "id, userId",
    itemLabels: "[itemId+labelId], itemId, labelId",
    syncQueue: "++id, entity, entityId, operation, status, timestamp, nextRetryAt",
    savedViews: "id, userId, updatedAt",
    attachmentMeta: "id, itemId, createdAt",
    pendingAttachments: "id, itemId, status, createdAt",
  })
  .upgrade((tx) => {
    return tx
      .table("syncQueue")
      .toCollection()
      .modify((entry: Record<string, unknown>) => {
        entry.status = entry.status ?? "pending";
        entry.retryCount = entry.retryCount ?? 0;
        entry.nextRetryAt = entry.nextRetryAt ?? null;
        entry.error = entry.error ?? null;
      });
  });

export { db };
export type {
  LocalList,
  LocalItem,
  LocalLabel,
  LocalItemLabel,
  LocalSavedView,
  LocalAttachmentMeta,
  PendingAttachment,
  SyncQueueEntry,
};

// --- Conversion helpers ---

export function toLocalList(list: List): LocalList {
  return {
    id: list.id,
    userId: list.user_id,
    title: list.title,
    icon: list.icon,
    color: list.color,
    position: list.position,
    parentListId: list.parent_list_id,
    isInbox: list.is_inbox,
    isArchived: list.is_archived,
    createdAt: list.created_at,
    updatedAt: list.updated_at,
  };
}

export function fromLocalList(local: LocalList): List {
  return {
    id: local.id,
    user_id: local.userId,
    title: local.title,
    icon: local.icon,
    color: local.color,
    position: local.position,
    parent_list_id: local.parentListId,
    is_inbox: local.isInbox,
    is_archived: local.isArchived,
    created_at: local.createdAt,
    updated_at: local.updatedAt,
  };
}

export function toLocalItem(item: Item): LocalItem {
  return {
    id: item.id,
    listId: item.list_id,
    userId: item.user_id,
    parentItemId: item.parent_item_id,
    type: item.type,
    title: item.title,
    contentJson: item.content_json,
    isCompleted: item.is_completed,
    completedAt: item.completed_at,
    dueDate: item.due_date,
    dueTime: item.due_time,
    reminderAt: item.reminder_at,
    recurrenceRule: item.recurrence_rule,
    priority: item.priority,
    effort: item.effort,
    estimatedMinutes: item.estimated_minutes,
    position: item.position,
    isMovable: item.is_movable,
    source: item.source,
    sourceRef: item.source_ref,
    scheduledDate: item.scheduled_date,
    scheduledStart: item.scheduled_start,
    scheduledEnd: item.scheduled_end,
    aiNotes: item.ai_notes,
    isArchived: item.is_archived,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export function fromLocalItem(local: LocalItem): Omit<Item, "children" | "labels"> {
  return {
    id: local.id,
    list_id: local.listId,
    user_id: local.userId,
    parent_item_id: local.parentItemId,
    type: local.type,
    title: local.title,
    content_json: local.contentJson,
    is_completed: local.isCompleted,
    completed_at: local.completedAt,
    due_date: local.dueDate,
    due_time: local.dueTime,
    reminder_at: local.reminderAt,
    recurrence_rule: local.recurrenceRule,
    priority: local.priority,
    effort: local.effort,
    estimated_minutes: local.estimatedMinutes,
    position: local.position,
    is_movable: local.isMovable,
    source: local.source,
    source_ref: local.sourceRef,
    scheduled_date: local.scheduledDate,
    scheduled_start: local.scheduledStart,
    scheduled_end: local.scheduledEnd,
    ai_notes: local.aiNotes,
    is_archived: local.isArchived,
    created_at: local.createdAt,
    updated_at: local.updatedAt,
  };
}

export function toLocalLabel(label: Label): LocalLabel {
  return {
    id: label.id,
    userId: label.user_id,
    name: label.name,
    color: label.color,
  };
}

export function fromLocalLabel(local: LocalLabel): Omit<Label, "created_at"> {
  return {
    id: local.id,
    user_id: local.userId,
    name: local.name,
    color: local.color,
  };
}

export function toLocalSavedView(view: SavedView): LocalSavedView {
  return {
    id: view.id,
    userId: view.user_id,
    name: view.name,
    icon: view.icon,
    color: view.color,
    filters: view.filters,
    sortBy: view.sort_by,
    isPinned: view.is_pinned,
    position: view.position,
    createdAt: view.created_at,
    updatedAt: view.updated_at,
  };
}

export function fromLocalSavedView(local: LocalSavedView): SavedView {
  return {
    id: local.id,
    user_id: local.userId,
    name: local.name,
    icon: local.icon,
    color: local.color,
    filters: local.filters,
    sort_by: local.sortBy,
    is_pinned: local.isPinned,
    position: local.position,
    created_at: local.createdAt,
    updated_at: local.updatedAt,
  };
}

export function toLocalAttachmentMeta(att: Attachment): LocalAttachmentMeta {
  return {
    id: att.id,
    itemId: att.item_id,
    userId: att.user_id,
    type: att.type,
    name: att.name,
    url: att.url,
    mimeType: att.mime_type,
    sizeBytes: att.size_bytes,
    thumbnailUrl: att.thumbnail_url,
    position: att.position,
    createdAt: att.created_at,
    updatedAt: att.updated_at,
  };
}

export function fromLocalAttachmentMeta(local: LocalAttachmentMeta): Attachment {
  return {
    id: local.id,
    item_id: local.itemId,
    user_id: local.userId,
    type: local.type,
    name: local.name,
    url: local.url ?? "",
    mime_type: local.mimeType,
    size_bytes: local.sizeBytes,
    thumbnail_url: local.thumbnailUrl,
    position: local.position,
    created_at: local.createdAt,
    updated_at: local.updatedAt,
  };
}
