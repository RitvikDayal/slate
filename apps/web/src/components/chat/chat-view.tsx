"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { QuickActions } from "./quick-actions";

export function ChatView() {
  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    id: "main-chat",
    onError: (err) => {
      console.error("Chat error:", err);
    },
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleQuickAction = (action: string) => {
    sendMessage({ text: action });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-3">
        <h1 className="text-lg font-semibold">AI Assistant</h1>
        <p className="text-xs text-slate-400">
          Ask me to manage tasks, adjust your schedule, or plan your day
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-slate-400">Hello! How can I help you today?</p>
            <p className="mt-1 text-sm text-slate-500">
              Try &quot;What&apos;s on my schedule?&quot; or &quot;Add a task to review PRs&quot;
            </p>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
              Thinking...
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-400">
              Something went wrong. Please try again.
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <QuickActions onAction={handleQuickAction} />

      {/* Input */}
      <ChatInput
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
