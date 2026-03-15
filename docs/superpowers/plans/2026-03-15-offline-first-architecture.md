# Offline-First Architecture Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all mutations offline-first — Dexie as source of truth, server as sync target. Users never wait for the server.

**Architecture:** Every write goes through `mutateLocal()` which writes to Dexie, updates Zustand, and queues a sync entry. A background sync engine processes the queue with exponential backoff, deduplication, and conflict detection. A minimal sync status indicator shows users their data is safe.

**Tech Stack:** Dexie (IndexedDB), Zustand, Next.js API routes, Supabase, Zod

**Spec:** `docs/superpowers/specs/2026-03-15-offline-first-architecture-design.md`

---

## Chunk 1: Prerequisites — Validation Schemas & API Routes

### Task 1: Update Zod validation schemas to accept client-provided IDs

**Files:**
- Modify: `packages/shared/src/validation/item.ts`
- Modify: `packages/shared/src/validation/list.ts`
- Modify: `packages/shared/src/validation/label.ts`
- Modify: `packages/shared/src/validation/view.ts`
- Modify: `packages/shared/src/validation/attachment.ts`

- [ ] **Step 1: Add `id` and `updated_at` to `createItemSchema` and `updated_at` to `updateItemSchema`**

In `packages/shared/src/validation/item.ts`, add to `createItemSchema`:
```typescript
id: z.string().uuid().optional(),
updated_at: z.string().datetime().optional(),
```

Add to `updateItemSchema`:
```typescript
updated_at: z.string().datetime().optional(),
```

- [ ] **Step 2: Add `id` and `updated_at` to `createListSchema` and `updated_at` to `updateListSchema`**

In `packages/shared/src/validation/list.ts`, add to `createListSchema`:
```typescript
id: z.string().uuid().optional(),
updated_at: z.string().datetime().optional(),
```

Add to `updateListSchema`:
```typescript
updated_at: z.string().datetime().optional(),
```

- [ ] **Step 3: Add `id` to `createLabelSchema`**

In `packages/shared/src/validation/label.ts`, add to `createLabelSchema`:
```typescript
id: z.string().uuid().optional(),
```

- [ ] **Step 4: Add `id` and `updated_at` to view schemas**

In `packages/shared/src/validation/view.ts`, add to `createSavedViewSchema`:
```typescript
id: z.string().uuid().optional(),
updated_at: z.string().datetime().optional(),
```

Add to `updateSavedViewSchema` (it uses `.partial()` so `updated_at` comes from the extend):
```typescript
updated_at: z.string().datetime().optional(),
```

- [ ] **Step 5: Add `id` to `createAttachmentSchema`**

In `packages/shared/src/validation/attachment.ts`, add:
```typescript
id: z.string().uuid().optional(),
```

- [ ] **Step 6: Verify build**

Run: `pnpm turbo build`
Expected: shared + web build successfully.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/validation/
git commit -m "feat: add optional id and updated_at to Zod create/update schemas for offline-first"
```

---

### Task 2: Update API POST routes to pass through client IDs and use upsert

**Files:**
- Modify: `apps/web/src/app/api/items/route.ts`
- Modify: `apps/web/src/app/api/lists/route.ts`
- Modify: `apps/web/src/app/api/labels/route.ts`
- Modify: `apps/web/src/app/api/saved-views/route.ts`

The change for each POST handler: replace `.insert({...})` with `.upsert({...}, { onConflict: "id" })` and spread the full `parsed.data` (which now includes optional `id` and `updated_at`).

- [ ] **Step 1: Update items POST route**

In `apps/web/src/app/api/items/route.ts`, change the insert in the POST handler:

```typescript
// Before:
const { data, error: dbError } = await supabase
  .from("items")
  .insert({ ...itemData, user_id: user.id })
  .select()
  .single();

// After:
const { data, error: dbError } = await supabase
  .from("items")
  .upsert({ ...itemData, user_id: user.id }, { onConflict: "id" })
  .select()
  .single();
```

- [ ] **Step 2: Update lists POST route**

In `apps/web/src/app/api/lists/route.ts`, same pattern:

```typescript
// Before:
.insert({ ...parsed.data, user_id: user.id })

