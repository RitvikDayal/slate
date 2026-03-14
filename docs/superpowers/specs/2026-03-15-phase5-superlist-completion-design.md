# Phase 5: Superlist Redesign Completion — Design Spec

**Date:** 2026-03-15  
**Status:** Approved  
**Scope:** Full — fixes, power features, AI worker migration, reliability

---

## Background

Phases 1–4 of the AI Todo App are functionally complete: Supabase auth/schema, AI agent (Claude), Google Calendar sync, push notifications, Slack integration, and analytics/reports are all working.

A Phase 5 "Superlist-inspired" data model redesign is in active but incomplete development. The new schema (`lists`, `items`, `labels`, `item_labels`) has been migrated. Stores, API routes, and core UI components have been built. However, significant gaps remain: placeholder buttons, an AI worker that still talks to the old `tasks` table, and offline sync infrastructure that is built but not wired up.

This spec covers all gaps required to make Phase 5 complete and shippable.

---

## Architecture

The app uses a 4-layer architecture:

```
Browser (Next.js 16, React 19)
  ↕ Zustand stores (item-store, list-store, label-store, ui-store)
  ↕ REST API routes (Next.js App Router)
  ↕ Supabase (PostgreSQL + RLS + Realtime)
Background: BullMQ worker (Node.js) ↕ Supabase (service_role)
Offline: Dexie (IndexedDB) ↕ Sync queue → REST API
```

The new data model centers on:
- `lists` — hierarchical containers (supports `parent_list_id`), one special Inbox per user
- `items` — unified task/note/heading with `type`, `content_json`, `priority`, `effort`, `due_date`, `due_time`, `recurrence_rule`, `scheduled_*`, `parent_item_id`, `source`, `ai_notes`
- `labels` — user-defined colored tags
- `item_labels` — M:M junction

---

## Approach: 4 Parallel Tracks

Work is organized into 4 independent tracks ordered internally by user journey priority. Tracks have no hard cross-dependencies and can be executed by parallel agents.

---

## Track 1: Core UX Fixes

These are broken or missing interactions that block the app from being usable. Fix in this order.

### 1.1 Wire QuickAdd Date Picker

**File:** `apps/web/src/components/tasks/quick-add.tsx`

The `CalendarDays` button in the expanded toolbar renders but has no `onClick`. The `DatePicker` component (`components/date/date-picker.tsx`) exists and is complete.

- Add a `datePickerOpen` boolean state
- Wrap the button and `DatePicker` in a relative-positioned container with a popover
- The selected date from `DatePicker` should override any chrono-node parsed date
- Display the selected date as a badge (same as the existing chrono parse badge), with a clear `×` button

### 1.2 Wire QuickAdd List Selector

**File:** `apps/web/src/components/tasks/quick-add.tsx`

The `FolderOpen` button is a visual placeholder — no `onClick` wired.

- Add a `selectedListId` internal state (initialized from the `listId` prop)
- On click, render a small popover dropdown listing all user lists (from `useListStore`)
- Selecting a list updates `selectedListId` state (does not change the prop)
- Use `selectedListId` (not the prop directly) when calling `createItem`
- Show the selected list name as a small badge next to the folder icon

### 1.3 Sidebar "New List" Handler

**File:** `apps/web/src/components/layout/sidebar.tsx`

The "New List" button has no click handler.

- On click, insert an inline text input below the last list item in the sidebar
- Auto-focus the input
- On Enter or blur (with non-empty value), call `listStore.createList({ name })` and navigate to the new list
- On Escape or blur (with empty value), cancel and remove the input

### 1.4 Fix Command Palette Navigation

**File:** `apps/web/src/components/search/command-palette.tsx`

List navigation uses `window.location.href` which causes a full page reload.

- Import `useRouter` from `next/navigation`
- Replace `window.location.href = ...` with `router.push(...)`

---

## Track 2: Power Features

These features turn the app from functional into a pro-grade tool. Ordered by when a user encounters them in their workflow.

**Note:** `app-shell.tsx` is owned by Track 2 (2.6 registers shortcuts there). No Track 1 items touch this file.

### 2.1 Label Management UI

**Files:** `apps/web/src/components/settings/settings-view.tsx`, `apps/web/src/components/tasks/quick-add.tsx`, `apps/web/src/components/tasks/task-detail.tsx`

The `label-store` is complete. There is no UI to create, edit, or assign labels.

**Settings:**
- Add a "Labels" section to `settings-view.tsx`
- List all user labels with their color swatch and name
- "Add label" inline form: name text input + color picker (8–10 preset swatches)
- Delete button per label (with confirmation if label has items)

**QuickAdd:**
- Add a label selector button to the expanded toolbar (tag icon)
- Opens a popover with a searchable list of existing labels
- Selected labels shown as colored pills in the input area

