# Phase 5: Superlist Completion — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all remaining Phase 5 gaps to make the Superlist-inspired app shippable — fix broken UX, wire power features, migrate the AI worker, and add offline reliability.

**Architecture:** 4 independent tracks that can be parallelized. Track 1 fixes broken interactions. Track 2 adds pro-grade features (labels, subtasks, DnD, editor, shortcuts). Track 3 migrates the BullMQ worker from old `tasks` to new `items`. Track 4 adds offline-first storage and error boundaries.

**Tech Stack:** Next.js 16, React 19, Zustand, Tiptap v3, @dnd-kit, Supabase, BullMQ, Claude SDK, Vercel AI SDK

---

## Chunk 1: Track 1 — Core UX Fixes

### Task 1.1: Wire QuickAdd Date Picker

**Files:**
- Modify: `apps/web/src/components/tasks/quick-add.tsx`

- [ ] **Step 1: Add state and import DatePicker**

In `quick-add.tsx`, add `datePickerOpen` state and import the `DatePicker` component:

```tsx
// Add to imports:
import { DatePicker } from "@/components/date/date-picker";

// Add to state (after showPriority):
const [datePickerOpen, setDatePickerOpen] = useState(false);
const [manualDate, setManualDate] = useState<string | null>(null);
```

- [ ] **Step 2: Wire the CalendarDays button to open DatePicker**

Replace the placeholder CalendarDays button (lines 156–162) with:

```tsx
<DatePicker
  value={manualDate ?? parsedDate}
  onChange={(date) => {
    setManualDate(date);
    if (date) setParsedDate(null); // Manual date overrides chrono
  }}
  trigger={
    <span className="inline-flex items-center gap-1">
      <CalendarDays className="h-4 w-4" />
    </span>
  }
/>
```

- [ ] **Step 3: Use manualDate in handleSubmit**

Update the `handleSubmit` function to prefer `manualDate`:

```tsx
due_date: manualDate ?? parsedDate ?? defaultDueDate ?? undefined,
```

And reset `manualDate` after submit:

```tsx
setManualDate(null);
```

- [ ] **Step 4: Show selected date badge when manual date is set**

Next to the existing parsed date badge, show the manual date badge (and add a clear button):

```tsx
{manualDate && (
  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
    {format(new Date(manualDate + "T00:00:00"), "MMM d")}
    <button
      type="button"
      onClick={() => setManualDate(null)}
      className="ml-0.5 text-primary/60 hover:text-primary"
    >
      ×
    </button>
  </span>
)}
```

Hide the chrono-parsed badge when `manualDate` is set.

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

```bash
git add apps/web/src/components/tasks/quick-add.tsx
git commit -m "feat: wire QuickAdd date picker button to DatePicker component"
```

---

### Task 1.2: Wire QuickAdd List Selector

**Files:**
- Modify: `apps/web/src/components/tasks/quick-add.tsx`

- [ ] **Step 1: Add list selector state and import**

```tsx
// Add to imports:
import { useListStore } from "@/stores/list-store";

// Inside component, add:
const lists = useListStore((s) => s.lists);
const [selectedListId, setSelectedListId] = useState(listId);
const [showListPicker, setShowListPicker] = useState(false);
```

- [ ] **Step 2: Replace the FolderOpen placeholder with a popover**

Replace the list selector button (lines 213–219) with:

```tsx
<div className="relative">
  <button
    type="button"
    onClick={() => setShowListPicker(!showListPicker)}
    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
    title="Move to list"
  >
    <FolderOpen className="h-4 w-4" />
  </button>
  <AnimatePresence>
    {showListPicker && (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="absolute bottom-full left-0 mb-1 max-h-48 w-48 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg"
      >
        {lists
          .filter((l) => !l.is_archived)
          .map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setSelectedListId(l.id);
                setShowListPicker(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                selectedListId === l.id && "bg-muted"
              )}
            >
              {l.icon ? (
                <span className="text-sm">{l.icon}</span>
              ) : (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: l.color || "var(--color-muted-foreground)" }}
                />
              )}
              <span className="truncate">{l.title}</span>
            </button>
          ))}
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

- [ ] **Step 3: Use selectedListId in createItem call**

Change `list_id: listId` to `list_id: selectedListId` in `handleSubmit`.

Reset after submit: `setSelectedListId(listId);`

- [ ] **Step 4: Show selected list name badge**

After the list selector, show the selected list name if different from default:

```tsx
{selectedListId !== listId && (
  <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
    {lists.find((l) => l.id === selectedListId)?.title}
  </span>
)}
```

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

```bash
git add apps/web/src/components/tasks/quick-add.tsx
git commit -m "feat: wire QuickAdd list selector popover"
```

---

### Task 1.3: Sidebar "New List" Handler

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add state for inline input**

```tsx
// Add to imports:
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

// Inside component:
const router = useRouter();
const [isCreating, setIsCreating] = useState(false);
const [newListName, setNewListName] = useState("");
const newListInputRef = useRef<HTMLInputElement>(null);
const { lists, fetchLists, createList } = useListStore();
```

- [ ] **Step 2: Add click handler to "New List" button**

```tsx
<button
  type="button"
  onClick={() => {
    setIsCreating(true);
    setTimeout(() => newListInputRef.current?.focus(), 50);
  }}
  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
>
  <Plus className="h-[18px] w-[18px]" />
  <span>New List</span>
</button>
```

- [ ] **Step 3: Add inline input below the button**

After the "New List" button, inside the `{!sidebarCollapsed && (...)}` block:

```tsx
{isCreating && (
  <div className="px-3 py-1">
    <input
      ref={newListInputRef}
      type="text"
      value={newListName}
      onChange={(e) => setNewListName(e.target.value)}
      onKeyDown={async (e) => {
        if (e.key === "Enter" && newListName.trim()) {
          const list = await createList({ title: newListName.trim() });
          setNewListName("");
          setIsCreating(false);
          router.push(`/list/${list.id}`);
        }
        if (e.key === "Escape") {
          setNewListName("");
          setIsCreating(false);
        }
      }}
      onBlur={() => {
        if (!newListName.trim()) {
          setNewListName("");
          setIsCreating(false);
        }
      }}
      placeholder="List name..."
      className="w-full rounded-md border border-primary/30 bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
    />
  </div>
)}
```

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

```bash
git add apps/web/src/components/layout/sidebar.tsx
git commit -m "feat: wire sidebar New List inline creation"
```

---

### Task 1.4: Fix Command Palette Navigation

**Files:**
- Modify: `apps/web/src/components/search/command-palette.tsx`

- [ ] **Step 1: Replace window.location.href with router.push**

```tsx
// Add to imports:
import { useRouter } from "next/navigation";

// Inside component:
const router = useRouter();
```

Update `handleSelect` (line 101–108):

```tsx
const handleSelect = (result: SearchResult) => {
  if (result.type === "list") {
    router.push(`/list/${result.id}`);
  } else {
    useItemStore.getState().setSelectedItem(result.id);
    useUIStore.getState().setDetailPanelOpen(true);
  }
  close();
};
```

Note: Also open detail panel when selecting a task/note (added `setDetailPanelOpen`). Import `useUIStore`:

```tsx
import { useUIStore } from "@/stores/ui-store";
```

- [ ] **Step 2: Verify and commit**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

```bash
git add apps/web/src/components/search/command-palette.tsx
git commit -m "fix: use router.push instead of window.location.href in command palette"
```

---

## Chunk 2: Track 2A — Labels UI & Subtasks

### Task 2.1: Label Management in Settings

**Files:**
- Modify: `apps/web/src/components/settings/settings-view.tsx`

- [ ] **Step 1: Add imports and state**

```tsx
// Add to imports:
import { Tag, X, Palette } from "lucide-react";
import { useLabelStore } from "@/stores/label-store";