// After:
.upsert({ ...parsed.data, user_id: user.id }, { onConflict: "id" })
```

- [ ] **Step 3: Update labels POST route**

In `apps/web/src/app/api/labels/route.ts`, same pattern.

- [ ] **Step 4: Update saved-views POST route**

Find `apps/web/src/app/api/saved-views/route.ts` and apply the same upsert pattern. **Note:** The current saved-views POST computes `position` server-side. When `position` is provided in the payload (from offline-first clients), skip the server-side position computation and use the client value.

- [ ] **Step 5: Verify build**

Run: `pnpm --filter web build`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/
git commit -m "feat: use upsert in POST routes to support client-provided IDs"
```

---

### Task 3: Add conflict detection to API PATCH routes

**Files:**
- Modify: `apps/web/src/app/api/items/[id]/route.ts`
- Modify: `apps/web/src/app/api/lists/[id]/route.ts`
- Modify: `apps/web/src/app/api/saved-views/[id]/route.ts`

For each PATCH handler: if `updated_at` is in the payload, add it as a conditional filter. If 0 rows match, return `{ conflict: true, current: <server row> }`.

- [ ] **Step 1: Update items PATCH route**

In `apps/web/src/app/api/items/[id]/route.ts`, modify the PATCH handler's update query:

```typescript
const { label_ids, updated_at: clientUpdatedAt, ...updateData } = parsed.data;

// Handle completion timestamps
if (updateData.is_completed === true) {
  (updateData as Record<string, unknown>).completed_at = new Date().toISOString();
} else if (updateData.is_completed === false) {
  (updateData as Record<string, unknown>).completed_at = null;
}

let query = supabase
  .from("items")
  .update(updateData)
  .eq("id", id)
  .eq("user_id", user.id);

// Add optimistic lock if client sends updated_at
if (clientUpdatedAt) {
  query = query.eq("updated_at", clientUpdatedAt);
}

const { data, error: dbError } = await query.select();

if (dbError)
  return NextResponse.json({ error: dbError.message }, { status: 500 });

// Conflict detection: 0 rows updated means server version is newer
if (data.length === 0 && clientUpdatedAt) {
  const { data: current } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  return NextResponse.json({ conflict: true, current });
}

const updatedItem = data[0];

// Handle label_ids (use updatedItem.id instead of data.id)
if (label_ids !== undefined) {
  await supabase.from("item_labels").delete().eq("item_id", id);
  if (label_ids.length > 0) {
    await supabase
      .from("item_labels")
      .insert(label_ids.map((lid) => ({ item_id: updatedItem.id, label_id: lid })));
  }
}

// Re-fetch with labels (existing pattern preserved)
const { data: fullItem, error: fetchError } = await supabase
  .from("items")
  .select("*, item_labels(label_id, labels(*))")
  .eq("id", updatedItem.id)
  .single();

if (fetchError) return NextResponse.json(updatedItem);

const itemWithLabels = {
  ...fullItem,
  labels: fullItem.item_labels?.map((il: { labels: unknown }) => il.labels).filter(Boolean) ?? [],
};
delete (itemWithLabels as Record<string, unknown>).item_labels;
return NextResponse.json(itemWithLabels);
```

- [ ] **Step 2: Update lists PATCH route**

Same pattern in `apps/web/src/app/api/lists/[id]/route.ts`:

```typescript
const { updated_at: clientUpdatedAt, ...updateFields } = parsed.data;

let query = supabase
  .from("lists")
  .update(updateFields)
  .eq("id", id)
  .eq("user_id", user.id);

if (clientUpdatedAt) {
  query = query.eq("updated_at", clientUpdatedAt);
}

const { data, error: dbError } = await query.select();

if (dbError)
  return NextResponse.json({ error: dbError.message }, { status: 500 });

if (data.length === 0 && clientUpdatedAt) {
  const { data: current } = await supabase
    .from("lists")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  return NextResponse.json({ conflict: true, current });
}

return NextResponse.json(data[0]);
```

- [ ] **Step 3: Update saved-views PATCH route**

