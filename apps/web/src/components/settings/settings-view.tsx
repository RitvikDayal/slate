"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  RefreshCw,
  Bell,
  Mail,
  Smartphone,
  Send,
  Loader2,
  MessageSquare,
  Tag,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/lib/hooks/use-push-notifications";
import { useLabelStore } from "@/stores/label-store";
import { formatDistanceToNow, parseISO } from "date-fns";

interface Preferences {
  push_enabled: boolean;
  email_enabled: boolean;
  email_morning_plan: boolean;
  email_eod_report: boolean;
  email_task_reminders: boolean;
  in_app_enabled: boolean;
}

const defaultPrefs: Preferences = {
  push_enabled: true,
  email_enabled: true,
  email_morning_plan: true,
  email_eod_report: true,
  email_task_reminders: false,
  in_app_enabled: true,
};

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

export function SettingsView() {
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [slackChannels, setSlackChannels] = useState<string[]>([]);
  const [newChannel, setNewChannel] = useState("");
  const [scanning, setScanning] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6366f1");
  const { labels, fetchLabels, createLabel, deleteLabel } = useLabelStore();

  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
  } = usePushNotifications();

  // Fetch preferences
  useEffect(() => {
    async function fetchPrefs() {
      const res = await window.fetch("/api/settings/preferences");
      if (res.ok) {
        const data = await res.json();
        setPrefs(data);
      }
      setLoading(false);
    }
    fetchPrefs();
  }, []);

  // Fetch labels
  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  // Fetch Slack channels
  useEffect(() => {
    async function fetchSlackChannels() {
      const res = await window.fetch("/api/slack/channels");
      if (res.ok) {
        const data = await res.json();
        setSlackChannels(data.channels || []);
      }
    }
    fetchSlackChannels();
  }, []);

  // Fetch calendar sync status
  useEffect(() => {
    async function fetchCalendarStatus() {
      const res = await window.fetch("/api/calendar/sync");
      if (res.ok) {
        const data = await res.json();
        setLastSyncedAt(data.lastSyncedAt);
      }
    }
    fetchCalendarStatus();
  }, []);

  const updatePref = useCallback(
    async (key: keyof Preferences, value: boolean) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
      await window.fetch("/api/settings/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
    },
    []
  );

  const handleSync = async () => {
    setSyncing(true);
    await window.fetch("/api/calendar/sync", { method: "POST" });
    // Refresh sync status after a short delay
    setTimeout(async () => {
      const res = await window.fetch("/api/calendar/sync");
      if (res.ok) {
        const data = await res.json();
        setLastSyncedAt(data.lastSyncedAt);
      }
      setSyncing(false);
    }, 2000);
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      await pushSubscribe();
    } else {
      await pushUnsubscribe();
    }
    await updatePref("push_enabled", enabled);
  };

  const handleAddChannel = async () => {
    if (!newChannel.trim()) return;
    const updated = [...slackChannels, newChannel.trim()];
    setSlackChannels(updated);
    setNewChannel("");
    await window.fetch("/api/slack/channels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channels: updated }),
    });
  };

  const handleRemoveChannel = async (channel: string) => {
    const updated = slackChannels.filter((c) => c !== channel);
    setSlackChannels(updated);
    await window.fetch("/api/slack/channels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channels: updated }),
    });
  };

  const handleSlackScan = async () => {
    setScanning(true);
    await window.fetch("/api/slack/scan", { method: "POST" });
    setTimeout(() => setScanning(false), 3000);
  };

  const handleTestNotification = async () => {
    setSendingTest(true);
    await window.fetch("/api/notifications/test", { method: "POST" });
    setSendingTest(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your calendar, notifications, and preferences.
      </p>

      {/* Google Calendar Section */}
      <Card className="mt-6 border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Google Calendar</h2>
        </div>
        <Separator className="my-4 bg-border" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              Status:{" "}
              <span
                className={
                  lastSyncedAt ? "text-success" : "text-muted-foreground"
                }
              >
                {lastSyncedAt ? "Connected" : "Not connected"}
              </span>
            </p>
            {lastSyncedAt && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last synced{" "}
                {formatDistanceToNow(parseISO(lastSyncedAt), {
                  addSuffix: true,
                })}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="border-border text-secondary-foreground"
          >
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync now
          </Button>
        </div>
      </Card>

      {/* Slack Section */}
      <Card className="mt-4 border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Slack Integration</h2>
        </div>
        <Separator className="my-4 bg-border" />

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Monitored Channels</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add Slack channel IDs to scan for tasks. Find IDs in channel
              details.
            </p>
          </div>

          {slackChannels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {slackChannels.map((ch) => (
                <span
                  key={ch}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-secondary-foreground"
                >
                  #{ch}
                  <button
                    type="button"
                    onClick={() => handleRemoveChannel(ch)}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              placeholder="Channel ID (e.g. C01ABC23DEF)"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddChannel();
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddChannel}
              className="border-border text-secondary-foreground"
            >
              Add
            </Button>
          </div>

          <Separator className="bg-border" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Manual Scan</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Scan configured channels now for task suggestions.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSlackScan}
              disabled={scanning || slackChannels.length === 0}
              className="border-border text-secondary-foreground"
            >
              {scanning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Scan now
            </Button>
          </div>
        </div>
      </Card>

      {/* Labels Section */}
      <Card className="mt-4 border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Tag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Labels</h2>
        </div>
        <Separator className="my-4 bg-border" />

        <div className="space-y-3">
          {labels.map((label) => (
            <div key={label.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                <span className="text-sm">{label.name}</span>
              </div>
              <button
                type="button"
                onClick={() => deleteLabel(label.id)}
                className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add label form */}
          <div className="flex items-center gap-2 pt-2">
            <div className="flex gap-1">
              {["#6366f1", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6"].map(
                (color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewLabelColor(color)}
                    className={cn(
                      "h-6 w-6 rounded-full transition-transform",
                      newLabelColor === color && "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card"
                    )}
                    style={{ backgroundColor: color }}
                  />
                )
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="Label name"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newLabelName.trim()) {
                  await createLabel({ name: newLabelName.trim(), color: newLabelColor });
                  setNewLabelName("");
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (newLabelName.trim()) {
                  await createLabel({ name: newLabelName.trim(), color: newLabelColor });
                  setNewLabelName("");
                }
              }}
              disabled={!newLabelName.trim()}
              className="border-border text-secondary-foreground"
            >
              Add
            </Button>
          </div>
        </div>
      </Card>

      {/* Notifications Section */}
      <Card className="mt-4 border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        <Separator className="my-4 bg-border" />

        {/* Push Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Push notifications</p>
                {!pushSupported && (
                  <p className="text-xs text-muted-foreground">
                    Not supported in this browser
                  </p>
                )}
              </div>
            </div>
            <Toggle
              checked={pushSubscribed && prefs.push_enabled}
              onChange={handlePushToggle}
              disabled={!pushSupported}
            />
          </div>

          <Separator className="bg-border" />

          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Email notifications</p>
            </div>
            <Toggle
              checked={prefs.email_enabled}
              onChange={(val) => updatePref("email_enabled", val)}
            />
          </div>

          {prefs.email_enabled && (
            <div className="ml-7 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-secondary-foreground">Morning plan email</p>
                <Toggle
                  checked={prefs.email_morning_plan}
                  onChange={(val) => updatePref("email_morning_plan", val)}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-secondary-foreground">EOD report email</p>
                <Toggle
                  checked={prefs.email_eod_report}
                  onChange={(val) => updatePref("email_eod_report", val)}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-secondary-foreground">Task reminder emails</p>
                <Toggle
                  checked={prefs.email_task_reminders}
                  onChange={(val) => updatePref("email_task_reminders", val)}
                />
              </div>
            </div>
          )}

          <Separator className="bg-border" />

          {/* In-App Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">In-app notifications</p>
            </div>
            <Toggle
              checked={prefs.in_app_enabled}
              onChange={(val) => updatePref("in_app_enabled", val)}
            />
          </div>
        </div>
      </Card>

      {/* Test Notification */}
      <Card className="mt-4 border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Test notification</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Send a test in-app notification to verify your setup.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestNotification}
            disabled={sendingTest}
            className="border-border text-secondary-foreground"
          >
            {sendingTest ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send test
          </Button>
        </div>
      </Card>
    </div>
  );
}
