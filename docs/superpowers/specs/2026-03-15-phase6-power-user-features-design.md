# Phase 6: Power User Features — Design Spec

**Date:** 2026-03-15
**Status:** Draft
**Prerequisite:** Phase 5 completion (foundation, reliability, worker migration)

## Overview

Phase 6 transforms the app from a capable task manager into a power-user productivity tool. Six feature areas ship in sequence, each independently valuable:

1. Attachments system (files + links + editor enhancements)
2. Drag-and-drop (task reorder, cross-list move, list reorder)
3. AI voice quick capture (in-app speech → structured task)
4. Slack & Gmail one-way capture (pull tasks from external tools)
5. Filters & saved views (presets, then custom builder)

**Prerequisite — Phase 5 Completion:**

Before starting Phase 6, all four Phase 5 tracks must be complete:
- Track 1: Core UX fixes (QuickAdd wiring, New List, DetailPanel animations, command palette)
- Track 2: Power features foundation (labels UI, subtasks UI, DnD, editor toolbar, time picker, keyboard shortcuts)
- Track 3: AI worker migration (Supabase types, worker tools → items, morning plan/EOD jobs, chat tools)
- Track 4: Reliability (API response fixes, Dexie offline-first, sync listener, error boundaries, dead code cleanup)

---

## 1. Attachments System

### Data Model

New `attachments` table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `item_id` | UUID FK | Parent item |
| `user_id` | UUID FK | Owner (for RLS) |
| `type` | enum | `'file'` or `'link'` |
| `name` | text | Display name (filename or link title) |
| `url` | text | Supabase Storage URL (files) or external URL (links) |
| `mime_type` | text | For files (e.g., `image/png`, `application/pdf`) |
| `size_bytes` | integer | For files, enables quota enforcement |
| `thumbnail_url` | text | Auto-generated for images, favicon for links |
| `position` | real | Ordering within a task (fractional indexing) |
| `created_at` | timestamptz | |

RLS: users can only access attachments on their own items.

### File Uploads

- **Storage:** Supabase Storage bucket `attachments`, path: `{user_id}/{item_id}/{filename}`
- **Limits:** 10MB per file, 100MB total per user
- **Supported types:** Images (png/jpg/gif/webp), PDFs, common document formats
- **Upload methods:**
  - Drag-drop onto TaskDetail panel
  - Explicit "Attach" button (paperclip icon) in TaskDetail
  - Drag-drop images into Tiptap editor body → uploads to Storage, inserts inline

### Link Bookmarks

- Paste a URL → stores as link-type attachment
- Auto-parses URL for title (from `<title>` tag or URL path)
- No server-side unfurling/preview initially — stores URL + parsed title

### Editor Enhancements

- **BubbleMenu:** Floating toolbar on text selection — bold, italic, strike, link, code
- **Drag-drop images:** Drop image files into editor → uploads to Storage → inserts as inline image
- **Slash commands:** `/image` (upload prompt), `/link` (URL input), `/heading` (H1–H3), `/todo` (checklist)

### UI — TaskDetail Attachments Section

- Appears below the rich editor
- **Images:** Thumbnail grid (click → lightbox preview)
- **Files:** List rows with icon, name, size (click → download)
- **Links:** List rows with favicon, title, URL (click → open in new tab)
- Delete button (trash icon) on each attachment

### API Routes

- `GET /api/items/[id]/attachments` — list attachments for an item
- `POST /api/items/[id]/attachments` — create (file upload or link)
- `DELETE /api/items/[id]/attachments/[attachmentId]` — delete
- `POST /api/items/[id]/attachments/reorder` — reorder

### Validation (Zod)

- `name`: string, max 255 chars
- `url`: valid URL
- `type`: enum `file | link`
- `mime_type`: optional string
- `size_bytes`: optional positive integer

---

## 2. Drag-and-Drop