Same pattern for saved views.

- [ ] **Step 4: Verify build**

Run: `pnpm --filter web build`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/
git commit -m "feat: add conflict detection to PATCH routes for offline-first sync"
```

---

## Chunk 2: Dexie Schema & Core Infrastructure

> **Note:** Tasks 4-7 form a unit — `offline-mutation.ts` (Task 5) dynamically imports `processQueue` from `sync.ts` (Task 7). The build won't work until both are in place. Implement them together before testing.

### Task 4: Expand Dexie schema to v2

**Files:**
- Modify: `apps/web/src/lib/db.ts`

- [ ] **Step 1: Expand `LocalItem` to include all `Item` fields**

Replace the current `LocalItem` interface with one that maps every field from the `Item` type in `packages/shared/src/types/database.ts`. Add all missing fields: `createdAt`, `dueTime`, `reminderAt`, `recurrenceRule`, `effort`, `estimatedMinutes`, `isMovable`, `source`, `sourceRef`, `scheduledDate`, `scheduledStart`, `scheduledEnd`, `aiNotes`, `isArchived`. The `children` and `labels` fields from `Item` are excluded — `children` is computed, and `labels` are stored in the separate `itemLabels` table.

- [ ] **Step 2: Add `createdAt` to `LocalList` interface**

Add `createdAt: string` to the `LocalList` interface. Update `toLocalList()` to map `created_at` → `createdAt`, and `fromLocalList()` to map it back.

- [ ] **Step 3: Add `LocalSavedView` interface and converters**

```typescript
interface LocalSavedView {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  color: string | null;
  filters: Record<string, unknown>[];
  sortBy: string;
  isPinned: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}
