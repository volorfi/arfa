"use client";

import * as React from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Notification bell — placeholder for the alerts panel that lands when
 * /dashboard/alerts is wired. For now, surfaces a count badge if we have
 * any unread items (always 0 with mock data).
 */
export function NotificationBell({
  unreadCount = 0,
}: {
  unreadCount?: number;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={
        unreadCount > 0
          ? `Notifications: ${unreadCount} unread`
          : "Notifications"
      }
      className="relative text-text-muted hover:text-text-primary"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span
          aria-hidden
          className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-display text-[10px] font-semibold text-destructive-foreground"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