Uses existing `@dnd-kit/core` and `fractional-indexing` packages.

### Task Reordering Within a List

- Drag handle (grip icon) on TaskItem — visible on hover (desktop) and always visible (mobile)
- Sortable list with animated reorder via `@dnd-kit/sortable`
- Drop recalculates `position` using fractional indexing (no full reindex)
- Calls existing `reorderItems(listId, orderedIds)` store method

### Move Tasks Between Lists

- Drag a task from main content → drop on a sidebar list item
- Sidebar lists become drop targets with visual highlight
- Calls existing `moveItem(id, { target_list_id, position })` store method

### List Reordering in Sidebar

- Drag lists to reorder in sidebar
- Inbox stays pinned at top (not draggable)
- Calls existing `reorderLists(orderedIds)` store method

### Subtask Reordering

- Drag sub-tasks within parent task's detail view
- Same fractional indexing approach

### Touch Support

- `@dnd-kit` handles touch natively — long press to initiate drag on mobile
- Drag overlay (ghost element) follows finger/cursor
- Minimum 44px touch targets

### No New API Routes

Existing `reorder` and `move` endpoints cover all cases.

---

## 3. AI Voice Quick Capture

### In-App Voice Input (First Milestone)

- **UI:** Mic button in QuickAdd area, next to the text input
- **Technology:** Web Speech API (`SpeechRecognition`) — no external service, works in Chrome/Safari/Edge
- **Flow:**
  1. User taps mic button → recording indicator appears
  2. Real-time transcription displayed in QuickAdd input as user speaks
  3. On speech end, transcript sent to existing chat API with system prompt:
     "Parse this into a task with title, due_date, priority, list, and labels"
  4. AI returns structured task data → `createItem()` called automatically
  5. Brief confirmation toast with parsed result and "Edit" link

