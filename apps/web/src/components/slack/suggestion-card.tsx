"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Hash, ChevronDown, ChevronUp } from "lucide-react";
import type { SlackTaskSuggestion } from "@ai-todo/shared";

const priorityColors: Record<string, string> = {
  high: "bg-red-900/30 text-red-400",
  medium: "bg-yellow-900/30 text-yellow-400",
  low: "bg-green-900/30 text-green-400",
};

export function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: SlackTaskSuggestion;
  onAccept: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept(suggestion.id);
    } finally {
      setAccepting(false);
    }
  };

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await onDismiss(suggestion.id);
    } finally {
      setDismissing(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">
            {suggestion.suggested_title}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Hash className="h-3 w-3" />
              {suggestion.channel_name}
            </span>
            <Badge
              variant="secondary"
              className={
                priorityColors[suggestion.suggested_priority] || ""
              }
            >
              {suggestion.suggested_priority}
            </Badge>
            {suggestion.suggested_effort && (
              <Badge
                variant="outline"
                className="border-slate-700 text-slate-400"
              >
                {suggestion.suggested_effort}
              </Badge>
            )}
            <span className="text-xs text-slate-500">
              {Math.round(suggestion.confidence * 100)}% confident
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleAccept}
            disabled={accepting || dismissing}
            className="text-green-400 hover:bg-green-900/30 hover:text-green-300"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleDismiss}
            disabled={accepting || dismissing}
            className="text-red-400 hover:bg-red-900/30 hover:text-red-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expandable original message */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {expanded ? "Hide" : "Show"} original message
      </button>
      {expanded && (
        <div className="mt-2 rounded bg-slate-950 p-3 text-sm text-slate-300">
          <p className="whitespace-pre-wrap">{suggestion.message_text}</p>
          <p className="mt-2 text-xs italic text-slate-500">
            {suggestion.reasoning}
          </p>
        </div>
      )}
    </Card>
  );
}
