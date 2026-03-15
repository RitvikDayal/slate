# Offline-First Architecture — Design Spec

**Date:** 2026-03-15
**Status:** Approved
**Scope:** Full offline-first for all entities (items, lists, labels, saved views, attachments)

---

## Problem

The app has offline infrastructure (Dexie IndexedDB, sync queue, SyncProvider) but it's half-wired. The sync queue is never called from any store. Only 3 of ~15 mutation operations are optimistic. Every create, update, and delete blocks on the server response. Users experience:

- Lag on every action (waiting for server round-trip)
- Errors when offline (mutations throw instead of queuing)
- Data loss risk (offline edits are not persisted)

## Goal

Dexie as the source of truth, server as a sync target. Every mutation writes to IndexedDB first, updates the UI immediately, then queues a background sync. The server is never in the critical path. Users can do anything offline — create, edit, delete, reorder, attach files — and it all syncs when connectivity returns.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Conflict resolution | Last-write-wins (by `updated_at`) | Single-user app; low conflict risk. Same strategy as Superlist/Todoist. |
| Sync status visibility | Minimal indicator (green/orange/red dot + count) | Gives confidence without being noisy. |
| Attachment offline support | Full — store blobs in IndexedDB, upload on sync | User requested; 25MB per-file cap keeps storage reasonable. |
| ID generation | Client-side `crypto.randomUUID()` | Eliminates server dependency for creates. Supabase UUID columns accept client-provided IDs. |

---

## 1. Dexie Schema Changes

Bump from version 1 to version 2. Existing tables preserved, new tables added.

### New Tables

**`savedViews`** — Cache for saved view store (currently has no Dexie caching).
```
savedViews: "id, userId, updatedAt"
```
Fields: `id`, `userId`, `name`, `icon`, `filters` (JSON), `sort`, `isPinned`, `position`, `updatedAt`.

**`attachmentMeta`** — Metadata cache for attachments (not the file content).
```
attachmentMeta: "id, itemId, createdAt"
```
Fields: `id`, `itemId`, `fileName`, `mimeType`, `size`, `url` (null until synced), `createdAt`.

**`pendingAttachments`** — Blob storage for files queued for upload.
```
pendingAttachments: "id, itemId, status, createdAt"
```
Fields: `id`, `itemId`, `fileName`, `mimeType`, `size`, `blob` (File object), `status` ("pending" | "uploading" | "failed"), `createdAt`, `retryCount`.

### Enhanced Table

**`syncQueue`** — Add retry/backoff metadata.
```
syncQueue: "++id, entity, entityId, operation, status, timestamp, nextRetryAt"
```
New fields: `status` ("pending" | "processing" | "failed"), `retryCount` (default 0), `nextRetryAt` (ISO string, for backoff scheduling), `error` (last error message, nullable).

### New Conversion Helpers

- `toLocalLabel()` / `fromLocalLabel()` — for label caching
- `toLocalSavedView()` / `fromLocalSavedView()` — for saved view caching

### Migration

Dexie handles version bumps automatically. Existing v1 data is preserved. New tables/indexes are added. The enhanced `syncQueue` gains new columns with defaults (status = "pending", retryCount = 0).

---

## 2. Optimistic Mutation Layer

**New file:** `apps/web/src/lib/offline-mutation.ts`

### `mutateLocal()`

The core function every store uses for writes:

```typescript
async function mutateLocal<T>({
  entity: "item" | "list" | "label" | "itemLabel" | "savedView" | "attachment",
  operation: "create" | "update" | "delete",
  entityId: string,
  data: Record<string, unknown>,
  dexieWrite: () => Promise<void>,
}): Promise<void>
```

Execution order:
1. Call `dexieWrite()` — write to Dexie (source of truth)
2. Add entry to `syncQueue` with status "pending" (with deduplication — see below)
3. Call `scheduleSyncFlush()` to trigger background sync

Never throws. Mutations always succeed locally.

### `generateId()`

Wrapper around `crypto.randomUUID()`. All entity IDs are generated client-side.

### `scheduleSyncFlush()`

