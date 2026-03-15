"use client";

import { useState, type ChangeEvent } from "react";
import { Mail, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type GmailTrigger = "starred" | "label";

export function GmailSettings() {
  const [enabled, setEnabled] = useState(false);
  const [trigger, setTrigger] = useState<GmailTrigger>("starred");
  const [labelName, setLabelName] = useState("Todo");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Mail className="h-5 w-5 text-muted-foreground" />
        <div>
          <h3 className="text-sm font-medium text-foreground">Gmail Capture</h3>
          <p className="text-xs text-muted-foreground">
            Automatically create tasks from starred or labeled emails
          </p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <span className="text-sm text-foreground">Enable Gmail scanning</span>
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            enabled ? "bg-primary" : "bg-muted"
          )}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
              enabled && "translate-x-5"
            )}
          />
        </button>
      </div>

      {enabled && (
        <>
          {/* Trigger selection */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Capture trigger
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTrigger("starred")}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  trigger === "starred"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                Starred emails
              </button>
              <button
                type="button"
                onClick={() => setTrigger("label")}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  trigger === "label"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                Gmail label
              </button>
            </div>
          </div>

          {trigger === "label" && (
            <div className="space-y-1">
              <label
                htmlFor="gmail-label-name"
                className="text-xs font-medium text-muted-foreground"
              >
                Label name
              </label>
              <input
                id="gmail-label-name"
                type="text"
                value={labelName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setLabelName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g., Todo"
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Gmail integration requires Google OAuth with gmail.readonly scope.
            <a
              href="#"
              className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
            >
              Connect Google Account <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </>
      )}
    </div>
  );
}
