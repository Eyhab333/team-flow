"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { useNotifications } from "@/hooks/notifications/use-notifications";
import type { AppNotification } from "@/types/notification";

export function NotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, isLoading, error, markRead, markAllRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [openingNotificationId, setOpeningNotificationId] = useState<string | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    function syncPermission(): void {
      setPermission(Notification.permission);
    }

    syncPermission();
    window.addEventListener("team-flow-notification-permission-change", syncPermission);
    return () => {
      window.removeEventListener(
        "team-flow-notification-permission-change",
        syncPermission,
      );
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function handleOpenNotification(notification: AppNotification): Promise<void> {
    if (openingNotificationId) return;
    setOpeningNotificationId(notification.id);
    try {
      if (notification.readAt === null) await markRead(notification.id);
      setIsOpen(false);
      router.push(notification.link);
    } catch {
      toast.error("تعذر فتح الإشعار");
    } finally {
      setOpeningNotificationId(null);
    }
  }

  async function handleMarkAllRead(): Promise<void> {
    setIsMarkingAllRead(true);
    try { await markAllRead(); } catch { toast.error("تعذر تحديد الإشعارات كمقروءة"); } finally { setIsMarkingAllRead(false); }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button type="button" variant="ghost" size="icon" className="relative rounded-xl" aria-label="الإشعارات" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        <Bell aria-hidden="true" className="size-4" />
        {unreadCount > 0 ? <span className="absolute -left-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
      </Button>
      {isOpen ? <>
        <NotificationPanel notifications={notifications} unreadCount={unreadCount} isLoading={isLoading} hasError={Boolean(error)} isMarkingAllRead={isMarkingAllRead} openingNotificationId={openingNotificationId} onMarkAllRead={() => void handleMarkAllRead()} onOpenNotification={(notification) => void handleOpenNotification(notification)} />
        {permission === "denied" ? <p className="absolute left-0 top-[calc(100%+0.5rem)] z-[60] w-72 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">الإشعارات محظورة من إعدادات المتصفح</p> : null}
      </> : null}
    </div>
  );
}
