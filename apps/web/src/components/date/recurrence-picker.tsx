"use client";

import { useState, useRef, useEffect } from "react";
import { Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecurrencePickerProps {
  value: string | null;
  onChange: (rule: string | null) => void;
}

const PRESETS = [
  { label: "Daily", rule: "FREQ=DAILY" },
  { label: "Weekdays", rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { label: "Weekly", rule: "FREQ=WEEKLY" },
  { label: "Biweekly", rule: "FREQ=WEEKLY;INTERVAL=2" },
  { label: "Monthly", rule: "FREQ=MONTHLY" },
  { label: "Yearly", rule: "FREQ=YEARLY" },
];

function getRuleLabel(rule: string): string {
  const preset = PRESETS.find((p) => p.rule === rule);
  if (preset) return preset.label;
  if (rule.includes("FREQ=DAILY")) return "Daily";
  if (rule.includes("FREQ=WEEKLY")) return "Weekly";
  if (rule.includes("FREQ=MONTHLY")) return "Monthly";
  return "Custom";
}

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
          value
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Repeat className="h-3.5 w-3.5" />
        {value ? getRuleLabel(value) : "Repeat"}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
          {PRESETS.map((preset) => (
            <button
              key={preset.rule}
              onClick={() => {
                onChange(preset.rule);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center rounded-md px-2.5 py-1.5 text-sm transition-colors",
                value === preset.rule
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {preset.label}
            </button>
          ))}
          {value && (
            <>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className="flex w-full items-center rounded-md px-2.5 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              >
                Remove
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
