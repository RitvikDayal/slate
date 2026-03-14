"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatInputProps {
  input: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export function ChatInput({ input, onChange, onSubmit, isLoading }: ChatInputProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="border-t border-slate-800 p-4"
    >
      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={onChange}
          placeholder="Ask anything about your tasks..."
          className="flex-1 border-slate-700 bg-slate-900 text-sm"
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-500"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
