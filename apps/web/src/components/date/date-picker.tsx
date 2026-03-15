"use client";

import { useState, useRef, useEffect } from "react";
import {
  format,
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  trigger?: React.ReactNode;
  showTime?: boolean;
  timeValue?: string | null;
  onTimeChange?: (time: string | null) => void;
}

export function DatePicker({ value, onChange, trigger, showTime, timeValue, onTimeChange }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState(timeValue ? parseInt(timeValue.split(":")[0]) : 9);
  const [minute, setMinute] = useState(timeValue ? parseInt(timeValue.split(":")[1]) : 0);
  const [currentMonth, setCurrentMonth] = useState(
    value ? new Date(value) : new Date()
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : null;

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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const quickOptions = [
    { label: "Today", date: new Date() },
    { label: "Tomorrow", date: addDays(new Date(), 1) },
    { label: "Next Week", date: addDays(new Date(), 7) },
    { label: "Next Month", date: addMonths(new Date(), 1) },
  ];

  const handleSelect = (date: Date) => {
    onChange(format(date, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {trigger || (
          <>
            <Calendar className="h-3.5 w-3.5" />
            {value ? format(new Date(value), "MMM d") : "Set date"}
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-popover p-3 shadow-lg">
          {/* Quick options */}
          <div className="mb-3 flex flex-wrap gap-1">
            {quickOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleSelect(opt.date)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs transition-colors",
                  selectedDate && isSameDay(selectedDate, opt.date)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
            {value && (
              <button
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
              >
                Clear
              </button>
            )}
          </div>

          {/* Month navigation */}
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <div
                key={d}
                className="py-1 text-[10px] font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const inMonth = isSameMonth(day, currentMonth);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleSelect(day)}
                  className={cn(
                    "flex h-8 w-full items-center justify-center rounded-md text-xs transition-colors",
                    !inMonth && "text-muted-foreground/30",
                    inMonth &&
                      !selected &&
                      "text-foreground hover:bg-muted",
                    today && !selected && "ring-1 ring-primary/30",
                    selected && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

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
                  type="button"
                  onClick={() => onTimeChange?.(null)}
                  className="text-xs text-destructive hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