// Inside component:
const { labels, fetchLabels, createLabel, deleteLabel } = useLabelStore();
const [newLabelName, setNewLabelName] = useState("");
const [newLabelColor, setNewLabelColor] = useState("#6366f1");
```

Add `useEffect` to fetch labels:

```tsx
useEffect(() => {
  fetchLabels();
}, [fetchLabels]);
```

- [ ] **Step 2: Add Labels card section**

After the Slack card and before the Notifications card, add:

```tsx
{/* Labels Section */}
<Card className="mt-4 border-border bg-card p-5">
  <div className="flex items-center gap-3">
    <Tag className="h-5 w-5 text-primary" />
    <h2 className="text-lg font-semibold">Labels</h2>
  </div>
  <Separator className="my-4 bg-border" />

  <div className="space-y-3">
    {labels.map((label) => (
      <div key={label.id} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: label.color }}
          />
          <span className="text-sm">{label.name}</span>
        </div>
        <button
          type="button"
          onClick={() => deleteLabel(label.id)}
          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    ))}

    {/* Add label form */}
    <div className="flex items-center gap-2 pt-2">
      <div className="flex gap-1">
        {["#6366f1", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6"].map(
          (color) => (
            <button
              key={color}
              type="button"
              onClick={() => setNewLabelColor(color)}
              className={cn(
                "h-6 w-6 rounded-full transition-transform",
                newLabelColor === color && "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card"
              )}
              style={{ backgroundColor: color }}
            />
          )
        )}
      </div>
    </div>
    <div className="flex gap-2">
      <input
        type="text"
        value={newLabelName}
        onChange={(e) => setNewLabelName(e.target.value)}
        placeholder="Label name"
        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        onKeyDown={async (e) => {
          if (e.key === "Enter" && newLabelName.trim()) {
            await createLabel({ name: newLabelName.trim(), color: newLabelColor });
            setNewLabelName("");
          }
        }}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          if (newLabelName.trim()) {
            await createLabel({ name: newLabelName.trim(), color: newLabelColor });
            setNewLabelName("");
          }
        }}
        disabled={!newLabelName.trim()}
        className="border-border text-secondary-foreground"
      >
        Add
      </Button>
    </div>
  </div>
</Card>
```

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

```bash
git add apps/web/src/components/settings/settings-view.tsx
git commit -m "feat: add label management UI in Settings"
```

---

### Task 2.2: Label Assignment in TaskDetail & QuickAdd

**Files:**
- Modify: `apps/web/src/components/tasks/task-detail.tsx`
- Modify: `apps/web/src/components/tasks/quick-add.tsx`

- [ ] **Step 1: Add label selector state and popover**

```tsx
// Add to existing state:
const [showLabelPicker, setShowLabelPicker] = useState(false);

