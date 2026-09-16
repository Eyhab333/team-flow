"use client";

import { BellRing, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { requestAndSynchronizePushNotifications } from "@/lib/notifications/fcm";

interface NotificationPermissionButtonProps {
  className?: string;
  showLabel?: boolean;
}

export function NotificationPermissionButton({
  className,
  showLabel = false,
}: NotificationPermissionButtonProps) {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);

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

  if (permission !== "default") return null;

  async function enableNotifications(): Promise<void> {
    setIsEnabling(true);
    try {
      const nextPermission = await requestAndSynchronizePushNotifications((payload) => {
        toast(payload.data?.title ?? "إشعار جديد", {
          description: payload.data?.body,
        });
      });
      setPermission(nextPermission);
      window.dispatchEvent(new Event("team-flow-notification-permission-change"));
      if (nextPermission === "granted") {
        toast.success("تم تفعيل الإشعارات");
      }
    } catch {
      toast.error("تعذر تفعيل الإشعارات");
    } finally {
      setIsEnabling(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`gap-1.5 rounded-xl ${className ?? ""}`}
      title="تفعيل الإشعارات"
      onClick={() => void enableNotifications()}
      disabled={isEnabling}
    >
      {isEnabling ? (
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
      ) : (
        <BellRing aria-hidden="true" className="size-3.5" />
      )}
      {showLabel ? (
        <span>تفعيل الإشعارات</span>
      ) : (
        <>
          <span className="hidden sm:inline">تفعيل الإشعارات</span>
          <span className="sr-only sm:hidden">تفعيل الإشعارات</span>
        </>
      )}
    </Button>
  );
}
