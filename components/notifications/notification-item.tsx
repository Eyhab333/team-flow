"use client";

import { BellDot } from "lucide-react";

import type { AppNotification } from "@/types/notification";

const NOTIFICATION_TIME_ZONE = "Asia/Riyadh";
const ARABIC_GREGORIAN_LOCALE = "ar-SA-u-ca-gregory-nu-latn";

const notificationDateFormatter = new Intl.DateTimeFormat(
  ARABIC_GREGORIAN_LOCALE,
  {
    timeZone: NOTIFICATION_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  },
);

const notificationTimeFormatter = new Intl.DateTimeFormat(
  ARABIC_GREGORIAN_LOCALE,
  {
    timeZone: NOTIFICATION_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  },
);

function formatPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function formatNotificationDate(notification: AppNotification): string {
  if (!notification.createdAt) {
    return "الآن";
  }

  const date = notification.createdAt.toDate();
  const dateParts = notificationDateFormatter.formatToParts(date);
  const timeParts = notificationTimeFormatter.formatToParts(date);
  const weekday = formatPart(dateParts, "weekday");
  const day = formatPart(dateParts, "day");
  const month = formatPart(dateParts, "month");
  const year = formatPart(dateParts, "year");
  const hour = formatPart(timeParts, "hour");
  const minute = formatPart(timeParts, "minute");
  const dayPeriod = formatPart(timeParts, "dayPeriod");

  return `${weekday} ${day} ${month} ${year} · ${hour}:${minute} ${dayPeriod}`;
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