Debounced (300ms) trigger for `processQueue()`. Batches rapid mutations (e.g., drag-reordering 10 items) into fewer sync cycles.

### Queue Deduplication

Before adding to the queue, check for existing pending entries for the same `entityId`:

- **Update after update:** Merge `data` fields into the existing entry.
- **Update after create:** Merge into the create entry (server only needs the final state).
- **Delete after create (never synced):** Remove both — the entity never existed on the server.
- **Delete after update:** Remove the update, keep the delete.

### Store Usage Pattern

```typescript
// Example: createItem
createItem: async (data) => {
  const id = generateId();
  const now = new Date().toISOString();
  const item = {
    ...defaults,
    ...data,
    id,
    created_at: now,
    updated_at: now,
    position: get().items.length,
  };

  // 1. Update Zustand (instant UI)
  set((state) => ({ items: [...state.items, item] }));

  // 2. Persist locally + queue sync
  await mutateLocal({
    entity: "item",
    operation: "create",
    entityId: id,
    data: toApiPayload(item),
    dexieWrite: () => db.items.put(toLocalItem(item)),
  });
}
```

No `fetch()`, no `await server`, no error throwing.

---

## 3. Sync Engine

**File:** `apps/web/src/lib/sync.ts` — complete rewrite.

### `processQueue()`

Core loop:

1. Acquire in-memory lock (boolean flag). If already running, no-op.
2. Query `syncQueue` where `status = "pending"` OR (`status = "failed"` AND `nextRetryAt <= now`), ordered by `timestamp` ASC.
3. Update `sync-status-store`: `isSyncing = true`.
4. Process entries sequentially (ordering preserves dependencies):

**Per-entry processing:**

- Set entry status to "processing"
- Before processing, check for valid auth session. If expired, attempt `supabase.auth.refreshSession()`. If refresh fails, pause queue and surface "Sign in to sync" in the sync status UI.
- Call the appropriate API endpoint:
  - `item` → `/api/items` (POST/PATCH/DELETE)
  - `list` → `/api/lists` (POST/PATCH/DELETE)
  - `label` → `/api/labels` (POST/DELETE)
  - `itemLabel` → `/api/items/{id}/labels` (POST/DELETE)
  - `savedView` → `/api/saved-views` (POST/PATCH/DELETE)
  - `attachment` → `/api/items/{id}/attachments` (POST/DELETE) — with FormData for creates

**On success:**
- Delete entry from `syncQueue`
- For creates/updates: update Dexie with server response (captures server-computed fields like `completed_at`, position adjustments)
- For attachment creates: delete blob from `pendingAttachments`
- Update `sync-status-store` counts

**On 409 / conflict:**
- Compare `updated_at` timestamps
- Server newer → fetch server version, overwrite Dexie + Zustand state (last-write-wins)
- Delete queue entry
- Continue processing

**On 4xx (client error, not 409):**
- Increment `retryCount`, set status to "failed"
- If `retryCount >= 5`: leave as permanently failed, skip, continue processing next entry
- If `retryCount < 5`: set `nextRetryAt` with backoff, skip, continue

**On 5xx or network error:**
- Increment `retryCount`, set status to "failed"
- Set `nextRetryAt` with exponential backoff
- **Stop processing** (server is likely down)

5. Release lock. Update `sync-status-store`: `isSyncing = false`, update counts.

### Exponential Backoff

`nextRetryAt = now + min(2^retryCount * 1000, 60000)ms`

Schedule: 1s → 2s → 4s → 8s → 16s → 32s → 60s cap.

### Sync Triggers

| Trigger | Behavior |
|---------|----------|
| `scheduleSyncFlush()` | Debounced 300ms after any `mutateLocal()` call |
| `online` event | Immediate `processQueue()` |
| 30s interval | If `navigator.onLine`, attempt `processQueue()` |
| `visibilitychange` | When tab becomes visible, attempt `processQueue()` |

### Entity Ordering in Sync

Queue processes in timestamp order, which naturally handles dependencies (list created before items in that list). For cascading deletes: when a list delete is queued, scan the queue for pending creates/updates referencing that `list_id` and remove them. Server cascade delete handles already-synced items.

---

## 4. Store Rewrites

