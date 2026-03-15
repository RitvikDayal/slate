import Dexie, { type EntityTable } from "dexie";

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
  updatedAt: string;
}

interface LocalItem {
  id: string;
  listId: string;
  userId: string;
  parentItemId: string | null;
  type: "task" | "note" | "heading";
  title: string;
  contentJson: Record<string, unknown> | null;
  isCompleted: boolean;
  completedAt: string | null;
  dueDate: string | null;
  priority: string;
  position: number;
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

interface SyncQueueEntry {
  id?: number;
  entity: "list" | "item" | "label" | "itemLabel";
  entityId: string;
  operation: "create" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: string;
}

const db = new Dexie("AITodoApp") as Dexie & {
  lists: EntityTable<LocalList, "id">;
  items: EntityTable<LocalItem, "id">;
  labels: EntityTable<LocalLabel, "id">;
  itemLabels: EntityTable<LocalItemLabel, "itemId">;
  syncQueue: EntityTable<SyncQueueEntry, "id">;
};

db.version(1).stores({
  lists: "id, userId, parentListId, position, updatedAt",
  items: "id, listId, parentItemId, position, isCompleted, dueDate, updatedAt",
  labels: "id, userId",
  itemLabels: "[itemId+labelId], itemId, labelId",
  syncQueue: "++id, entity, entityId, operation, timestamp",
});

export { db };
export type {
  LocalList,
  LocalItem,
  LocalLabel,
  LocalItemLabel,
  SyncQueueEntry,
};

import type { Item, List } from "@ai-todo/shared";

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
    created_at: local.updatedAt,
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
    priority: item.priority,
    position: item.position,
    updatedAt: item.updated_at,
  };
}

export function fromLocalItem(local: LocalItem): Partial<Item> {
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
    priority: local.priority as Item["priority"],
    position: local.position,
    updated_at: local.updatedAt,
  };
}
