"use client";

import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  ref_type: string | null;
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export function NotificationList({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationListProps) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">Notifications</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-xs text-muted-foreground"
          >
            <Check className="mr-1 h-3 w-3" /> Mark all read
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-muted-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </p>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={cn(
              "cursor-pointer border-b border-border px-3 py-2.5 hover:bg-muted/50",
              !n.read_at && "bg-primary/10"
            )}
            onClick={() => !n.read_at && onMarkAsRead(n.id)}
          >
            <div className="flex items-start gap-2">
              {!n.read_at && (
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {n.body}
                  </p>
                )}
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(parseISO(n.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
