"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "@/lib/firestore/notifications";
import { useAuth } from "@/hooks/auth/use-auth";
import type { AppNotification } from "@/types/notification";

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unable to load notifications.");
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const unsubscribe = subscribeToNotifications(
      user.uid,
      (nextNotifications) => {
        setNotifications(nextNotifications);
        setIsLoading(false);
      },
      (nextError) => {
        setError(toError(nextError));
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  const markRead = useCallback(async (notificationId: string): Promise<void> => {
    await markNotificationRead(notificationId);
  }, []);

  const markAllRead = useCallback(async (): Promise<void> => {
    await markAllNotificationsRead(notifications);
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.readAt === null).length,
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markRead,
    markAllRead,
  };
}