All mutations become optimistic via `mutateLocal()`. Revert logic is removed.

### Item Store

| Operation | Change |
|-----------|--------|
| `fetchItemsByList` | No change (stale-while-revalidate already implemented) |
| `fetchTodayItems` | No change |
| `fetchUpcomingItems` | No change |
| `createItem` | Generate UUID, update Zustand + Dexie, queue sync. Return local item. |
| `updateItem` | Update Zustand + Dexie immediately, queue sync |
| `toggleComplete` | Keep optimistic UI, add Dexie write + queue sync, remove revert logic |
| `deleteItem` | Remove from Zustand + Dexie immediately, queue sync |
| `reorderItems` | Keep optimistic UI, add Dexie writes + queue sync, remove revert logic |
| `moveItem` | Update `list_id` in Zustand + Dexie, queue sync |

`createItem` currently returns the server-created `Item`. With offline-first, it returns a locally-constructed `Item` with client UUID and sensible defaults (`created_at = now`, `updated_at = now`, `position = items.length`). Callers already use the returned object — the interface stays the same.

### List Store

| Operation | Change |
|-----------|--------|
| `fetchLists` | No change |
| `createList` | Generate UUID, Zustand + Dexie, queue sync |
| `updateList` | Zustand + Dexie, queue sync |
| `deleteList` | Zustand + Dexie, queue sync. Dedup: remove pending child item entries from queue. |
| `reorderLists` | Keep optimistic, add Dexie + queue sync, remove revert |

### Label Store

| Operation | Change |
|-----------|--------|
| `fetchLabels` | Add stale-while-revalidate with Dexie (currently no caching) |
| `createLabel` | Generate UUID, Zustand + Dexie, queue sync |
| `deleteLabel` | Zustand + Dexie, queue sync |

### View Store

| Operation | Change |
|-----------|--------|
| `fetchSavedViews` | Add stale-while-revalidate with new `savedViews` Dexie table |
| `createSavedView` | Generate UUID, Zustand + Dexie, queue sync |
| `updateSavedView` | Zustand + Dexie, queue sync |
| `deleteSavedView` | Zustand + Dexie, queue sync |

### Attachment Store

| Operation | Change |
|-----------|--------|
| `fetchAttachments` | Add Dexie cache via `attachmentMeta` table |
| `addAttachment` | Store blob in `pendingAttachments`, metadata in Zustand + Dexie, queue upload |
| `deleteAttachment` | Remove from Zustand + Dexie, queue sync. If pending upload, cancel it. |

---

## 5. Attachment Handling

### Upload Flow

1. User picks file
2. Client generates UUID, stores:
   - Metadata → `attachmentMeta` Dexie table + Zustand
   - Blob → `pendingAttachments` Dexie table
3. Attachment appears in UI immediately (with "uploading" indicator)
4. Sync engine uploads via `FormData` POST to `/api/items/{id}/attachments`
5. On success: delete blob from `pendingAttachments`, update metadata `url` field with server URL
6. On failure: exponential backoff, same as other queue entries

### Local Display

Pending attachments are viewable via `URL.createObjectURL(blob)` from the stored Dexie blob. Once synced, swap to the server URL. User never notices the difference.

### Constraints

- **25MB** max per file (enforced client-side before storing)
- Blobs deleted from IndexedDB immediately after successful upload
- `QuotaExceededError` caught — falls back to direct server upload with toast: "Storage full — saving directly to server"

### Delete While Pending

If user deletes an attachment that hasn't synced: remove from `pendingAttachments` + `attachmentMeta` + Zustand. Queue deduplication removes the pending create entry.

---

## 6. Sync Status UI

### Component: `SyncStatus`

**Locations:**
- Desktop: sidebar footer (next to user email)
- Mobile: small indicator in bottom nav area

### States

| State | Visual | Condition |
|-------|--------|-----------|
| Synced | Green dot + "Synced" (desktop) | 0 pending/failed entries |
| Syncing | Spinner + "Syncing..." | `processQueue()` actively running |
| Pending | Orange dot + count | Entries queued but not processing (offline / between retries) |
| Error | Red dot + "Sync issue" | Any entry with `retryCount >= 5` |

