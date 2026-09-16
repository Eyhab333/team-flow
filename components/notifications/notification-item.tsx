"use client";

import { BellDot } from "lucide-react";

import type { AppNotification } from "@/types/notification";

function formatNotificationDate(notification: AppNotification): string {
  if (!notification.createdAt) {
    return "الآن";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(notification.createdAt.toDate());
}

interface NotificationItemProps {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
  isOpening: boolean;
}

export function NotificationItem({
  notification,
  onOpen,
  isOpening,
}: NotificationItemProps) {
  const isUnread = notification.readAt === null;

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      disabled={isOpening}
      className={`flex w-full gap-3 px-3 py-3 text-right transition-colors outline-none hover:bg-muted/70 focus-visible:bg-muted/70 disabled:cursor-wait ${
        isUnread ? "bg-primary/5" : ""
      }`}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <BellDot aria-hidden="true" className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-bold text-foreground">
            {notification.title}
          </span>
          {isUnread ? (
            <span aria-label="إشعار غير مقروء" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
          ) : null}
        </span>
        <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
          {notification.body}
        </span>
        <span className="mt-1.5 block text-[11px] text-muted-foreground">
          {formatNotificationDate(notification)}
        </span>
      </span>
    </button>
  );
}
