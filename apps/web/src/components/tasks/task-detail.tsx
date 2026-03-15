"use client";

import { useState, useCallback } from "react";
import { Calendar, Flag, Repeat, Tag, Plus, X, GripVertical } from "lucide-react";
import { format } from "date-fns";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useItemStore } from "@/stores/item-store";
import { useLabelStore } from "@/stores/label-store";
import { RichEditor } from "@/components/editor/rich-editor";
import { DatePicker } from "@/components/date/date-picker";
import { RecurrencePicker } from "@/components/date/recurrence-picker";
import "@/styles/editor.css";
import type { Item } from "@ai-todo/shared";

const PRIORITY_OPTIONS = [
  { value: "none", label: "None", color: "" },
  { value: "low", label: "Low", color: "bg-priority-low" },
  { value: "medium", label: "Medium", color: "bg-priority-medium" },
  { value: "high", label: "High", color: "bg-priority-high" },
] as const;

function SortableSubtask({
  child,
  toggleComplete,
}: {
  child: Item;
  toggleComplete: (id: string) => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: child.id,
    data: { type: "subtask", parentId: child.parent_item_id, title: child.title },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/subtask flex items-center gap-2 py-1"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-4 w-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover/subtask:opacity-100 active:cursor-grabbing"
        onClick={(e) => e.preventDefault()}
      >
        <GripVertical className="h-3 w-3" />
      </button>
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
  );
}

interface TaskDetailProps {
  item: Item;
}

export function TaskDetail({ item }: TaskDetailProps) {
  const updateItem = useItemStore((s) => s.updateItem);
  const subtasks = useItemStore((s) =>
    s.items
      .filter((i) => i.parent_item_id === item.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  );
  const toggleComplete = useItemStore((s) => s.toggleComplete);
  const labels = useLabelStore((s) => s.labels);
  const [title, setTitle] = useState(item.title);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  const subtaskIds = subtasks.map((s) => s.id);

  const handleTitleBlur = useCallback(() => {
    if (title !== item.title) {
      updateItem(item.id, { title });
    }
  }, [item.id, item.title, title, updateItem]);

  const handleContentUpdate = useCallback(
    (json: Record<string, unknown>) => {
      updateItem(item.id, { content_json: json });
    },
    [item.id, updateItem]
  );

  const handlePriorityChange = (priority: string) => {
    updateItem(item.id, {
      priority: priority as "none" | "low" | "medium" | "high",
    });
    setShowPriorityMenu(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Title */}
      <div className="px-6 pt-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="w-full bg-transparent text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
          placeholder="Task title..."
        />
      </div>

      {/* Metadata chips */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-3">
        {/* Due date */}
        <DatePicker
          value={item.due_date}
          onChange={(date) => updateItem(item.id, { due_date: date })}
          showTime
          timeValue={item.due_time}
          onTimeChange={(time) => updateItem(item.id, { due_time: time })}
          trigger={
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {item.due_date
                ? format(new Date(item.due_date), "MMM d")
                : "Set date"}
              {item.due_time && (
                <span className="text-muted-foreground">{item.due_time}</span>
              )}
            </span>
          }
        />

        {/* Priority */}
        <div className="relative">
          <button
            onClick={() => setShowPriorityMenu(!showPriorityMenu)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
              item.priority !== "none"
                ? `bg-priority-${item.priority}-bg text-priority-${item.priority}`
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Flag className="h-3.5 w-3.5" />
            {item.priority === "none"
              ? "Priority"
              : item.priority.charAt(0).toUpperCase() +
                item.priority.slice(1)}
          </button>
          {showPriorityMenu && (
            <div className="absolute left-0 top-full z-50 mt-1 w-36 rounded-lg border border-border bg-popover p-1 shadow-lg">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handlePriorityChange(opt.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    item.priority === opt.value
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {opt.color && (
                    <span
                      className={cn("h-2 w-2 rounded-full", opt.color)}
                    />
                  )}
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recurrence */}
        <RecurrencePicker
          value={item.recurrence_rule}
          onChange={(rule) =>
            updateItem(item.id, { recurrence_rule: rule })
          }
        />

        {/* Labels */}
        <div className="flex items-center gap-1">
          <Tag className="h-3 w-3 text-muted-foreground" />
          {item.labels?.map((label) => (
            <button
              key={label.id}
              type="button"
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
              type="button"
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
                      type="button"
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

        {/* Effort & time */}
        {item.effort && (
          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            {item.effort.toUpperCase()}
          </span>
        )}
        {item.estimated_minutes && (
          <span className="text-xs text-muted-foreground">
            {item.estimated_minutes}m
          </span>
        )}
      </div>

      <div className="mx-6 border-t border-border" />

      {/* Rich text editor */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <RichEditor
          content={item.content_json}
          onUpdate={handleContentUpdate}
        />
      </div>

      {/* Subtasks */}
      <div className="border-t border-border px-6 py-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Subtasks
        </p>
        <SortableContext
          items={subtaskIds}
          strategy={verticalListSortingStrategy}
        >
          {subtasks.map((child) => (
            <SortableSubtask
              key={child.id}
              child={child}
              toggleComplete={toggleComplete}
            />
          ))}
        </SortableContext>
        <SubtaskInput parentId={item.id} listId={item.list_id} />
      </div>

      {/* AI Notes (if any) */}
      {item.ai_notes && (
        <div className="border-t border-border px-6 py-3">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            AI Notes
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.ai_notes}
          </p>
        </div>
      )}
    </div>
  );
}

function SubtaskInput({
  parentId,
  listId,
}: {
  parentId: string;
  listId: string;
}) {
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
            priority: "none",
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