### Sync Status Store

**New file:** `apps/web/src/stores/sync-status-store.ts`

```typescript
interface SyncStatusStore {
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  setPending: (count: number) => void;
  setFailed: (count: number) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSynced: (date: Date) => void;
}
```

Updated by the sync engine as it processes. Initialized on app load by querying `db.syncQueue`.

### Error Popover

Clicking the red error indicator opens a popover listing failed operations (e.g., "Create task 'Buy groceries' — failed 5 times"). Per-item actions:
- **Retry** — reset `retryCount` to 0, set status to "pending"
- **Discard** — delete from queue, revert local Dexie state

### Notifications

- No toasts for normal sync activity
- Toast after 2+ minutes of continuous failure: "Changes saved locally. Will sync when connection is restored."

---

## 7. Error Handling & Edge Cases

### Auth Expiration

Before processing queue, check session validity. If expired, attempt `supabase.auth.refreshSession()`. If refresh fails, pause queue (don't lose entries), surface "Sign in to sync" in status UI. Local usage continues unblocked.

### Entity Ordering

Queue processes in timestamp order (natural dependency ordering). Cascading deletes: when a list/item delete is queued, scan queue for dependent pending entries (child items, labels on that item) and remove them.

### Stale Cache After Long Offline

On reconnect: first flush sync queue (push local changes to server), then the existing stale-while-revalidate fetch pattern revalidates from server (overwrites Dexie, bringing state up to date).

### Multiple Tabs

Dexie is shared across tabs, Zustand is per-tab. Tab A's creates are invisible to tab B until refetch. Acceptable for V1 — cross-tab sync via `BroadcastChannel` or Dexie `liveQuery` is a future enhancement.

### Storage Quota

Catch `QuotaExceededError` in `mutateLocal()`. Fall back to direct server call for that operation. Show toast: "Storage full — saving directly to server."

### Duplicate Sync Prevention

`processQueue()` uses an in-memory lock (boolean). If already running, new invocations no-op. Per-entry `status: "processing"` flag prevents double-processing.

---

## Files Summary

| Action | File | Description |
|--------|------|-------------|
| Create | `apps/web/src/lib/offline-mutation.ts` | `mutateLocal()`, `generateId()`, `scheduleSyncFlush()` |
| Rewrite | `apps/web/src/lib/sync.ts` | Sync engine: queue processing, backoff, conflict resolution, attachment uploads |
| Modify | `apps/web/src/lib/db.ts` | v2 schema: new tables, enhanced syncQueue, new conversion helpers |
| Rewrite | `apps/web/src/stores/item-store.ts` | All mutations optimistic via `mutateLocal()` |
| Rewrite | `apps/web/src/stores/list-store.ts` | All mutations optimistic via `mutateLocal()` |
| Rewrite | `apps/web/src/stores/label-store.ts` | Add Dexie cache + optimistic mutations |
| Rewrite | `apps/web/src/stores/view-store.ts` | Add Dexie cache + optimistic mutations |
| Rewrite | `apps/web/src/stores/attachment-store.ts` | Blob storage + optimistic mutations |
| Create | `apps/web/src/stores/sync-status-store.ts` | Sync status state for UI |
| Create | `apps/web/src/components/sync/sync-status.tsx` | Sync indicator component |
| Modify | `apps/web/src/components/layout/sidebar.tsx` | Add `SyncStatus` to footer |
| Modify | `apps/web/src/components/layout/bottom-nav.tsx` | Add `SyncStatus` indicator |
| Modify | `apps/web/src/components/providers/sync-provider.tsx` | Add visibility change trigger, initialize sync status counts |

## Verification

1. `pnpm --filter web build` succeeds
2. Create/edit/delete items, lists, labels, views — all instant, no network wait
3. Toggle airplane mode → create items → reconnect → items sync to server
4. Sync status shows green when synced, orange when pending, spinner when syncing
5. Failed syncs show red indicator with retry/discard options
6. Attachments viewable locally before upload completes
7. Multiple rapid edits deduplicate in sync queue
8. App loads instantly from Dexie cache even when server is unreachable