- **AI parsing:** Reuses existing chat API tools (`create_item`). No new AI infrastructure.
- **Extraction targets:** title, date/time, priority, list name (fuzzy matched to user's lists), labels
- **Graceful fallback:** If a field can't be parsed, it's left blank — task created with whatever was understood

**Example:**
> "Buy groceries tomorrow, put it in Personal" → title: "Buy groceries", due_date: tomorrow, list: Personal

### System-Level Capture (Later Milestone)

- **iOS/Android:** Siri Shortcut / Android widget hitting `POST /api/items/quick-capture`
- **Endpoint:** Accepts text or pre-transcribed audio, returns created item
- **PWA share target:** Share text/URLs from other apps into the todo app

### Browser Compatibility

- Web Speech API: Chrome, Safari, Edge (good coverage)
- Firefox: not supported — show "Voice not supported in this browser" tooltip, hide mic button
- Feature-detect with `'SpeechRecognition' in window || 'webkitSpeechRecognition' in window`

---

## 4. Slack & Gmail One-Way Capture

### Slack Capture (Extend Existing Infrastructure)

Existing infrastructure: Slack OAuth, message analyzer, suggestion cards, scanner job.

**New behavior:**
- "Save to Inbox" action button on suggestion cards
- Creates item with:
  - `source: 'slack'`
  - `source_ref`: `{ message_id, channel_id, channel_name, timestamp, permalink }`
  - Title extracted from message content
  - Content includes original message text
- Slack icon badge displayed on TaskItem for slack-sourced tasks
- Clicking source badge opens original Slack message (permalink) in new tab

### Gmail Capture (New Integration)

**OAuth:**
- Google OAuth already configured for calendar — add `gmail.readonly` scope
- Incremental consent: prompt for Gmail permission only when user enables Gmail capture in Settings

**Background job — `gmail-scanner`:**
- Runs periodically (configurable interval, default 15 min)
- Scans for user-configured signal:
  - Starred emails
  - Emails with a specific Gmail label (e.g., "Todo")
- Extracts: subject → title, sender + snippet → content, email link → source_ref
- Deduplicates by Gmail message ID in `source_ref`
- Creates item with `source: 'gmail'`

**UI:**
- Gmail icon badge on TaskItem for gmail-sourced tasks
- Clicking source badge opens original email in Gmail (new tab)
- Settings page: toggle Gmail scanning, choose trigger (starred / specific label / off)

### Shared Capture Patterns

- Both sources land items in Inbox by default
- Source badges (Slack/Gmail icons) visible on TaskItem metadata row
- Settings page section for each integration: enable/disable, configure behavior

---

## 5. Filters & Saved Views

### Preset Smart Views (First Milestone)

Built-in views in sidebar under a "Views" section:

| View | Filter Logic |
|------|-------------|
| High Priority | `priority = 'high'` AND `is_completed = false` |
| Due This Week | `due_date` within current Mon–Sun AND `is_completed = false` |
| Overdue | `due_date < today` AND `is_completed = false` |
| No Date | `due_date IS NULL` AND `is_completed = false` |
| Completed | `is_completed = true`, last 30 days |

- Each view is a route: `/views/[slug]`
- Reuses TaskList component with different data source
- API: `GET /api/views/[slug]` with predefined query per slug

### Custom Filter Builder (Second Milestone)

**Data model — new `saved_views` table:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID FK | Owner |
| `name` | text | Display name |
| `icon` | text | Emoji (optional) |
| `color` | text | Hex code (optional) |
| `filters` | JSONB | Array of filter rules |
| `sort_by` | text | Field name + direction (e.g., `due_date:asc`) |
| `is_pinned` | boolean | Pinned views show in sidebar |
| `position` | real | Ordering in sidebar |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

RLS: users can only access their own saved views.

**Filter rule schema:**

```json
[
  { "field": "priority", "op": "eq", "value": "high" },
  { "field": "due_date", "op": "lt", "value": "next_friday" },
  { "field": "labels", "op": "contains", "value": "label-uuid" }
]
```

**Filterable fields:** `priority`, `due_date`, `labels`, `list_id`, `effort`, `is_completed`, `source`, `created_at`

**Operators:** `eq`, `neq`, `lt`, `gt`, `lte`, `gte`, `contains`, `is_empty`, `is_not_empty`

**Relative date values:** `today`, `tomorrow`, `this_week`, `next_week`, `next_friday`, etc. — resolved server-side at query time.

**UI:**
- Filter builder panel — add rules row by row: field → operator → value
- Save button → name the view, optionally pick icon/color
- Pinned views appear in sidebar under "Views" alongside presets
- Context menu on sidebar views: edit, unpin, delete
- Unpinned views accessible from a "All Views" page

### API Routes

- `GET /api/views/[slug]` — preset views (hardcoded query logic)
- `GET /api/saved-views` — list user's custom views
- `POST /api/saved-views` — create
- `PATCH /api/saved-views/[id]` — update
- `DELETE /api/saved-views/[id]` — delete
- `GET /api/saved-views/[id]/items` — execute a saved view's filters, return matching items

---

## Implementation Order

| # | Feature | New Tables | Key Dependencies |
|---|---------|-----------|-----------------|
| 0 | Phase 5 completion | none | — |
| 1 | Attachments | `attachments` | Supabase Storage bucket |
| 2 | Drag-and-drop | none | `@dnd-kit` (installed) |
| 3 | AI voice capture | none | Web Speech API, existing chat tools |
| 4 | Slack & Gmail capture | none (extends items) | Existing Slack infra, Gmail OAuth scope |
| 5 | Filters & saved views | `saved_views` | — |

Each feature is independently shippable. No feature depends on a later feature.

---

## Out of Scope

- Two-way sync with Slack/Gmail (no write-back)
- Unlimited subtask nesting (one level only)
- System-level voice capture (Siri/widgets — later milestone)
- Real-time collaboration / multi-user
- Link preview unfurling / Open Graph scraping