**TaskDetail:**
- The existing labels display section becomes interactive
- Click "+ Add label" to open a label selector popover
- Click an existing label pill to remove it
- All label changes call `updateItem` and sync `item_labels` through the API

### 2.2 Sub-items / Subtasks

**Files:** `apps/web/src/components/tasks/task-list.tsx`, `apps/web/src/components/tasks/task-item.tsx`, `apps/web/src/components/tasks/task-detail.tsx`

`TaskList` currently filters to `parent_item_id === null` only. `getItemsByParent` in the store is implemented but unused.

**TaskList:**
- Remove the top-level-only filter
- `TaskItem` receives a `depth` prop (default 0); when `depth > 0`, render with left indent (`depth * 16px`)
- `TaskItem` shows a disclosure chevron when its item has children; clicking toggles a `childrenVisible` state
- When `childrenVisible`, render a nested `TaskList` for `getItemsByParent(item.id)` with `depth + 1`

**TaskDetail:**
- Add a "Subtasks" section below the main body
- Inline quick-add input for creating a child item (`parent_item_id` set to current item's id)
- Renders child items as a compact `TaskList` (no further nesting in the detail panel — max 1 level deep in the panel)

### 2.3 Drag-and-Drop Reordering

**Files:** `apps/web/src/components/tasks/task-list.tsx`, `apps/web/src/components/layout/sidebar.tsx`

`@dnd-kit/core`, `@dnd-kit/sortable`, and `fractional-indexing` are installed but unused.

**Task list reordering:**
- Wrap `TaskList` in `DndContext` + `SortableContext` from `@dnd-kit`
- Each `TaskItem` uses `useSortable`; dragging renders a drag handle on hover (grip icon, appears on row hover)
- On drag end, collect the new ordered array of item IDs and call `itemStore.reorderItems(listId, orderedIds)`
- The `reorderItems` store method and `POST /api/items/reorder` route accept an ordered ID array and compute new position values server-side — `fractional-indexing` is used inside the API route, not on the client
- Add optimistic reorder in the store: snapshot current order before calling the API; on API failure, revert to the snapshot (this revert logic needs to be written — it is **not** currently in the store)

**Sidebar list reordering:**
- Same pattern for the user lists section in the sidebar
- On drag end, call `listStore.reorderLists(orderedIds)`
- Same optimistic-with-revert pattern

### 2.4 Rich Editor Toolbar

**File:** `apps/web/src/components/editor/rich-editor.tsx`

The Tiptap editor has no visible toolbar. Formatting requires slash commands or keyboard shortcuts only.

- Import `BubbleMenu` from `@tiptap/react` (already installed — no new dependency needed)
- Add a `BubbleMenu` that appears on text selection
- Toolbar buttons: Bold, Italic, Strike, Inline Code, Link, H1, H2, Bullet list, Ordered list
- Use `editor.isActive()` for active state styling
- Keep the editor area clean when nothing is selected (BubbleMenu is hidden automatically)

### 2.5 Time Picker

**File:** `apps/web/src/components/date/date-picker.tsx`

The date picker has no time input despite `due_time` existing in the schema.

- Add an optional `showTime` boolean prop to `DatePicker`
- When `showTime` is true, render a time row below the date calendar with hour/minute dropdowns (`00–23` hours, `00`, `15`, `30`, `45` minutes)
- `onChange` callback receives both `date` and `time` values
- `TaskDetail` passes `showTime` to the `DatePicker` and syncs `due_time` on the item

### 2.6 Keyboard Shortcuts

**Files:** `apps/web/src/lib/shortcuts.ts`, `apps/web/src/components/layout/app-shell.tsx`

`shortcuts.ts` provides `registerShortcut` / `initShortcuts` infrastructure. No shortcuts are currently registered.

**Fix `shiftMatch` bug first:** The current logic `shortcut.shift ? e.shiftKey : !e.shiftKey` actively rejects shifted keypresses for shortcuts that don't declare `shift: true`. Change to: `shortcut.shift ? e.shiftKey : true` so non-shift-declared shortcuts work regardless of shift state.

**Register in `app-shell.tsx`:**
- `N` — focus QuickAdd in the current view (dispatch a custom event or use a ref)
- `⌘K` — open command palette
- `E` — open detail panel for the selected item (from `useUIStore.selectedItemId`)
- `Escape` — close detail panel / command palette
- `⌘,` — open settings

---

## Track 3: AI Worker Migration

Updates the BullMQ worker and chat API so Claude operates on the new `items`/`lists` model.

### 3.1 Regenerate Supabase Types

**File:** `packages/shared/src/types/supabase.ts`

Run `supabase gen types typescript --local > packages/shared/src/types/supabase.ts` after applying the new migration. This gives the worker and web app accurate TypeScript types for the new tables.

### 3.2 Migrate Worker AI Tools

**Files:** `apps/worker/src/ai/tool-definitions.ts`, `apps/worker/src/ai/tool-handlers.ts`

Current tools reference the old `tasks` table.

**Replace:**
- `create_task` → `create_item` (params: `list_id`, `title`, `type`, `priority`, `due_date`, `due_time`, `effort`)
- `update_task` → `update_item` (params: `item_id` + any updatable fields)
- `list_tasks` → `list_items` (params: `list_id?`, `due_date?`, `include_completed?`)
- Add `get_lists` tool — returns the user's lists (name, id, item_count) so Claude can reference them by name

Handlers write to/read from `items` table. Keep the old tool names as deprecated aliases that log a warning and delegate to the new implementations — this prevents breakage if any stored prompt references old tool names.

### 3.3 Update Morning-Plan Job

**File:** `apps/worker/src/jobs/morning-plan.ts`

Currently creates `tasks` rows. After migration:
- Fetch user's lists to find Inbox (or a "Today" list if one exists)
- Create items in the appropriate list with `scheduled_date` = today, `scheduled_start`/`scheduled_end` per the AI-generated schedule
- Set `source: 'ai_suggested'` and `ai_notes` with the AI's reasoning

### 3.4 Update Chat API Tools

**File:** `apps/web/src/app/api/chat/route.ts`

The chat route uses Vercel AI SDK tool definitions. Mirror the same tool updates from 3.2 here so the in-app chat assistant can create/update items and reference lists by name.

### 3.5 Update EOD Report Job

**File:** `apps/worker/src/jobs/eod-report.ts`

Currently queries `tasks`. After migration:
- Query `items` where `user_id = $1`, `completed_at` is today's date
- Group completed items by `list_id` for a per-list summary in the report
- Pass `ai_notes` from items to the report insights generator for richer context

---

## Track 4: Reliability

### 4.1 Fix POST `/api/items` Response

**File:** `apps/web/src/app/api/items/route.ts`

After inserting into `items` and `item_labels`, the route returns the raw `items` row without re-fetching the labels join. The client store receives an item with no `labels` array.

- After the insert, run a second Supabase query: `.from('items').select('*, item_labels(*, labels(*))').eq('id', insertedId).single()`
- Return this complete object so the store hydrates correctly without a second round-trip

### 4.2 Wire Dexie into Item Store

**Files:** `apps/web/src/stores/item-store.ts`, `apps/web/src/lib/db.ts`

`db.ts` defines a complete Dexie schema with `LocalItem`, `LocalList`, `LocalLabel` types. These use camelCase field names (`listId`, `parentItemId`, `isCompleted`, `dueDate`, `contentJson`) while the API `Item` type uses snake_case (`list_id`, `parent_item_id`, `is_completed`, `due_date`, `content_json`).

**Required mapping layer:** Create a `toLocalItem(item: Item): LocalItem` function in `lib/db.ts` that maps snake_case API fields to camelCase local fields (and a symmetric `fromLocalItem` for reads). All Dexie reads/writes must go through this mapping layer.

**Wiring:**
- On `fetchItems`: after API response, bulk-upsert into `db.items` via `toLocalItem`
- On `createItem`: write to `db.items` first (optimistic), then POST to API; on failure, remove the optimistic `db.items` entry
- On `updateItem` / `deleteItem`: same optimistic local-first pattern
- On app init (no network / API error): read from `db.items` via `fromLocalItem` as the initial store state

### 4.3 Wire `sync.ts` and Start Listener

**Files:** `apps/web/src/lib/sync.ts`, `apps/web/src/components/providers/sync-provider.tsx` (new), `apps/web/src/app/layout.tsx`

`startSyncListener()` is implemented but never called. `layout.tsx` is a Server Component and cannot use `useEffect` directly.

- Create `apps/web/src/components/providers/sync-provider.tsx` as a `"use client"` component:
  ```tsx
  "use client";
  import { useEffect } from "react";
  import { startSyncListener } from "@/lib/sync";
  export function SyncProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => { startSyncListener(); }, []);
    return <>{children}</>;
  }
  ```
- Import `SyncProvider` in `apps/web/src/app/layout.tsx` and wrap the app tree with it
- Ensure `startSyncListener` is idempotent — add a module-level `started` flag in `sync.ts` so it only registers listeners once even if called multiple times

### 4.4 Fix `itemLabel` Sync Case and Add Missing API Routes

**Files:** `apps/web/src/lib/sync.ts`, `apps/web/src/app/api/items/[id]/labels/route.ts` (new), `apps/web/src/app/api/items/[id]/labels/[labelId]/route.ts` (new)

The `SyncQueueEntry.entity` type in `db.ts` includes `"itemLabel"` (camelCase), but `syncEntry()` has no case for it. Additionally, the routes needed to sync label assignments don't exist yet.

**New API routes:**
- `POST /api/items/[id]/labels` — body: `{ labelId: string }` — inserts a row into `item_labels`; validates ownership of both item and label via RLS
- `DELETE /api/items/[id]/labels/[labelId]` — deletes the `item_labels` row; validates ownership via RLS

**Sync fix:**
- Add `case "itemLabel":` to `syncEntry()` in `sync.ts`
  - For `create`: call `POST /api/items/[entityId]/labels` with `{ labelId: entry.data.labelId }`
  - For `delete`: call `DELETE /api/items/[entityId]/labels/[entry.data.labelId]`

### 4.5 Error Boundaries

**File:** `apps/web/src/components/providers/view-error-boundary.tsx` (new)

No React error boundaries exist around the main views.

- Create a `ViewErrorBoundary` class component with a `hasError` state flag and a fallback UI (brief message + "Reload" button that calls `window.location.reload()`)
- Wrap `InboxView`, `ListView`, `UpcomingView`, and `TodayView` render in `<ViewErrorBoundary>`

### 4.6 Dead Code Cleanup

- Remove unused `CheckCircle2` import from `apps/web/src/components/layout/sidebar.tsx`
- Either integrate `@tiptap/extension-code-block-lowlight` into `rich-editor.tsx` (add code block support to the editor) or remove it from `package.json`
- Wire `rrule` package into `RecurrencePicker` to parse/display custom RRULE strings (e.g. show a human-readable label for externally-set custom rules), or remove from `package.json` if custom rules are out of scope
- Update `CLAUDE.md` phase status: Phase 2 is complete (not "IN PROGRESS"); add Phase 5 as "IN PROGRESS"
- Add ISO date format regex validation to `due_date` in `createItemSchema`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()`
- Add `recurrence_rule` field to `createItemSchema` (currently only in `updateItemSchema`)

---

## Success Criteria

Phase 5 is complete when:

1. A user can open the app, see their Inbox, capture a task with a due date and label using QuickAdd, and have it appear correctly in Upcoming — all without page reloads or broken buttons
2. Subtasks render indented beneath their parent; the detail panel allows adding subtasks
3. Items and lists can be reordered by dragging
4. The AI assistant (chat + worker) creates and reads `items`/`lists`, not `tasks`
5. The app loads from local Dexie cache when offline and syncs queued changes on reconnect — verified by: opening DevTools → Network → Offline, navigating to the app and confirming items render from cache, then toggling back Online and confirming queued changes drain (check `db.syncQueue` table count drops to 0 in the Dexie DevTools tab)
6. No TypeScript errors (`pnpm turbo lint` passes); no unused imports or dead dependencies

---

## Files Changed (Summary)

### Track 1
- `apps/web/src/components/tasks/quick-add.tsx`
- `apps/web/src/components/layout/sidebar.tsx`
- `apps/web/src/components/search/command-palette.tsx`

### Track 2
- `apps/web/src/components/settings/settings-view.tsx`
- `apps/web/src/components/tasks/quick-add.tsx`
- `apps/web/src/components/tasks/task-detail.tsx`
- `apps/web/src/components/tasks/task-list.tsx`
- `apps/web/src/components/tasks/task-item.tsx`
- `apps/web/src/components/editor/rich-editor.tsx`
- `apps/web/src/components/date/date-picker.tsx`
- `apps/web/src/lib/shortcuts.ts`
- `apps/web/src/components/layout/app-shell.tsx`

### Track 3
- `packages/shared/src/types/supabase.ts`
- `apps/worker/src/ai/tool-definitions.ts`
- `apps/worker/src/ai/tool-handlers.ts`
- `apps/worker/src/jobs/morning-plan.ts`
- `apps/worker/src/jobs/eod-report.ts`
- `apps/web/src/app/api/chat/route.ts`

### Track 4
- `apps/web/src/app/api/items/route.ts`
- `apps/web/src/app/api/items/[id]/labels/route.ts` *(new)*
- `apps/web/src/app/api/items/[id]/labels/[labelId]/route.ts` *(new)*
- `apps/web/src/stores/item-store.ts`
- `apps/web/src/lib/db.ts`
- `apps/web/src/lib/sync.ts`
- `apps/web/src/components/providers/sync-provider.tsx` *(new)*
- `apps/web/src/components/providers/view-error-boundary.tsx` *(new)*
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/layout/sidebar.tsx`
- `apps/web/package.json`
- `packages/shared/src/validation/item.ts`
- `CLAUDE.md`
