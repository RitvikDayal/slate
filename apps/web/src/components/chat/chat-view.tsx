"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { QuickActions } from "./quick-actions";
import { SuggestionsPanel } from "@/components/slack/suggestions-panel";
import { SlateIcon } from "@/components/brand/slate-logo";

const suggestionChips = [
  "Plan my day",
  "What's overdue?",
  "Summarize my week",
  "Create a task",
];

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-primary"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.5,
            delay: i * 0.15,
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
        />
      ))}
    </div>
  );
}

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
  const lastUserMessage = useRef<string>("");

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    lastUserMessage.current = input;
    sendMessage({ text: input });
    setInput("");
  };

  const handleQuickAction = (action: string) => {
    lastUserMessage.current = action;
    sendMessage({ text: action });
  };

  const handleRetry = () => {
    if (lastUserMessage.current) {
      sendMessage({ text: lastUserMessage.current });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold">AI Assistant</h1>
        <p className="text-xs text-muted-foreground">
          Ask me to manage tasks, adjust your schedule, or plan your day
        </p>
      </div>

      {/* Slack Suggestions */}
      <SuggestionsPanel />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <SlateIcon size={40} className="mb-3 opacity-30" />
            <p className="text-lg font-medium text-foreground">How can I help?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap a suggestion or type a message
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {suggestionChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleQuickAction(chip)}
                  className="rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && <ThinkingDots />}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <p>Something went wrong. Please try again.</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-2 text-sm font-medium underline underline-offset-4 hover:text-destructive/80"
              >
                Try again
              </button>
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
