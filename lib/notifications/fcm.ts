"use client";

import {
  getMessaging,
  isSupported,
  onMessage,
  onRegistered,
  onUnregistered,
  register,
  unregister,
  type MessagePayload,
} from "firebase/messaging";

import { firebaseApp } from "@/lib/firebase/client";
import {
  registerDeviceInstallation,
  unregisterDeviceInstallation,
} from "@/lib/notifications/device-registration";

let activeInstallationId: string | null = null;
let foregroundCleanup: (() => void) | null = null;
let registrationCleanup: (() => void) | null = null;
let unregistrationCleanup: (() => void) | null = null;

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) {
    return existing;
  }

  return navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/",
  });
}

export async function synchronizePushNotifications(
  onForegroundMessage: (payload: MessagePayload) => void,
): Promise<void> {
  if (
    typeof window === "undefined" ||
    !(await isSupported()) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    return;
  }

  const registration = await getServiceWorkerRegistration();
  const messaging = getMessaging(firebaseApp);

  registrationCleanup?.();
  unregistrationCleanup?.();
  registrationCleanup = onRegistered(messaging, (installationId) => {
    activeInstallationId = installationId;
    void registerDeviceInstallation(installationId).catch(() => {
      // The FID can be retried on a later app session.
    });
  });
  unregistrationCleanup = onUnregistered(messaging, (installationId) => {
    if (activeInstallationId === installationId) {
      activeInstallationId = null;
    }
    void unregisterDeviceInstallation(installationId).catch(() => {
      // Authentication may already have ended when the browser reports this.
    });
  });

  foregroundCleanup?.();
  foregroundCleanup = onMessage(messaging, onForegroundMessage);

  await register(messaging, { vapidKey, serviceWorkerRegistration: registration });
}

export async function requestAndSynchronizePushNotifications(
  onForegroundMessage: (payload: MessagePayload) => void,
): Promise<NotificationPermission> {
  if (typeof window === "undefined") {
    return "denied";
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    await synchronizePushNotifications(onForegroundMessage);
  }
  return permission;
}

export async function unregisterCurrentPushInstallation(): Promise<void> {
  const installationId = activeInstallationId;
  if (installationId) {
    await unregisterDeviceInstallation(installationId);
    activeInstallationId = null;
  }

  if (typeof window !== "undefined" && (await isSupported())) {
    await unregister(getMessaging(firebaseApp));
  }
}
