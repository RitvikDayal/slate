"use client";

import { useSlackSuggestions } from "@/lib/hooks/use-slack-suggestions";
import { SuggestionCard } from "./suggestion-card";
import { MessageSquare, Loader2 } from "lucide-react";

export function SuggestionsPanel() {
  const { suggestions, isLoading, acceptSuggestion, dismissSuggestion } =
    useSlackSuggestions("pending");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="border-b border-slate-800 p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-indigo-400" />
        <h3 className="text-sm font-medium text-slate-300">
          Slack Suggestions ({suggestions.length})
        </h3>
      </div>
      <div className="space-y-2">
        {suggestions.slice(0, 5).map((s) => (
          <SuggestionCard
            key={s.id}
            suggestion={s}
            onAccept={(id) => acceptSuggestion(id)}
            onDismiss={(id) => dismissSuggestion(id)}
          />
        ))}
        {suggestions.length > 5 && (
          <p className="text-center text-xs text-slate-500">
            +{suggestions.length - 5} more suggestions
          </p>
        )}
      </div>
    </div>
  );
}
