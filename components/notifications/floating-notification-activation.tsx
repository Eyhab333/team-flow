"use client";

import { BellRing, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/use-auth";
import {
  getPushNotificationSetupStatus,
  requestAndSynchronizePushNotifications,
  subscribeToPushNotificationSetupStatus,
  synchronizePushNotifications,
  type PushNotificationSetupStatus,
} from "@/lib/notifications/fcm";

export function FloatingNotificationActivation() {
  const { hasAppAccess } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [setupStatus, setSetupStatus] = useState<PushNotificationSetupStatus>(
    getPushNotificationSetupStatus,
  );
  const [isActivating, setIsActivating] = useState(false);
  const shouldConfirmSuccessRef = useRef(false);

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

  useEffect(
    () => subscribeToPushNotificationSetupStatus(setSetupStatus),
    [],
  );

  useEffect(() => {
    if (!shouldConfirmSuccessRef.current) return;

    if (setupStatus === "registered") {
      shouldConfirmSuccessRef.current = false;
      toast.success("تم تفعيل الإشعارات");
    } else if (setupStatus === "error") {
      shouldConfirmSuccessRef.current = false;
      toast.error("تعذر تفعيل الإشعارات");
    }
  }, [setupStatus]);

  const shouldShow =
    hasAppAccess &&
    permission !== null &&
    permission !== "denied" &&
    setupStatus !== "registered" &&
    setupStatus !== "unsupported";

  if (!shouldShow) return null;

  async function activate(): Promise<void> {
    if (isActivating) return;

    shouldConfirmSuccessRef.current = true;
    setIsActivating(true);

    try {
      if (permission === "default") {
        const nextPermission = await requestAndSynchronizePushNotifications(
          (payload) => {
            toast(payload.data?.title ?? "إشعار جديد", {
              description: payload.data?.body,
            });
          },
        );
        setPermission(nextPermission);
        window.dispatchEvent(
          new Event("team-flow-notification-permission-change"),
        );
        if (nextPermission === "denied") {
          shouldConfirmSuccessRef.current = false;
        }
      } else {
        await synchronizePushNotifications((payload) => {
          toast(payload.data?.title ?? "إشعار جديد", {
            description: payload.data?.body,
          });
        });
      }
    } catch {
      shouldConfirmSuccessRef.current = false;
      toast.error("تعذر تفعيل الإشعارات");
    } finally {
      setIsActivating(false);
    }
  }

  const isRegistering = isActivating || setupStatus === "registering";

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 sm:inset-x-auto sm:bottom-6 sm:left-6">
      <Button
        type="button"
        size="lg"
        className="h-12 w-full gap-2 rounded-2xl px-5 shadow-lg sm:w-auto"
        onClick={() => void activate()}
        disabled={isRegistering}
        aria-busy={isRegistering}
      >
        {isRegistering ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <BellRing aria-hidden="true" className="size-4" />
        )}
        {isRegistering ? "جارٍ تفعيل الإشعارات" : "تفعيل الإشعارات"}
      </Button>
    </div>
  );
}
