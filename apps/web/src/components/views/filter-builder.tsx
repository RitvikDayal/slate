"use client";

import { useState } from "react";
import { Plus, X, Save } from "lucide-react";
import type { FilterRule, FilterField, FilterOp } from "@ai-todo/shared";

const FIELD_OPTIONS: { value: FilterField; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "due_date", label: "Due Date" },
  { value: "labels", label: "Labels" },
  { value: "list_id", label: "List" },
  { value: "effort", label: "Effort" },
  { value: "is_completed", label: "Completed" },
  { value: "source", label: "Source" },
  { value: "created_at", label: "Created At" },
];

const DATE_OPS: { value: FilterOp; label: string }[] = [
  { value: "eq", label: "is" },
  { value: "lt", label: "before" },
  { value: "gt", label: "after" },
  { value: "lte", label: "on or before" },
  { value: "gte", label: "on or after" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const STRING_OPS: { value: FilterOp; label: string }[] = [
  { value: "eq", label: "is" },
  { value: "neq", label: "is not" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const BOOLEAN_OPS: { value: FilterOp; label: string }[] = [
  { value: "eq", label: "is" },
];

function getOpsForField(
  field: FilterField
): { value: FilterOp; label: string }[] {
  switch (field) {
    case "due_date":
    case "created_at":
      return DATE_OPS;
    case "is_completed":
      return BOOLEAN_OPS;
    default:
      return STRING_OPS;
  }
}

const PRIORITY_VALUES = ["none", "low", "medium", "high"];
const EFFORT_VALUES = ["xs", "s", "m", "l", "xl"];
const SOURCE_VALUES = ["manual", "slack", "ai_suggested", "gmail"];

function ValueInput({
  field,
  op,
  value,
  onChange,
}: {
  field: FilterField;
  op: FilterOp;
  value: string | number | boolean | null;
  onChange: (v: string | number | boolean | null) => void;
}) {
  if (op === "is_empty" || op === "is_not_empty") {
    return null;
  }

  if (field === "is_completed") {
    return (
      <select
        value={String(value ?? "true")}
        onChange={(e) => onChange(e.target.value === "true")}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (field === "priority") {
    return (
      <select
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">Select...</option>
        {PRIORITY_VALUES.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }

  if (field === "effort") {
    return (
      <select
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">Select...</option>
        {EFFORT_VALUES.map((v) => (
          <option key={v} value={v}>
            {v.toUpperCase()}
          </option>
        ))}
      </select>
    );
  }

  if (field === "source") {
    return (
      <select
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">Select...</option>
        {SOURCE_VALUES.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }

  if (field === "due_date" || field === "created_at") {
    return (
      <input
        type="date"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Value..."
      className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}

interface FilterBuilderProps {
  initialFilters?: FilterRule[];
  onSave: (filters: FilterRule[]) => void;
  onCancel?: () => void;
  saveLabel?: string;
}

export function FilterBuilder({
  initialFilters = [],
  onSave,
  onCancel,
  saveLabel = "Apply Filters",
}: FilterBuilderProps) {
  const [rules, setRules] = useState<FilterRule[]>(
    initialFilters.length > 0
      ? initialFilters
      : [{ field: "priority", op: "eq", value: null }]
  );

  function addRule() {
    if (rules.length >= 20) return;
    setRules([...rules, { field: "priority", op: "eq", value: null }]);
  }

  function removeRule(index: number) {
    setRules(rules.filter((_, i) => i !== index));
  }

  function updateRule(index: number, updates: Partial<FilterRule>) {
    setRules(
      rules.map((rule, i) => {
        if (i !== index) return rule;
        const updated = { ...rule, ...updates };
        // Reset op/value when field changes
        if (updates.field && updates.field !== rule.field) {
          const ops = getOpsForField(updates.field);
          updated.op = ops[0]?.value ?? "eq";
          updated.value = null;
        }
        return updated;
      })
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-muted-foreground w-10">
            {index === 0 ? "Where" : "And"}
          </span>

          <select
            value={rule.field}
            onChange={(e) =>
              updateRule(index, { field: e.target.value as FilterField })
            }
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {FIELD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={rule.op}
            onChange={(e) =>
              updateRule(index, { op: e.target.value as FilterOp })
            }
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {getOpsForField(rule.field).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <ValueInput
            field={rule.field}
            op={rule.op}
            value={rule.value}
            onChange={(v) => updateRule(index, { value: v })}
          />

          <button
            type="button"
            onClick={() => removeRule(index)}
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Remove filter rule"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={addRule}
          disabled={rules.length >= 20}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add filter
        </button>

        <div className="flex-1" />

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={() => onSave(rules)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Save className="h-3.5 w-3.5" />
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