```

Add `toLocalSavedView()` and `fromLocalSavedView()` converters.

- [ ] **Step 4: Add `LocalAttachmentMeta` interface**

```typescript
interface LocalAttachmentMeta {
  id: string;
  itemId: string;
  userId: string;
  type: "file" | "link";
  name: string;
  url: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  thumbnailUrl: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 5: Add `PendingAttachment` interface**

```typescript
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
```

- [ ] **Step 6: Add `LocalLabel` converters**

Add `toLocalLabel()` and `fromLocalLabel()` functions.

- [ ] **Step 7: Update `SyncQueueEntry` type**

Expand `entity` union to include `"savedView"` and `"attachment"`. Add new fields:
```typescript
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
```

- [ ] **Step 8: Bump Dexie version to 2 with new tables and migration**

```typescript
db.version(1).stores({
  lists: "id, userId, parentListId, position, updatedAt",
  items: "id, listId, parentItemId, position, isCompleted, dueDate, updatedAt",
  labels: "id, userId",
  itemLabels: "[itemId+labelId], itemId, labelId",
  syncQueue: "++id, entity, entityId, operation, timestamp",
});

db.version(2).stores({
  lists: "id, userId, parentListId, position, updatedAt",
  items: "id, listId, parentItemId, position, isCompleted, dueDate, updatedAt",
  labels: "id, userId",
  itemLabels: "[itemId+labelId], itemId, labelId",
  syncQueue: "++id, entity, entityId, operation, status, timestamp, nextRetryAt",
  savedViews: "id, userId, updatedAt",
  attachmentMeta: "id, itemId, createdAt",
  pendingAttachments: "id, itemId, status, createdAt",
}).upgrade(tx => {
  return tx.table("syncQueue").toCollection().modify(entry => {
    entry.status = entry.status ?? "pending";
    entry.retryCount = entry.retryCount ?? 0;
    entry.nextRetryAt = entry.nextRetryAt ?? null;
    entry.error = entry.error ?? null;
  });
});
```

- [ ] **Step 9: Update `toLocalItem()` and `fromLocalItem()` to map all fields**

The return type of `fromLocalItem()` changes from `Partial<Item>` to `Omit<Item, "children" | "labels">`. Map all new fields. `children` and `labels` are excluded since they're computed/stored separately.

- [ ] **Step 10: Export all new types and converters**

Update the exports at the bottom of `db.ts`.

- [ ] **Step 11: Verify build**

Run: `pnpm --filter web build`

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/lib/db.ts
git commit -m "feat: expand Dexie schema to v2 — full local types, new tables, migration"
```

---

### Task 5: Create the optimistic mutation layer

**Files:**
- Create: `apps/web/src/lib/offline-mutation.ts`

- [ ] **Step 1: Create `offline-mutation.ts` with core types and `generateId()`**

```typescript
import { db, type SyncQueueEntry } from "./db";

export function generateId(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 2: Implement queue deduplication logic**

```typescript
async function deduplicateQueue(
  entity: SyncQueueEntry["entity"],
  operation: SyncQueueEntry["operation"],
  entityId: string,
  data: Record<string, unknown>
): Promise<boolean> {
  // Returns true if we handled it via dedup (no new entry needed)
  const existing = await db.syncQueue
    .where("entityId")
    .equals(entityId)
    .and((e) => e.status === "pending" && e.entity === entity)
    .first();

  if (!existing) return false;

  if (operation === "delete") {
    if (existing.operation === "create") {
      // Entity never reached server — remove both
      await db.syncQueue.delete(existing.id!);
      return true; // Caller should NOT add a delete entry
    }
    // Delete after update: remove update, caller adds delete
    await db.syncQueue.delete(existing.id!);
    return false;
  }

  if (operation === "update") {
    // Merge data into existing create or update entry
    await db.syncQueue.update(existing.id!, {
      data: { ...existing.data, ...data },
    });
    return true;
  }

  if (operation === "reorder") {
    // Replace old reorder with new one
    await db.syncQueue.update(existing.id!, { data });
    return true;
  }

  return false;
}
```

- [ ] **Step 3: Implement `mutateLocal()`**

```typescript
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
    // 1. Write to Dexie (source of truth)
    await dexieWrite();

    // 2. Add to sync queue (with deduplication)
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

    // 3. Trigger background sync
    scheduleSyncFlush();
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      // Storage full — fall back to direct server call
      // (handled by caller or shown as toast)
      console.warn("IndexedDB quota exceeded, mutation queued in-memory only");
    }
    // Don't throw — local mutation should never block the user
  }
}
```

- [ ] **Step 4: Implement `scheduleSyncFlush()`**

```typescript
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSyncFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    // Dynamic import to avoid circular dependency
    const { processQueue } = await import("./sync");
    processQueue();
  }, 300);
}
```

- [ ] **Step 5: Add API payload converter helpers**

```typescript
// Convert local Item to API create/update payload (snake_case, matching Zod schemas)
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
```

- [ ] **Step 6: Verify build**

Run: `pnpm --filter web build`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/offline-mutation.ts
git commit -m "feat: create optimistic mutation layer with deduplication and sync scheduling"
```

---

### Task 6: Create sync status store

**Files:**
- Create: `apps/web/src/stores/sync-status-store.ts`

- [ ] **Step 1: Create the store**

```typescript
"use client";

import { create } from "zustand";
import { db } from "@/lib/db";

interface SyncStatusStore {
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  setPending: (count: number) => void;
  setFailed: (count: number) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSynced: (date: Date) => void;
  refreshCounts: () => Promise<void>;
}

export const useSyncStatusStore = create<SyncStatusStore>((set) => ({
  pendingCount: 0,
  failedCount: 0,
  isSyncing: false,
  lastSyncedAt: null,

  setPending: (count) => set({ pendingCount: count }),
  setFailed: (count) => set({ failedCount: count }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSynced: (date) => set({ lastSyncedAt: date }),

  refreshCounts: async () => {
    try {
      const pending = await db.syncQueue
        .where("status")
        .equals("pending")
        .count();
      const failed = await db.syncQueue
        .where("status")
        .equals("failed")
        .filter((e) => e.retryCount >= 5)
        .count();
      set({ pendingCount: pending, failedCount: failed });
    } catch {
      // Dexie read is non-critical
    }
  },

  // Track failure duration for prolonged-failure toast
  // The SyncStatus component should track when pendingCount first becomes > 0
  // and show a toast after 2+ minutes: "Changes saved locally. Will sync when connection is restored."
}));
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter web build`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/stores/sync-status-store.ts
git commit -m "feat: create sync status store for offline-first UI indicator"
```

---

## Chunk 3: Sync Engine

### Task 7: Rewrite sync engine

**Files:**
- Rewrite: `apps/web/src/lib/sync.ts`

This is the largest single file. It handles: queue processing, API routing, conflict resolution, backoff, and attachment uploads.

- [ ] **Step 1: Set up imports, lock, and helper functions**

```typescript
import { db, type SyncQueueEntry } from "./db";
import { useSyncStatusStore } from "@/stores/sync-status-store";

let isProcessing = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;

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
    if (entry.operation === "delete") return { url: `/api/items/${itemId}/labels/${labelId}`, method: "DELETE" };
  }

  // Attachment routing
  if (entry.entity === "attachment") {
    const itemId = entry.data.item_id as string;
    if (entry.operation === "create") return { url: `/api/items/${itemId}/attachments`, method: "POST" };
    if (entry.operation === "delete") return { url: `/api/items/${itemId}/attachments/${entry.entityId}`, method: "DELETE" };
  }

  const base = entityRoutes[entry.entity];
  if (entry.operation === "create") return { url: base, method: "POST" };
  if (entry.operation === "update") return { url: `${base}/${entry.entityId}`, method: "PATCH" };
  if (entry.operation === "delete") return { url: `${base}/${entry.entityId}`, method: "DELETE" };

  return { url: base, method: "POST" };
}
```

- [ ] **Step 2: Implement `processQueue()` core loop**

```typescript
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Try refresh
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        // Pause queue — user needs to sign in
        store.setFailed(entries.length);
        return; // Don't process, don't mark failed — just pause
      }
    }

    for (const entry of entries) {
      // Mark as processing
      await db.syncQueue.update(entry.id!, { status: "processing" });

      try {
        await syncEntry(entry);
        // Success — remove from queue
        await db.syncQueue.delete(entry.id!);
      } catch (err) {
        const status = (err as { status?: number }).status;
        const isServerError = status !== undefined && status >= 500;
        const isNetworkError = err instanceof TypeError; // fetch network error

        const newRetryCount = (entry.retryCount ?? 0) + 1;
        const nextRetryAt = new Date(Date.now() + getBackoffDelay(newRetryCount)).toISOString();

        await db.syncQueue.update(entry.id!, {
          status: "failed",
          retryCount: newRetryCount,
          nextRetryAt,
          error: err instanceof Error ? err.message : "Unknown error",
        });

        // Stop processing on server/network errors (server is likely down)
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
```

- [ ] **Step 3: Implement `syncEntry()` for standard CRUD**

```typescript
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
    const error = Object.assign(new Error(`Sync failed: ${res.status}`), { status: res.status });
    throw error;
  }

  // Handle conflict response
  if (method === "PATCH") {
    const body = await res.json();
    if (body.conflict) {
      // Server version wins — update local state
      await reconcileConflict(entry.entity, entry.entityId, body.current);
      return;
    }
    // Update local Dexie with server response (captures computed fields)
    await reconcileSuccess(entry.entity, entry.entityId, body);
  } else if (method === "POST" && entry.operation === "create") {
    const body = await res.json();
    await reconcileSuccess(entry.entity, entry.entityId, body);
  }
}
```

- [ ] **Step 4: Implement `reconcileSuccess()` and `reconcileConflict()`**

```typescript
async function reconcileSuccess(
  entity: string,
  entityId: string,
  serverData: Record<string, unknown>
): Promise<void> {
  // Update Dexie with server response to capture computed fields
  // (e.g., completed_at, position adjustments)
  // Import converters dynamically to avoid circular deps
  const { toLocalItem, toLocalList, toLocalLabel, toLocalSavedView } = await import("./db");

  switch (entity) {
    case "item":
      await db.items.update(entityId, toLocalItem(serverData as never));
      break;
    case "list":
      await db.lists.update(entityId, toLocalList(serverData as never));
      break;
    case "label":
      await db.labels.update(entityId, toLocalLabel(serverData as never));
      break;
    case "savedView":
      await db.savedViews.update(entityId, toLocalSavedView(serverData as never));
      break;
  }
}

async function reconcileConflict(
  entity: string,
  entityId: string,
  serverData: Record<string, unknown>
): Promise<void> {
  // Server version wins — overwrite local Dexie
  await reconcileSuccess(entity, entityId, serverData);

  // Also update Zustand directly so the UI reflects the server state immediately
  switch (entity) {
    case "item": {
      const { useItemStore } = await import("@/stores/item-store");
      useItemStore.setState((state) => ({
        items: state.items.map((i) => i.id === entityId ? { ...i, ...serverData } as typeof i : i),
      }));
      break;
    }
    case "list": {
      const { useListStore } = await import("@/stores/list-store");
      useListStore.setState((state) => ({
        lists: state.lists.map((l) => l.id === entityId ? { ...l, ...serverData } as typeof l : l),
      }));
      break;
    }
  }
}
```

- [ ] **Step 5: Implement `syncAttachmentUpload()` stub**

```typescript
async function syncAttachmentUpload(entry: SyncQueueEntry): Promise<void> {
  const pending = await db.pendingAttachments.get(entry.entityId);
  if (!pending) {
    // Blob was deleted (user deleted attachment before sync) — skip
    return;
  }

  // Step 1: Upload blob to Supabase Storage
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const path = `${entry.data.item_id}/${entry.entityId}/${pending.fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(path, pending.blob, { contentType: pending.mimeType });

  if (uploadError) {
    throw Object.assign(new Error(uploadError.message), { status: 500 });
  }

  // Step 2: Get public URL
  const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);

  // Step 3: POST metadata to API
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
    throw Object.assign(new Error(`Attachment metadata POST failed: ${res.status}`), { status: res.status });
  }

  // Step 4: Clean up blob and update metadata
  await db.pendingAttachments.delete(entry.entityId);
  await db.attachmentMeta.update(entry.entityId, { url: urlData.publicUrl });
}
```

- [ ] **Step 6: Implement `startSyncListener()` with all triggers**

```typescript
let syncStarted = false;

export function startSyncListener(): () => void {
  if (syncStarted) return () => {};
  syncStarted = true;

  // Initialize sync counts
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

  // Attempt initial sync
  if (navigator.onLine) processQueue();

  return () => {
    if (syncInterval) clearInterval(syncInterval);
    window.removeEventListener("online", onlineHandler);
    document.removeEventListener("visibilitychange", visibilityHandler);
    syncStarted = false;
  };
}
```

- [ ] **Step 7: Verify build**

Run: `pnpm --filter web build`

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/sync.ts
git commit -m "feat: rewrite sync engine — queue processing, backoff, conflict resolution, attachment uploads"
```

---

## Chunk 4: Store Rewrites

### Task 8: Rewrite item store to be fully optimistic

**Files:**
- Rewrite: `apps/web/src/stores/item-store.ts`

- [ ] **Step 1: Rewrite `createItem` to be optimistic**

Replace the current implementation that does `await fetch(...)` with:
1. `generateId()` for the UUID
2. Construct full local `Item` with defaults
3. Update Zustand immediately
4. Call `mutateLocal()` to persist to Dexie + queue sync
5. If `label_ids` provided, also write to `db.itemLabels`

- [ ] **Step 2: Rewrite `updateItem` to be optimistic**

Replace `await fetch(...)` with:
1. Update Zustand immediately (merge update data into existing item)
2. Update Dexie + queue sync via `mutateLocal()`

- [ ] **Step 3: Rewrite `toggleComplete` — remove revert logic**

Keep the optimistic Zustand update. Add `mutateLocal()` call for Dexie + sync. Remove the `fetch()` call and revert-on-failure logic entirely.

- [ ] **Step 4: Rewrite `deleteItem` to be optimistic**

Replace `await fetch(...)` + conditional removal with:
1. Remove from Zustand immediately
2. Remove from Dexie + queue sync via `mutateLocal()`

- [ ] **Step 5: Rewrite `reorderItems` — remove revert logic**

Keep the optimistic Zustand update. Add `mutateLocal()` with operation `"reorder"`, using `listId` as the `entityId` (so reorder deduplication works per-list). The `data` field should contain `{ list_id: listId, orderedIds }`. Remove the `fetch()` call and revert logic.

- [ ] **Step 6: Rewrite `moveItem` to be optimistic**

Replace `await fetch(...)` with:
1. Update `list_id` in Zustand immediately
2. Update Dexie + queue sync via `mutateLocal()` with operation `"move"`

- [ ] **Step 7: Verify build**

Run: `pnpm --filter web build`

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/stores/item-store.ts
git commit -m "feat: rewrite item store — all mutations optimistic via mutateLocal"
```

---

### Task 9: Rewrite list store to be fully optimistic

**Files:**
- Rewrite: `apps/web/src/stores/list-store.ts`

- [ ] **Step 1: Rewrite `createList` to be optimistic**

Generate UUID, construct local `List` with defaults, update Zustand + Dexie + queue sync.

- [ ] **Step 2: Rewrite `updateList` to be optimistic**

Update Zustand immediately, then `mutateLocal()`.

- [ ] **Step 3: Rewrite `deleteList` to be optimistic**

Remove from Zustand + Dexie immediately. Queue sync. Also scan syncQueue for pending child item entries and remove them (cascade dedup).

- [ ] **Step 4: Rewrite `reorderLists` — remove revert logic**

Keep optimistic Zustand update, add `mutateLocal()` with `"reorder"` operation, using `"lists"` as the `entityId` (sentinel for list reorder dedup). The `data` field should contain `{ orderedIds }`. Remove revert.

- [ ] **Step 5: Verify build and commit**

```bash
git add apps/web/src/stores/list-store.ts
git commit -m "feat: rewrite list store — all mutations optimistic via mutateLocal"
```

---

### Task 10: Rewrite label store with Dexie caching + optimistic mutations

**Files:**
- Rewrite: `apps/web/src/stores/label-store.ts`

- [ ] **Step 1: Add stale-while-revalidate to `fetchLabels`**

Same pattern as list/item stores: read from Dexie first, then revalidate from network. Use `db.labels` table.

- [ ] **Step 2: Update auto-seeding to use `mutateLocal()`**

Replace the server-call seeding loop with local-first seeding: generate UUIDs for each default label, write to Zustand + Dexie, queue sync.

- [ ] **Step 3: Rewrite `createLabel` and `deleteLabel` to be optimistic**

Same pattern: Zustand + `mutateLocal()`.

- [ ] **Step 4: Verify build and commit**

```bash
git add apps/web/src/stores/label-store.ts
git commit -m "feat: rewrite label store — Dexie cache + optimistic mutations + offline-first seeding"
```

---

### Task 11: Rewrite view store with Dexie caching + optimistic mutations

**Files:**
- Rewrite: `apps/web/src/stores/view-store.ts`

- [ ] **Step 1: Add stale-while-revalidate to `fetchSavedViews`**

Read from `db.savedViews` first, then revalidate from network.

- [ ] **Step 2: Rewrite `createSavedView`, `updateSavedView`, `deleteSavedView` to be optimistic**

Same pattern: Zustand + `mutateLocal()`.

- [ ] **Step 3: Verify build and commit**

```bash
git add apps/web/src/stores/view-store.ts
git commit -m "feat: rewrite view store — Dexie cache + optimistic mutations"
```

---

### Task 12: Rewrite attachment store with blob storage + optimistic mutations

**Files:**
- Rewrite: `apps/web/src/stores/attachment-store.ts`

- [ ] **Step 1: Add Dexie caching to `fetchAttachments`**

Read from `db.attachmentMeta` first, then revalidate from network.

- [ ] **Step 2: Rewrite `addAttachment` for offline blob storage**

1. Generate UUID
2. Store metadata in `db.attachmentMeta` + Zustand (with `url: null`)
3. Convert `File` to `Blob` and store in `db.pendingAttachments`
4. Queue sync via `mutateLocal()` with entity `"attachment"`, operation `"create"`
5. Enforce 25MB file size limit client-side

- [ ] **Step 3: Rewrite `deleteAttachment` to be optimistic**

Remove from Zustand + `db.attachmentMeta`. If there's a pending blob in `db.pendingAttachments`, delete that too. Queue sync.

- [ ] **Step 4: Verify build and commit**

```bash
git add apps/web/src/stores/attachment-store.ts
git commit -m "feat: rewrite attachment store — blob storage + optimistic mutations"
```

---

## Chunk 5: UI & Integration

### Task 13: Create SyncStatus component

**Files:**
- Create: `apps/web/src/components/sync/sync-status.tsx`

- [ ] **Step 1: Create the component**

A small component that subscribes to `useSyncStatusStore` and renders:
- Green dot + "Synced" when `pendingCount === 0 && failedCount === 0`
- Spinner + "Syncing..." when `isSyncing`
- Orange dot + count when `pendingCount > 0`
- Red dot + "Sync issue" when `failedCount > 0`

For the error state, clicking opens a popover (or simple dropdown) listing failed entries with Retry/Discard buttons.

Use existing UI patterns from the codebase (e.g., `Button`, `cn()` for className merging, lucide icons like `Cloud`, `CloudOff`, `Loader2`, `Check`).

- [ ] **Step 2: Verify build and commit**

```bash
git add apps/web/src/components/sync/sync-status.tsx
git commit -m "feat: create SyncStatus component for offline-first sync indicator"
```

---

### Task 14: Add SyncStatus to sidebar and bottom nav

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`
- Modify: `apps/web/src/components/layout/bottom-nav.tsx`

- [ ] **Step 1: Add SyncStatus to sidebar footer**

In `sidebar.tsx`, import `SyncStatus` and add it to the footer section (next to the user email area). It should appear between the email and the collapse button.

- [ ] **Step 2: Add SyncStatus to bottom nav**

In `bottom-nav.tsx`, add a small `SyncStatus` indicator. This can be a compact version (just the dot, no text) placed near the top-right of the nav bar.

- [ ] **Step 3: Verify build and commit**

```bash
git add apps/web/src/components/layout/sidebar.tsx apps/web/src/components/layout/bottom-nav.tsx
git commit -m "feat: add SyncStatus indicator to sidebar and mobile nav"
```

---

### Task 15: Update SyncProvider with new triggers

**Files:**
- Modify: `apps/web/src/components/providers/sync-provider.tsx`

- [ ] **Step 1: Update SyncProvider**

The `startSyncListener()` function already handles the new triggers (visibility change, online event, 30s poll) from the sync engine rewrite. The SyncProvider just needs to also initialize sync status counts on mount. Add a call to `useSyncStatusStore.getState().refreshCounts()`.

- [ ] **Step 2: Verify build and commit**

```bash
git add apps/web/src/components/providers/sync-provider.tsx
git commit -m "feat: update SyncProvider to initialize sync status counts"
```

---

### Task 16: Add offline messaging to network-dependent views

**Files:**
- Modify: `apps/web/src/components/today/today-view.tsx` (schedule section)
- Modify: Chat page component (wherever the chat view lives)
- Modify: Reports page component

- [ ] **Step 1: Add offline check to chat/schedule/reports views**

In components that depend on network (chat, AI schedule, reports), add a check at the top:

```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);
useEffect(() => {
  const on = () => setIsOnline(true);
  const off = () => setIsOnline(false);
  window.addEventListener("online", on);
  window.addEventListener("offline", off);
  return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
}, []);
```

When `!isOnline`, show a message: "You're offline. This feature will be available when you reconnect." instead of the normal content.

- [ ] **Step 2: Verify build and commit**

```bash
git commit -m "feat: add offline messaging to network-dependent views (chat, schedule, reports)"
```

---

### Task 17: Final verification

- [ ] **Step 1: Full build check**

Run: `pnpm turbo build`
Expected: All packages (shared, web) build successfully.

- [ ] **Step 2: Type check**

Run: `pnpm turbo lint`
Expected: No type errors.

- [ ] **Step 3: Final commit**

If any lint/type fixes were needed, commit them:
```bash
git commit -m "fix: resolve type errors from offline-first integration"
```
