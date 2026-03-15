"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Hash, ChevronDown, ChevronUp, Inbox } from "lucide-react";
import type { SlackTaskSuggestion } from "@ai-todo/shared";
import { useItemStore } from "@/stores/item-store";
import { useListStore } from "@/stores/list-store";

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-success/10 text-success",
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { createItem } = useItemStore();
  const { getInbox } = useListStore();

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

  const handleSaveToInbox = async () => {
    const inboxList = getInbox();
    if (!inboxList) return;
    setSaving(true);
    try {
      await createItem({
        list_id: inboxList.id,
        title: suggestion.suggested_title || suggestion.message_text.slice(0, 100),
        type: "task",
        priority: suggestion.suggested_priority ?? "none",
        source: "slack",
        source_ref: {
          channel_id: suggestion.channel_id,
          channel_name: suggestion.channel_name,
          message_ts: suggestion.message_ts,
        },
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const busy = accepting || dismissing || saving;

  return (
    <Card className="border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            {suggestion.suggested_title}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
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
                className="border-border text-muted-foreground"
              >
                {suggestion.suggested_effort}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {Math.round(suggestion.confidence * 100)}% confident
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleSaveToInbox}
            disabled={busy || saved}
            className="text-primary hover:bg-primary/10 hover:text-primary"
            title="Save to Inbox"
          >
            <Inbox className="h-4 w-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleAccept}
            disabled={busy}
            className="text-success hover:bg-success/10 hover:text-success"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleDismiss}
            disabled={busy}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expandable original message */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-secondary-foreground"
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {expanded ? "Hide" : "Show"} original message
      </button>
      {expanded && (
        <div className="mt-2 rounded bg-background p-3 text-sm text-muted-foreground">
          <p className="whitespace-pre-wrap">{suggestion.message_text}</p>
          <p className="mt-2 text-xs italic text-muted-foreground">
            {suggestion.reasoning}
          </p>
        </div>
      )}
    </Card>
  );
}
