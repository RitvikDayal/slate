"use client";

import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";

  // Extract text content from parts
  const textContent = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  // Extract tool invocation parts
  const toolParts = message.parts.filter(
    (part) => part.type.startsWith("tool-") || part.type === "dynamic-tool"
  );

  return (
    <div className={cn("flex gap-3", isAssistant ? "items-start" : "items-start justify-end")}>
      {isAssistant && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
          isAssistant
            ? "bg-slate-800 text-slate-100"
            : "bg-indigo-600 text-white"
        )}
      >
        {textContent && (
          <div className="whitespace-pre-wrap">{textContent}</div>
        )}

        {/* Show tool invocations */}
        {toolParts.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-slate-700 pt-2">
            {toolParts.map((part, i) => {
              const toolName =
                part.type === "dynamic-tool"
                  ? (part as { toolName?: string }).toolName ?? "tool"
                  : part.type.replace("tool-", "");
              const state = (part as { state?: string }).state ?? "unknown";
              return (
                <div key={i} className="text-xs text-slate-400">
                  {state === "output-available" ? (
                    <span>Used {toolName} — done</span>
                  ) : state === "output-error" ? (
                    <span>Used {toolName} — error</span>
                  ) : (
                    <span>Using {toolName}...</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isAssistant && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