// Add to imports:
import { Calendar, Flag, Repeat, Tag, Plus, X } from "lucide-react";
```

- [ ] **Step 2: Replace read-only labels with interactive section**

Replace the labels section (lines 134–151) with:

```tsx
{/* Labels */}
<div className="flex items-center gap-1">
  <Tag className="h-3 w-3 text-muted-foreground" />
  {item.labels?.map((label) => (
    <button
      key={label.id}
      onClick={() => {
        const currentIds = item.labels?.map((l) => l.id) ?? [];
        updateItem(item.id, {
          label_ids: currentIds.filter((id) => id !== label.id),
        });
      }}
      className="group/label rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80"
      style={{
        backgroundColor: `${label.color}20`,
        color: label.color,
      }}
      title="Click to remove"
    >
      {label.name}
    </button>
  ))}
  <div className="relative">
    <button
      onClick={() => setShowLabelPicker(!showLabelPicker)}
      className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
    >
      <Plus className="h-3 w-3" /> Label
    </button>
    {showLabelPicker && (
      <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-lg">
        {labels
          .filter((l) => !item.labels?.some((il) => il.id === l.id))
          .map((label) => (
            <button
              key={label.id}
              onClick={() => {
                const currentIds = item.labels?.map((l) => l.id) ?? [];
                updateItem(item.id, {
                  label_ids: [...currentIds, label.id],
                });
                setShowLabelPicker(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
            </button>
          ))}
        {labels.filter((l) => !item.labels?.some((il) => il.id === l.id)).length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No more labels</p>
        )}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 3: Add label selector to QuickAdd toolbar**

In `quick-add.tsx`, add label picker state and imports:

```tsx
// Add to imports:
import { Tag } from "lucide-react";
import { useLabelStore } from "@/stores/label-store";

// Add to state:
const [showLabelPicker, setShowLabelPicker] = useState(false);
const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
const { labels } = useLabelStore();
```

Add a label selector button to the expanded toolbar (after the list selector / FolderOpen button):

```tsx
{/* Label selector */}
<div className="relative">
  <button
    type="button"
    onClick={() => setShowLabelPicker(!showLabelPicker)}
    className={cn(
      "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted",
      selectedLabelIds.length > 0 && "text-primary"
    )}
    title="Add labels"
  >
    <Tag className="h-4 w-4" />
  </button>
  <AnimatePresence>
    {showLabelPicker && (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="absolute bottom-full left-0 z-50 mb-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-lg"
      >
        {labels.map((label) => (
          <button
            key={label.id}
            type="button"
            onClick={() => {
              setSelectedLabelIds((prev) =>
                prev.includes(label.id)
                  ? prev.filter((id) => id !== label.id)
                  : [...prev, label.id]
              );
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            {label.name}
            {selectedLabelIds.includes(label.id) && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </button>
        ))}
        {labels.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No labels</p>
        )}
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

Show selected labels as pills above the input (below the date badge area):

```tsx
{selectedLabelIds.length > 0 && (
  <div className="flex flex-wrap gap-1">
    {selectedLabelIds.map((id) => {
      const label = labels.find((l) => l.id === id);
      if (!label) return null;
      return (
        <span
          key={id}
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: `${label.color}20`, color: label.color }}
        >
          {label.name}
        </span>
      );
    })}
  </div>
)}
```

Pass `label_ids` in `handleSubmit`:

```tsx
label_ids: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
```

Reset after submit:

```tsx
setSelectedLabelIds([]);
setShowLabelPicker(false);
```

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

```bash
git add apps/web/src/components/tasks/task-detail.tsx apps/web/src/components/tasks/quick-add.tsx
git commit -m "feat: add interactive label assignment in TaskDetail and QuickAdd"
```

---

### Task 2.3: Subtasks — TaskList & TaskItem Nesting

**Files:**
- Modify: `apps/web/src/components/tasks/task-list.tsx`
- Modify: `apps/web/src/components/tasks/task-item.tsx`

- [ ] **Step 1: Add depth prop and children rendering to TaskList**

Update `task-list.tsx`:

```tsx
import { useItemStore } from "@/stores/item-store";

interface TaskListProps {
  items: Item[];
  depth?: number;
}

export function TaskList({ items, depth = 0 }: TaskListProps) {
  const getItemsByParent = useItemStore((s) => s.getItemsByParent);
  const allItems = useItemStore((s) => s.items);
  const topLevelItems = items.filter((i) => !i.parent_item_id);

  return (
    <motion.div
      variants={depth === 0 ? staggerContainer : undefined}
      initial={depth === 0 ? "hidden" : undefined}
      animate={depth === 0 ? "visible" : undefined}
      className="space-y-0.5"
    >
      <AnimatePresence mode="popLayout">
        {topLevelItems.map((item) => {
          if (item.type === "heading") {
            return (
              <motion.div
                key={item.id}
                variants={taskItemVariants}
                layout
                className="px-3 pb-1 pt-4 first:pt-0"
              >
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.title}
                </h3>
              </motion.div>
            );
          }

          if (item.type === "note") {
            return (
              <motion.div
                key={item.id}
                variants={taskItemVariants}
                layout
                className="px-3 py-2"
              >
                <p className="text-sm text-muted-foreground">{item.title}</p>
              </motion.div>
            );
          }

          const children = allItems.filter((c) => c.parent_item_id === item.id);
          return (
            <TaskItem
              key={item.id}
              item={item}
              depth={depth}
              childItems={children}
            />
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
```

- [ ] **Step 2: Add depth, children, and disclosure chevron to TaskItem**

Update `task-item.tsx`:

```tsx
// Add imports:
import { ChevronRight } from "lucide-react";

// Update props:
interface TaskItemProps {
  item: Item;
  depth?: number;
  childItems?: Item[];
}

export function TaskItem({ item, depth = 0, childItems = [] }: TaskItemProps) {
  // ... existing hooks ...
  const [childrenVisible, setChildrenVisible] = useState(false);
  const hasChildren = childItems.length > 0;
```

Add indent via `style` on the outer div:

```tsx
<motion.div
  variants={taskItemVariants}
  layout
  transition={layoutSpring}
  className="group"
  style={{ paddingLeft: depth * 24 }}
>
  <div
    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50 active:bg-muted/70"
    onClick={handleClick}
  >
    {/* Disclosure chevron */}
    {hasChildren ? (
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setChildrenVisible(!childrenVisible);
        }}
        animate={{ rotate: childrenVisible ? 90 : 0 }}
        className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </motion.button>
    ) : (
      <span className="w-4 shrink-0" />
    )}

    {/* Checkbox - existing code */}
    {/* Title - existing code */}
    {/* Metadata - existing code */}
  </div>

  {/* Children */}
  <AnimatePresence>
    {childrenVisible && hasChildren && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
      >
        {childItems
          .sort((a, b) => a.position - b.position)
          .map((child) => (
            <TaskItem key={child.id} item={child} depth={(depth ?? 0) + 1} />
          ))}
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>
```

- [ ] **Step 3: Add subtask inline-add in TaskDetail**

In `task-detail.tsx`, after the rich editor section, add a subtasks section:

Add to the component's hooks section (before the return):

```tsx
const subtasks = useItemStore((s) => s.getItemsByParent(item.id));
const toggleComplete = useItemStore((s) => s.toggleComplete);
```

Then in the JSX:

```tsx
{/* Subtasks */}
<div className="border-t border-border px-6 py-3">
  <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
    Subtasks
  </p>
  {/* Existing subtasks */}
  {subtasks.map((child) => (
    <div key={child.id} className="flex items-center gap-2 py-1">
      <button
        type="button"
        onClick={() => toggleComplete(child.id)}
        className={cn(
          "h-4 w-4 shrink-0 rounded border",
          child.is_completed
            ? "border-success bg-success"
            : "border-border"
        )}
      />
      <span
        className={cn(
          "text-sm",
          child.is_completed && "text-muted-foreground line-through"
        )}
      >
        {child.title}
      </span>
    </div>
  ))}
  {/* Add subtask input */}
  <SubtaskInput parentId={item.id} listId={item.list_id} />
</div>
```

Create the `SubtaskInput` as a local component:

```tsx
function SubtaskInput({ parentId, listId }: { parentId: string; listId: string }) {
  const [value, setValue] = useState("");
  const createItem = useItemStore((s) => s.createItem);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={async (e) => {
        if (e.key === "Enter" && value.trim()) {
          await createItem({
            list_id: listId,
            parent_item_id: parentId,
            title: value.trim(),
            type: "task",
            source: "manual",
          });
          setValue("");
        }
      }}
      placeholder="Add subtask..."
      className="mt-1 w-full bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
    />
  );
}
```

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

```bash
git add apps/web/src/components/tasks/task-list.tsx apps/web/src/components/tasks/task-item.tsx apps/web/src/components/tasks/task-detail.tsx
git commit -m "feat: add subtask rendering and inline creation"
```

---

## Chunk 3: Track 2B — DnD, Editor, Time Picker, Shortcuts

### Task 2.4: Drag-and-Drop Task Reordering (with Sidebar List DnD)

**Files:**
- Modify: `apps/web/src/components/tasks/task-list.tsx`
- Modify: `apps/web/src/components/tasks/task-item.tsx`
- Modify: `apps/web/src/stores/item-store.ts`
- Modify: `apps/web/src/stores/list-store.ts`
- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Wrap TaskList with DndContext and SortableContext**

```tsx
// Add to task-list.tsx imports:
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
```

Add `listId` prop to `TaskListProps`:

```tsx
interface TaskListProps {
  items: Item[];
  depth?: number;
  listId?: string;
}
```

Wrap the `motion.div` in `DndContext` + `SortableContext` (only at depth 0):

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
);
const reorderItems = useItemStore((s) => s.reorderItems);

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id || !listId) return;
  const ids = topLevelItems.filter((i) => i.type === "task").map((i) => i.id);
  const oldIndex = ids.indexOf(active.id as string);
  const newIndex = ids.indexOf(over.id as string);
  if (oldIndex === -1 || newIndex === -1) return;
  const newIds = [...ids];
  newIds.splice(oldIndex, 1);
  newIds.splice(newIndex, 0, active.id as string);
  reorderItems(listId, newIds);
}
```

Wrap the list:

```tsx
{depth === 0 && listId ? (
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    modifiers={[restrictToVerticalAxis]}
    onDragEnd={handleDragEnd}
  >
    <SortableContext
      items={topLevelItems.filter((i) => i.type === "task").map((i) => i.id)}
      strategy={verticalListSortingStrategy}
    >
      {/* existing render */}
    </SortableContext>
  </DndContext>
) : (
  /* existing render without DndContext */
)}
```

- [ ] **Step 2: Make TaskItem sortable**

```tsx
// Add to task-item.tsx imports:
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

// Inside component:
const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
  useSortable({ id: item.id });

const sortStyle = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
  paddingLeft: (depth ?? 0) * 24,
};
```

Use `ref={setNodeRef}` on outer div, apply `sortStyle` via `style` prop. Add drag handle:

```tsx
<button
  type="button"
  {...attributes}
  {...listeners}
  className="flex h-4 w-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
>
  <GripVertical className="h-3.5 w-3.5" />
</button>
```

- [ ] **Step 3: Add optimistic revert to reorderItems in item-store.ts**

In `item-store.ts`, update the `reorderItems` method (lines 132–148) to snapshot the current order before the API call and revert on failure:

```tsx
reorderItems: async (listId, orderedIds) => {
  // Snapshot current state for revert
  const prevItems = get().items;

  // Optimistic update
  set((state) => {
    const itemMap = new Map(state.items.map((i) => [i.id, i]));
    const reordered = orderedIds
      .map((id) => itemMap.get(id))
      .filter((i): i is Item => i !== undefined);
    const remaining = state.items.filter(
      (i) => i.list_id !== listId || !orderedIds.includes(i.id)
    );
    return { items: [...reordered, ...remaining] };
  });

  try {
    const res = await fetch("/api/items/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list_id: listId, orderedIds }),
    });
    if (!res.ok) throw new Error("Reorder failed");
  } catch {
    // Revert on failure
    set({ items: prevItems });
  }
},
```

- [ ] **Step 4: Add optimistic revert to reorderLists in list-store.ts**

Apply the same snapshot-and-revert pattern to `reorderLists` in `list-store.ts`:

```tsx
reorderLists: async (orderedIds) => {
  const prevLists = get().lists;

  set((state) => {
    const listMap = new Map(state.lists.map((l) => [l.id, l]));
    const reordered = orderedIds
      .map((id) => listMap.get(id))
      .filter((l): l is List => l !== undefined);
    const remaining = state.lists.filter((l) => !orderedIds.includes(l.id));
    return { lists: [...reordered, ...remaining] };
  });

  try {
    const res = await fetch("/api/lists/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
    if (!res.ok) throw new Error("Reorder failed");
  } catch {
    set({ lists: prevLists });
  }
},
```

- [ ] **Step 5: Pass listId to TaskList consumers**

Grep for `<TaskList` usages and pass `listId` where available (inbox page, list page, today-view).

- [ ] **Step 6: Add DnD list reordering to sidebar**

In `sidebar.tsx`, wrap the user lists section with `DndContext` + `SortableContext` and make each list item sortable:

```tsx
// Add imports:
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { GripVertical } from "lucide-react";

// Inside Sidebar component:
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
);

function handleListDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const ids = lists.map((l) => l.id);
  const oldIndex = ids.indexOf(active.id as string);
  const newIndex = ids.indexOf(over.id as string);
  if (oldIndex === -1 || newIndex === -1) return;
  const newIds = [...ids];
  newIds.splice(oldIndex, 1);
  newIds.splice(newIndex, 0, active.id as string);
  reorderLists(newIds);
}
```

Wrap the user lists `<nav>` section:

```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  modifiers={[restrictToVerticalAxis]}
  onDragEnd={handleListDragEnd}
>
  <SortableContext items={lists.map((l) => l.id)} strategy={verticalListSortingStrategy}>
    {lists.map((list) => (
      <SortableListItem key={list.id} list={list} />
    ))}
  </SortableContext>
</DndContext>
```

Create a `SortableListItem` sub-component inside the file:

```tsx
function SortableListItem({ list }: { list: List }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: list.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group flex items-center">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-4 w-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      {/* existing list link/button content */}
    </div>
  );
}
```

- [ ] **Step 7: Verify and commit**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

```bash
git add apps/web/src/components/tasks/task-list.tsx apps/web/src/components/tasks/task-item.tsx apps/web/src/stores/item-store.ts apps/web/src/stores/list-store.ts apps/web/src/components/layout/sidebar.tsx
git commit -m "feat: add drag-and-drop task reordering with @dnd-kit and sidebar list DnD"
```

---

### Task 2.5: Rich Editor BubbleMenu Toolbar

**Files:**
- Modify: `apps/web/src/components/editor/rich-editor.tsx`

- [ ] **Step 1: Add BubbleMenu import and toolbar**

```tsx
// Add to imports:
import { BubbleMenu } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link2,
  Heading1,
  Heading2,
  List,
  ListOrdered,
} from "lucide-react";
```

- [ ] **Step 2: Add BubbleMenu after EditorContent**

```tsx
return (
  <div className="rounded-lg border border-border bg-card/50">
    {editor && (
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg"
      >
        {[
          { icon: Bold, command: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
          { icon: Italic, command: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
          { icon: Strikethrough, command: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike") },
          { icon: Code, command: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code") },
          { icon: Heading1, command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }) },
          { icon: Heading2, command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
          { icon: List, command: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
          { icon: ListOrdered, command: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
        ].map(({ icon: Icon, command, active }, i) => (
          <button
            key={i}
            type="button"
            onClick={command}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </BubbleMenu>
    )}
    <EditorContent editor={editor} />
  </div>
);
```

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

```bash
git add apps/web/src/components/editor/rich-editor.tsx
git commit -m "feat: add BubbleMenu floating toolbar to rich editor"
```

---

### Task 2.6: Time Picker in DatePicker

**Files:**
- Modify: `apps/web/src/components/date/date-picker.tsx`
- Modify: `apps/web/src/components/tasks/task-detail.tsx`

- [ ] **Step 1: Add time support to DatePicker**

Update `DatePickerProps`:

```tsx
interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  trigger?: React.ReactNode;
  showTime?: boolean;
  timeValue?: string | null;
  onTimeChange?: (time: string | null) => void;
}
```

Add to component:

```tsx
const [hour, setHour] = useState(timeValue ? parseInt(timeValue.split(":")[0]) : 9);
const [minute, setMinute] = useState(timeValue ? parseInt(timeValue.split(":")[1]) : 0);
```

After the calendar grid, when `showTime` is true:

```tsx
{showTime && (
  <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
    <span className="text-xs text-muted-foreground">Time:</span>
    <select
      value={hour}
      onChange={(e) => {
        const h = parseInt(e.target.value);
        setHour(h);
        onTimeChange?.(`${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
      }}
      className="rounded border border-border bg-background px-1.5 py-1 text-xs"
    >
      {Array.from({ length: 24 }, (_, i) => (
        <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
      ))}
    </select>
    <span className="text-xs">:</span>
    <select
      value={minute}
      onChange={(e) => {
        const m = parseInt(e.target.value);
        setMinute(m);
        onTimeChange?.(`${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }}
      className="rounded border border-border bg-background px-1.5 py-1 text-xs"
    >
      {[0, 15, 30, 45].map((m) => (
        <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
      ))}
    </select>
    {timeValue && (
      <button
        onClick={() => onTimeChange?.(null)}
        className="text-xs text-destructive hover:underline"
      >
        Clear
      </button>
    )}
  </div>
)}
```

- [ ] **Step 2: Wire time picker in TaskDetail**

In `task-detail.tsx`, update the DatePicker usage:

```tsx
<DatePicker
  value={item.due_date}
  onChange={(date) => updateItem(item.id, { due_date: date })}
  showTime
  timeValue={item.due_time}
  onTimeChange={(time) => updateItem(item.id, { due_time: time })}
  trigger={...existing trigger...}
/>
```

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

```bash
git add apps/web/src/components/date/date-picker.tsx apps/web/src/components/tasks/task-detail.tsx
git commit -m "feat: add time picker to DatePicker and wire in TaskDetail"
```

---

### Task 2.7: Keyboard Shortcuts

**Files:**
- Modify: `apps/web/src/lib/shortcuts.ts`
- Modify: `apps/web/src/components/layout/app-shell.tsx`

- [ ] **Step 1: Fix shiftMatch bug in shortcuts.ts**

In `shortcuts.ts` line 36, change:

```tsx
// Before:
const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

// After:
const shiftMatch = shortcut.shift ? e.shiftKey : true;
```

- [ ] **Step 2: Register shortcuts in app-shell.tsx**

```tsx
// Add imports:
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerShortcut, initShortcuts } from "@/lib/shortcuts";

// Inside AppShell, add:
const router = useRouter();

useEffect(() => {
  const cleanup = initShortcuts();

  const unregN = registerShortcut({
    key: "n",
    handler: () => {
      // Dispatch custom event for QuickAdd focus
      window.dispatchEvent(new CustomEvent("focus-quick-add"));
    },
    description: "New task",
  });

  const unregE = registerShortcut({
    key: "e",
    handler: () => {
      const { selectedItemId } = useItemStore.getState();
      if (selectedItemId) {
        useUIStore.getState().setDetailPanelOpen(true);
      }
    },
    description: "Edit selected item",
  });

  const unregComma = registerShortcut({
    key: ",",
    meta: true,
    handler: () => {
      router.push("/settings");
    },
    description: "Open settings",
  });

  return () => {
    cleanup();
    unregN();
    unregE();
    unregComma();
  };
}, [router]);
```

Add `useItemStore` import:

```tsx
import { useItemStore } from "@/stores/item-store";
```

- [ ] **Step 3: Listen for focus-quick-add event in QuickAdd**

In `quick-add.tsx`, add:

```tsx
useEffect(() => {
  function onFocusQuickAdd() {
    inputRef.current?.focus();
  }
  window.addEventListener("focus-quick-add", onFocusQuickAdd);
  return () => window.removeEventListener("focus-quick-add", onFocusQuickAdd);
}, []);
```

(Add `useEffect` to imports if not already there.)

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

```bash
git add apps/web/src/lib/shortcuts.ts apps/web/src/components/layout/app-shell.tsx apps/web/src/components/tasks/quick-add.tsx
git commit -m "feat: register keyboard shortcuts (N, ⌘K, E, Escape, ⌘,)"
```

---

## Chunk 4: Track 3 — AI Worker Migration

### Task 3.1: Regenerate Supabase Types

**Files:**
- Modify: `packages/shared/src/types/supabase.ts`

- [ ] **Step 1: Run type generation**

```bash
npx supabase gen types typescript --local > packages/shared/src/types/supabase.ts
```

- [ ] **Step 2: Verify build**

```bash
pnpm turbo lint
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/supabase.ts
git commit -m "chore: regenerate Supabase TypeScript types for new data model"
```

---

### Task 3.2: Migrate Worker AI Tool Definitions

**Files:**
- Modify: `apps/worker/src/ai/tool-definitions.ts`

- [ ] **Step 1: Replace TASK_TOOLS with ITEM_TOOLS**

Replace `TASK_TOOLS` array with:

```tsx
export const ITEM_TOOLS: Tool[] = [
  {
    name: "create_item",
    description: "Create a new item (task, note, or heading) for the user",
    input_schema: {
      type: "object" as const,
      properties: {
        list_id: { type: "string", description: "UUID of the list to add to" },
        title: { type: "string", description: "Item title" },
        type: { type: "string", enum: ["task", "note", "heading"], description: "Item type (default: task)" },
        priority: { type: "string", enum: ["none", "low", "medium", "high"], description: "Priority level" },
        effort: { type: "string", enum: ["xs", "s", "m", "l", "xl"], description: "Estimated effort" },
        estimated_minutes: { type: "number", description: "Estimated duration in minutes" },
        due_date: { type: "string", description: "Due date (YYYY-MM-DD)" },
        due_time: { type: "string", description: "Due time (HH:MM)" },
        scheduled_date: { type: "string", description: "Date to schedule (YYYY-MM-DD)" },
        scheduled_start: { type: "string", description: "ISO 8601 start time" },
        scheduled_end: { type: "string", description: "ISO 8601 end time" },
        is_movable: { type: "boolean", description: "Whether AI can reschedule" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_item",
    description: "Update an existing item's properties",
    input_schema: {
      type: "object" as const,
      properties: {
        item_id: { type: "string", description: "UUID of the item to update" },
        title: { type: "string" },
        is_completed: { type: "boolean" },
        priority: { type: "string", enum: ["none", "low", "medium", "high"] },
        effort: { type: "string", enum: ["xs", "s", "m", "l", "xl"] },
        estimated_minutes: { type: "number" },
        due_date: { type: "string" },
        scheduled_start: { type: "string" },
        scheduled_end: { type: "string" },
        is_movable: { type: "boolean" },
        ai_notes: { type: "string" },
      },
      required: ["item_id"],
    },
  },
  {
    name: "complete_item",
    description: "Mark an item as completed",
    input_schema: {
      type: "object" as const,
      properties: {
        item_id: { type: "string", description: "UUID of the item" },
        completion_notes: { type: "string", description: "Optional notes about completion" },
      },
      required: ["item_id"],
    },
  },
  {
    name: "list_items",
    description: "List items, optionally filtered by list, date, or completion status",
    input_schema: {
      type: "object" as const,
      properties: {
        list_id: { type: "string", description: "UUID of a specific list" },
        due_date: { type: "string", description: "Filter by due date (YYYY-MM-DD)" },
        scheduled_date: { type: "string", description: "Filter by scheduled date (YYYY-MM-DD)" },
        include_completed: { type: "boolean", description: "Include completed items (default: false)" },
      },
    },
  },
  {
    name: "get_lists",
    description: "Get all lists for the user with item counts",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
];
```

Update aggregation arrays at the bottom:

```tsx
export const ALL_TOOLS: Tool[] = [
  ...ITEM_TOOLS,
  ...CALENDAR_TOOLS,
  ...SCHEDULE_TOOLS,
  ...INTELLIGENCE_TOOLS,
];

export const MORNING_PLAN_TOOLS: Tool[] = [
  ...ITEM_TOOLS.filter((t) => t.name === "list_items" || t.name === "get_lists"),
  ...CALENDAR_TOOLS,
  ...SCHEDULE_TOOLS,
  ...INTELLIGENCE_TOOLS.filter((t) => t.name === "estimate_task"),
];

export const CHAT_TOOLS: Tool[] = ALL_TOOLS;

export const EOD_TOOLS: Tool[] = [
  ...ITEM_TOOLS.filter((t) => t.name === "list_items" || t.name === "get_lists"),
  ...CALENDAR_TOOLS,
];
```

Keep old tool names as deprecated aliases — add at end:

```tsx
// Deprecated aliases for backward compatibility
export const TASK_TOOLS = ITEM_TOOLS;
```

- [ ] **Step 2: Commit**

```bash
git add apps/worker/src/ai/tool-definitions.ts
git commit -m "feat: migrate worker AI tool definitions from tasks to items"
```

---

### Task 3.3: Migrate Worker Tool Handlers

**Files:**
- Modify: `apps/worker/src/ai/tool-handlers.ts`

- [ ] **Step 1: Update the switch statement and all handlers**

Replace the switch in `handleToolCall` to add new item tools and keep old ones as deprecated aliases:

```tsx
export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  switch (toolName) {
    // New item-based tools
    case "create_item": return handleCreateItem(toolInput, ctx);
    case "update_item": return handleUpdateItem(toolInput, ctx);
    case "complete_item": return handleCompleteItem(toolInput, ctx);
    case "list_items": return handleListItems(toolInput, ctx);
    case "get_lists": return handleGetLists(ctx);
    // Deprecated aliases
    case "create_task": return handleCreateItem(toolInput, ctx);
    case "update_task": return handleUpdateItem({ item_id: toolInput.task_id, ...toolInput }, ctx);
    case "complete_task": return handleCompleteItem({ item_id: toolInput.task_id, ...toolInput }, ctx);
    case "get_tasks": return handleListItems({ scheduled_date: toolInput.date, ...toolInput }, ctx);
    // Existing unchanged tools
    case "get_calendar_events": return handleGetCalendarEvents(toolInput, ctx);
    case "generate_schedule": return handleGenerateSchedule(toolInput, ctx);
    case "shuffle_schedule": return handleShuffleSchedule(toolInput, ctx);
    case "insert_break": return handleInsertBreak(toolInput, ctx);
    case "estimate_task": return handleEstimateTask(toolInput, ctx);
    case "auto_check_completions": return handleAutoCheckCompletions(toolInput, ctx);
    default: return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
```

- [ ] **Step 2: Implement new handler functions**

Replace old `handleCreateTask`, `handleUpdateTask`, `handleCompleteTask`, `handleGetTasks` with:

```tsx
async function handleCreateItem(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  // Get user's inbox as default list
  let listId = input.list_id as string | undefined;
  if (!listId) {
    const { data: inbox } = await supabase
      .from("lists")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("is_inbox", true)
      .single();
    listId = inbox?.id;
  }
  if (!listId) return JSON.stringify({ error: "No list found" });

  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: ctx.userId,
      list_id: listId,
      title: input.title as string,
      type: (input.type as string) || "task",
      priority: (input.priority as string) || "none",
      effort: (input.effort as string) || null,
      estimated_minutes: (input.estimated_minutes as number) || null,
      due_date: (input.due_date as string) || null,
      due_time: (input.due_time as string) || null,
      scheduled_date: (input.scheduled_date as string) || null,
      scheduled_start: (input.scheduled_start as string) || null,
      scheduled_end: (input.scheduled_end as string) || null,
      is_movable: input.is_movable !== false,
      source: "ai_suggested",
    })
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, item: data });
}

async function handleUpdateItem(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const { item_id, ...updates } = input;
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) updateData[key] = value;
  }
  if (updateData.is_completed === true) {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("items")
    .update(updateData)
    .eq("id", item_id as string)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, item: data });
}

async function handleCompleteItem(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const { data, error } = await supabase
    .from("items")
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      ai_notes: (input.completion_notes as string) || null,
    })
    .eq("id", input.item_id as string)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, item: data });
}

async function handleListItems(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  let query = supabase
    .from("items")
    .select("id, title, type, priority, effort, estimated_minutes, is_completed, due_date, scheduled_date, scheduled_start, scheduled_end, list_id, ai_notes")
    .eq("user_id", ctx.userId)
    .eq("is_archived", false);

  if (input.list_id) query = query.eq("list_id", input.list_id as string);
  if (input.scheduled_date) query = query.eq("scheduled_date", input.scheduled_date as string);
  if (input.due_date) query = query.eq("due_date", input.due_date as string);
  if (!input.include_completed) query = query.eq("is_completed", false);

  query = query.order("position");

  const { data, error } = await query;
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ items: data });
}

async function handleGetLists(ctx: ToolContext): Promise<string> {
  const { data: lists, error } = await supabase
    .from("lists")
    .select("id, title, icon, is_inbox")
    .eq("user_id", ctx.userId)
    .eq("is_archived", false)
    .order("position");

  if (error) return JSON.stringify({ error: error.message });

  // Get item counts per list
  const listsWithCounts = await Promise.all(
    (lists || []).map(async (list) => {
      const { count } = await supabase
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("list_id", list.id)
        .eq("is_completed", false)
        .eq("is_archived", false);
      return { ...list, item_count: count || 0 };
    })
  );

  return JSON.stringify({ lists: listsWithCounts });
}
```

- [ ] **Step 3: Update generate_schedule handler to write to items**

In `handleGenerateSchedule`, change `from("tasks")` to `from("items")`:

```tsx
// Change lines 128-133:
if (slot.type === "task" && slot.ref_id) {
  await supabase
    .from("items")
    .update({ scheduled_start: slot.start, scheduled_end: slot.end, scheduled_date: date })
    .eq("id", slot.ref_id)
    .eq("user_id", ctx.userId);
}
```

- [ ] **Step 4: Update estimate_task and auto_check_completions**

In `handleEstimateTask`, change `from("tasks")` to `from("items")`:

```tsx
const { data, error } = await supabase
  .from("items")
  .update({
    effort: input.effort as string,
    estimated_minutes: input.estimated_minutes as number,
    ai_notes: (input.reasoning as string) || null,
  })
  .eq("id", input.task_id as string)
  .eq("user_id", ctx.userId)
  .select()
  .single();
```

In `handleAutoCheckCompletions`, change `from("tasks")` queries to `from("items")` and update status checks from `status` to `is_completed`:

```tsx
const { data: tasks } = await supabase
  .from("items")
  .select("*")
  .eq("user_id", ctx.userId)
  .eq("scheduled_date", date)
  .eq("is_completed", false)
  .lt("scheduled_end", now.toISOString());

// ... and the update:
await supabase
  .from("items")
  .update({ is_completed: true, completed_at: now.toISOString(), ai_notes: `Auto-completed: related event "${relatedEvent.title}" has ended` })
  .eq("id", task.id);
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm --filter @ai-todo/worker lint
git add apps/worker/src/ai/tool-handlers.ts
git commit -m "feat: migrate worker tool handlers from tasks to items table"
```

---

### Task 3.4: Update Morning Plan Job

**Files:**
- Modify: `apps/worker/src/jobs/morning-plan.ts`

- [ ] **Step 1: Change tasks query to items query**

Replace lines 44–52 (`from("tasks")` query):

```tsx
const { data: items } = await supabase
  .from("items")
  .select(
    "id, title, type, priority, effort, estimated_minutes, is_completed, is_movable, scheduled_date, due_date, list_id"
  )
  .eq("user_id", userId)
  .eq("is_completed", false)
  .eq("is_archived", false)
  .or(`scheduled_date.eq.${date},scheduled_date.is.null,due_date.lte.${date}`)
  .order("priority", { ascending: false });
```

- [ ] **Step 2: Update the user message template**

Replace `tasks` references with `items`:

```tsx
const userMessage = `Here is the data for today (${date}):

**Calendar Events:**
${events && events.length > 0
  ? events.map((e: any) => `- ${e.title}: ${e.start_time} to ${e.end_time}${e.location ? ` (${e.location})` : ""}`).join("\n")
  : "No calendar events today."}

**Pending Items (${items?.length || 0}):**
${items && items.length > 0
  ? items.map((t: any) => `- [${t.id}] "${t.title}" | priority: ${t.priority} | effort: ${t.effort || "unknown"} | est: ${t.estimated_minutes || "unknown"}min | movable: ${t.is_movable}${t.due_date ? ` | due: ${t.due_date}` : ""}`).join("\n")
  : "No pending items."}

**User Preferences:**
- Timezone: ${profile?.timezone || "UTC"}
- Preferences: ${JSON.stringify(profile?.preferences || {})}

Please create an optimized daily schedule. First estimate any items missing durations, then generate the schedule with appropriate breaks.`;
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm --filter @ai-todo/worker lint
git add apps/worker/src/jobs/morning-plan.ts
git commit -m "feat: migrate morning plan job from tasks to items"
```

---

### Task 3.5: Update EOD Report Job

**Files:**
- Modify: `apps/worker/src/jobs/eod-report.ts`

- [ ] **Step 1: Change tasks query to items query**

Replace `from("tasks")` query:

```tsx
const { data: allItems } = await supabase
  .from("items")
  .select(
    "id, title, is_completed, priority, scheduled_start, scheduled_end, completed_at, list_id"
  )
  .eq("user_id", userId)
  .eq("scheduled_date", date)
  .eq("is_archived", false);

const items = allItems || [];
const completed = items.filter((t) => t.is_completed);
const pending = items.filter((t) => !t.is_completed);
```

Remove `cancelled` since items don't have a cancelled status.

- [ ] **Step 2: Update the user message and report upsert**

Update message to remove cancelled references, update the upsert:

```tsx
const { data: report } = await supabase
  .from("daily_reports")
  .upsert(
    {
      user_id: userId,
      date,
      tasks_completed: completed.length,
      tasks_pending: pending.length,
      tasks_cancelled: 0,
      total_focus_minutes: focusMinutes,
      ai_summary: result.finalText,
      highlights: completed
        .slice(0, 5)
        .map((t) => ({ title: t.title, priority: t.priority })),
      sent_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" }
  )
  .select()
  .single();
```

- [ ] **Step 3: Update carry-over logic**

Change pending task carry-over from `tasks` to `items`:

```tsx
for (const item of pending) {
  await supabase
    .from("items")
    .update({
      scheduled_date: tomorrowStr,
      scheduled_start: null,
      scheduled_end: null,
      ai_notes: `Carried over from ${date}`,
    })
    .eq("id", item.id);
}
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm --filter @ai-todo/worker lint
git add apps/worker/src/jobs/eod-report.ts
git commit -m "feat: migrate EOD report job from tasks to items"
```

---

### Task 3.6: Update Chat API Tools

**Files:**
- Modify: `apps/web/src/app/api/chat/route.ts`

- [ ] **Step 1: Change context query from tasks to items**

Replace the `tasks` query (lines 33-40):

```tsx
const { data: items } = await adminClient
  .from("items")
  .select(
    "id, title, type, priority, effort, estimated_minutes, is_completed, is_movable, scheduled_date, scheduled_start, scheduled_end, list_id"
  )
  .eq("user_id", user!.id)
  .eq("is_archived", false)
  .or(`scheduled_date.eq.${today},due_date.eq.${today}`)
  .order("position");
```

Update system message to use `items` instead of `tasks`.

- [ ] **Step 2: Replace chat tools with item-based tools**

Replace `createTask` with `createItem`:

```tsx
createItem: tool({
  description: "Create a new task or item",
  inputSchema: z.object({
    title: z.string().describe("Item title"),
    list_id: z.string().uuid().optional().describe("List UUID"),
    priority: z.enum(["none", "low", "medium", "high"]).optional(),
    due_date: z.string().optional().describe("Date YYYY-MM-DD"),
    estimated_minutes: z.number().optional(),
  }),
  execute: async ({ title, list_id, priority, due_date, estimated_minutes }) => {
    let targetListId = list_id;
    if (!targetListId) {
      const { data: inbox } = await adminClient
        .from("lists")
        .select("id")
        .eq("user_id", user!.id)
        .eq("is_inbox", true)
        .single();
      targetListId = inbox?.id;
    }
    const { data, error: insertError } = await adminClient
      .from("items")
      .insert({
        user_id: user!.id,
        list_id: targetListId,
        title,
        type: "task",
        priority: priority || "none",
        due_date: due_date || null,
        estimated_minutes,
        source: "ai_suggested",
      })
      .select()
      .single();
    if (insertError) return { error: insertError.message };
    return { success: true, item: { id: data.id, title: data.title } };
  },
}),
```

Replace `completeTask` → `completeItem`, `updateTask` → `updateItem`, `getTasks` → `listItems` with equivalent `items` table queries. Follow the same pattern as worker tool handlers.

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
git add apps/web/src/app/api/chat/route.ts
git commit -m "feat: migrate chat API tools from tasks to items"
```

---

## Chunk 5: Track 4 — Reliability

### Task 4.1: Fix POST `/api/items` Response

**Files:**
- Modify: `apps/web/src/app/api/items/route.ts`

- [ ] **Step 1: Re-fetch with labels after insert**

After the label insert (line 47), replace `return NextResponse.json(data, { status: 201 });` with:

```tsx
// Re-fetch with labels
const { data: fullItem, error: fetchError } = await supabase
  .from("items")
  .select("*, item_labels(label_id, labels(*))")
  .eq("id", data.id)
  .single();

if (fetchError) return NextResponse.json(data, { status: 201 });

// Transform labels into flat array
const itemWithLabels = {
  ...fullItem,
  labels: fullItem.item_labels?.map((il: { labels: unknown }) => il.labels).filter(Boolean) ?? [],
};
delete (itemWithLabels as Record<string, unknown>).item_labels;

return NextResponse.json(itemWithLabels, { status: 201 });
```

- [ ] **Step 2: Also fix the GET query to include full labels**

Update the GET select (line 12):

```tsx
.select("*, item_labels(label_id, labels(*))")
```

And transform the response before returning:

```tsx
const itemsWithLabels = (data || []).map((item: Record<string, unknown>) => ({
  ...item,
  labels: (item.item_labels as { labels: unknown }[] | undefined)?.map((il) => il.labels).filter(Boolean) ?? [],
}));
// Remove item_labels from response
itemsWithLabels.forEach((item: Record<string, unknown>) => delete item.item_labels);

return NextResponse.json(itemsWithLabels);
```

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
git add apps/web/src/app/api/items/route.ts
git commit -m "fix: include labels in POST/GET /api/items responses"
```

---

### Task 4.2: Wire Dexie into Item Store

**Files:**
- Modify: `apps/web/src/lib/db.ts`
- Modify: `apps/web/src/stores/item-store.ts`

- [ ] **Step 1: Add mapping functions to db.ts**

At the end of `db.ts`, add:

```tsx
import type { Item } from "@ai-todo/shared";

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
```

- [ ] **Step 2: Wire Dexie into item-store fetch methods**

In `fetchItemsByList`, after setting items from API:

```tsx
// After: set({ items, isLoading: false });
// Add: cache to Dexie
import { db, toLocalItem } from "@/lib/db";

// Inside fetchItemsByList, after API success:
try {
  await db.items.bulkPut(items.map(toLocalItem));
} catch { /* Dexie write failed, non-critical */ }
```

Add fallback at the beginning:

```tsx
fetchItemsByList: async (listId) => {
  set({ isLoading: true });
  const res = await fetch(`/api/items?list_id=${listId}`);
  if (res.ok) {
    const items: Item[] = await res.json();
    set({ items, isLoading: false });
    try { await db.items.bulkPut(items.map(toLocalItem)); } catch {}
  } else {
    // Fallback to Dexie
    try {
      const { fromLocalItem } = await import("@/lib/db");
      const localItems = await db.items.where("listId").equals(listId).toArray();
      if (localItems.length > 0) {
        set({ items: localItems.map(fromLocalItem) as Item[], isLoading: false });
        return;
      }
    } catch {}
    set({ isLoading: false });
  }
},
```

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
git add apps/web/src/lib/db.ts apps/web/src/stores/item-store.ts
git commit -m "feat: wire Dexie offline cache into item store"
```

---

### Task 4.3: Wire Sync Listener & Item Label API Routes

**Files:**
- Create: `apps/web/src/app/api/items/[id]/labels/route.ts`
- Create: `apps/web/src/app/api/items/[id]/labels/[labelId]/route.ts`
- Create: `apps/web/src/components/providers/sync-provider.tsx`
- Modify: `apps/web/src/lib/sync.ts`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Create POST /api/items/[id]/labels route**

Create `apps/web/src/app/api/items/[id]/labels/route.ts`:

```tsx
import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: itemId } = await params;
  let body: { labelId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("item_labels")
    .insert({ item_id: itemId, label_id: body.labelId });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
```

- [ ] **Step 2: Create DELETE /api/items/[id]/labels/[labelId] route**

Create `apps/web/src/app/api/items/[id]/labels/[labelId]/route.ts`:

```tsx
import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: itemId, labelId } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("item_labels")
    .delete()
    .eq("item_id", itemId)
    .eq("label_id", labelId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Add idempotency guard to startSyncListener**

In `sync.ts`, add at the top of the file:

```tsx
let syncStarted = false;
```

Update `startSyncListener`:

```tsx
export function startSyncListener() {
  if (syncStarted) return () => {};
  syncStarted = true;

  // ... existing code ...
}
```

- [ ] **Step 4: Add itemLabel sync case**

In `syncEntry`, update the `entityMap` and add the itemLabel case:

```tsx
async function syncEntry(entry: SyncQueueEntry) {
  if (entry.entity === "itemLabel") {
    if (entry.operation === "create") {
      const res = await fetch(`/api/items/${entry.entityId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId: entry.data.labelId }),
      });
      if (!res.ok) throw new Error("Sync failed");
    } else if (entry.operation === "delete") {
      const res = await fetch(
        `/api/items/${entry.entityId}/labels/${entry.data.labelId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Sync failed");
    }
    return;
  }

  // ... existing entityMap logic ...
}
```

- [ ] **Step 5: Create SyncProvider**

Create `apps/web/src/components/providers/sync-provider.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { startSyncListener } from "@/lib/sync";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = startSyncListener();
    return cleanup;
  }, []);

  return <>{children}</>;
}
```

- [ ] **Step 6: Wire SyncProvider into layout.tsx**

The root layout is a Server Component. The `SyncProvider` must be added to the dashboard layout which is a Client Component, or wrapped in the body. Since `layout.tsx` is a server component, add the provider in the dashboard layout or create a client-side wrapper.

Check if there's a dashboard layout:

If `apps/web/src/app/(dashboard)/layout.tsx` exists and is a client component, add `SyncProvider` there. Otherwise, create a `ClientProviders` wrapper in the root layout:

```tsx
// In layout.tsx body:
import { SyncProvider } from "@/components/providers/sync-provider";

// Wrap children:
<body ...>
  <SyncProvider>
    {children}
  </SyncProvider>
</body>
```

Note: `SyncProvider` is a `"use client"` component so it can be imported into a Server Component — it will be the client boundary.

- [ ] **Step 7: Verify and commit**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
git add apps/web/src/lib/sync.ts apps/web/src/components/providers/sync-provider.tsx apps/web/src/app/layout.tsx apps/web/src/app/api/items/\[id\]/labels/route.ts apps/web/src/app/api/items/\[id\]/labels/\[labelId\]/route.ts
git commit -m "feat: wire sync listener, SyncProvider, itemLabel sync, and label API routes"
```

---

### Task 4.4: Error Boundaries

**Files:**
- Create: `apps/web/src/components/providers/view-error-boundary.tsx`

- [ ] **Step 1: Create ViewErrorBoundary**

```tsx
"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ViewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-12">
          <p className="text-sm text-muted-foreground">Something went wrong.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Wrap main view pages**

Add `ViewErrorBoundary` around the main content in each page file:
- `apps/web/src/app/(dashboard)/inbox/page.tsx`
- `apps/web/src/app/(dashboard)/today/page.tsx`
- `apps/web/src/app/(dashboard)/upcoming/page.tsx`
- `apps/web/src/app/(dashboard)/list/[id]/page.tsx`

Example for each:

```tsx
import { ViewErrorBoundary } from "@/components/providers/view-error-boundary";

// Wrap the view component:
<ViewErrorBoundary>
  <ExistingViewComponent />
</ViewErrorBoundary>
```

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
git add apps/web/src/components/providers/view-error-boundary.tsx apps/web/src/app/
git commit -m "feat: add ViewErrorBoundary to main views"
```

---

### Task 4.5: Dead Code Cleanup & Schema Fixes

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`
- Modify: `packages/shared/src/validation/item.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Remove unused CheckCircle2 import from sidebar**

In `sidebar.tsx`, remove `CheckCircle2` from the lucide-react import (line 11).

- [ ] **Step 2: Add due_date regex validation and recurrence_rule to createItemSchema**

In `packages/shared/src/validation/item.ts`:

```tsx
// Change line 13:
due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

// Add after estimated_minutes (line 18):
recurrence_rule: z.string().optional(),
```

- [ ] **Step 3: Clean up unused packages**

Check if `@tiptap/extension-code-block-lowlight` and `rrule` are used anywhere in the codebase. If not, remove them from `apps/web/package.json` and run `pnpm install`.

```bash
# Check usage:
grep -r "code-block-lowlight" apps/web/src/ || echo "Not used"
grep -r "rrule" apps/web/src/ || echo "Not used"

# If unused, remove:
cd apps/web && pnpm remove @tiptap/extension-code-block-lowlight rrule && cd ../..
```

- [ ] **Step 4: Update CLAUDE.md phase status**

Change Phase 2 from "IN PROGRESS" to "DONE". Add Phase 5 entry:

```markdown
- `2026-03-15-ai-todo-phase5-completion.md` — Phase 5 (IN PROGRESS)
```

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
pnpm turbo lint
git add apps/web/src/components/layout/sidebar.tsx packages/shared/src/validation/item.ts CLAUDE.md apps/web/package.json pnpm-lock.yaml
git commit -m "chore: dead code cleanup, schema fixes, remove unused packages, update phase status"
```

---

## Final Verification

After all chunks are complete:

- [ ] Run full build: `pnpm turbo build`
- [ ] Run type check: `pnpm turbo lint`
- [ ] Manual smoke test: open app, create task via QuickAdd with date + list, add label, create subtask, drag to reorder, use ⌘K to navigate
