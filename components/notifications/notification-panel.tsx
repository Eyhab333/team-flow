"use client";

import { CheckCheck, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/components/notifications/notification-item";
import type { AppNotification } from "@/types/notification";

interface NotificationPanelProps {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  hasError: boolean;
  isMarkingAllRead: boolean;
  openingNotificationId: string | null;
  onMarkAllRead: () => void;
  onOpenNotification: (notification: AppNotification) => void;
}

export function NotificationPanel({
  notifications,
  unreadCount,
  isLoading,
  hasError,
  isMarkingAllRead,
  openingNotificationId,
  onMarkAllRead,
  onOpenNotification,
}: NotificationPanelProps) {
  return (
    <section className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl" aria-label="الإشعارات">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-bold">الإشعارات</h2>
          {unreadCount > 0 ? <p className="text-xs text-muted-foreground">{unreadCount} غير مقروءة</p> : null}
        </div>
        {unreadCount > 0 ? (
          <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={onMarkAllRead} disabled={isMarkingAllRead}>
            {isMarkingAllRead ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <CheckCheck aria-hidden="true" className="size-3.5" />}
            تحديد الكل كمقروء
          </Button>
        ) : null}
      </div>

      <div className="max-h-[min(32rem,calc(100dvh-7rem))] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> جارٍ تحميل الإشعارات</div>
        ) : hasError ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">تعذر تحميل الإشعارات</p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">لا توجد إشعارات بعد</p>
        ) : (
          notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onOpen={onOpenNotification} isOpening={openingNotificationId === notification.id} />
          ))
        )}
      </div>
    </section>
  );
}
