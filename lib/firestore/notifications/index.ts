import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { AppNotification } from "@/types/notification";

const notificationsCollection = collection(db, "notifications");

export function subscribeToNotifications(
  recipientUserId: string,
  onNotifications: (notifications: AppNotification[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const notificationsQuery = query(
    notificationsCollection,
    where("recipientUserId", "==", recipientUserId),
    orderBy("createdAt", "desc"),
    limit(50),
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      onNotifications(
        snapshot.docs.map((notification) => notification.data() as AppNotification),
      );
    },
    onError,
  );
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  await updateDoc(doc(db, "notifications", notificationId), {
    readAt: serverTimestamp(),
  });
}

export async function markAllNotificationsRead(
  notifications: AppNotification[],
): Promise<void> {
  const unreadNotifications = notifications.filter(
    (notification) => notification.readAt === null,
  );

  if (unreadNotifications.length === 0) {
    return;
  }

  const batch = writeBatch(db);
  unreadNotifications.forEach((notification) => {
    batch.update(doc(db, "notifications", notification.id), {
      readAt: serverTimestamp(),
    });
  });

  await batch.commit();
}
