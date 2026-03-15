"use client";

import { Button } from "@/components/ui/button";

const quickActions = [
  { label: "What's next?", message: "What should I work on next?" },
  { label: "Reshuffle", message: "Reshuffle my schedule for the rest of the day" },
  { label: "Add break", message: "Add a 15-minute break after my current task" },
  { label: "Day summary", message: "Give me a summary of my day so far" },
];

interface QuickActionsProps {
  onAction: (message: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2">
      {quickActions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          onClick={() => onAction(action.message)}
          className="shrink-0 border-border text-xs text-muted-foreground hover:bg-muted"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
