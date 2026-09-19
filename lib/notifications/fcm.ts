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
let serviceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration> | null =
  null;

export type PushNotificationSetupStatus =
  | "idle"
  | "registering"
  | "registered"
  | "unsupported"
  | "error";

let setupStatus: PushNotificationSetupStatus = "idle";
const setupStatusListeners = new Set<
  (status: PushNotificationSetupStatus) => void
>();

function setSetupStatus(status: PushNotificationSetupStatus): void {
  setupStatus = status;
  setupStatusListeners.forEach((listener) => listener(status));
}

export function getPushNotificationSetupStatus(): PushNotificationSetupStatus {
  return setupStatus;
}

export function subscribeToPushNotificationSetupStatus(
  listener: (status: PushNotificationSetupStatus) => void,
): () => void {
  setupStatusListeners.add(listener);
  return () => setupStatusListeners.delete(listener);
}

export function getMessagingServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.reject(new Error("Service workers are not supported."));
  }

  if (!serviceWorkerRegistrationPromise) {
    serviceWorkerRegistrationPromise = (async () => {
      const existing = await navigator.serviceWorker.getRegistration("/");
      const registration =
        existing ??
        (await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
          scope: "/",
        }));

      if (!registration.active) {
        await navigator.serviceWorker.ready;
      }

      const activeRegistration = await navigator.serviceWorker.getRegistration("/");
      if (!activeRegistration?.active) {
        throw new Error("The Firebase Messaging service worker is not active.");
      }

      return activeRegistration;
    })().catch((error) => {
      serviceWorkerRegistrationPromise = null;
      throw error;
    });
  }

  return serviceWorkerRegistrationPromise;
}

export async function synchronizePushNotifications(
  onForegroundMessage: (payload: MessagePayload) => void,
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if (Notification.permission === "granted") {
    setSetupStatus("registering");
  }

  if (!(await isSupported())) {
    setSetupStatus("unsupported");
    return;
  }

  if (Notification.permission !== "granted") {
    setSetupStatus("idle");
    return;
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    setSetupStatus("error");
    return;
  }

  try {
    const registration = await getMessagingServiceWorkerRegistration();
    const messaging = getMessaging(firebaseApp);

    registrationCleanup?.();
    unregistrationCleanup?.();
    registrationCleanup = onRegistered(messaging, (installationId) => {
      activeInstallationId = installationId;
      void registerDeviceInstallation(installationId)
        .then(() => setSetupStatus("registered"))
        .catch(() => setSetupStatus("error"));
    });
    unregistrationCleanup = onUnregistered(messaging, (installationId) => {
      if (activeInstallationId === installationId) {
        activeInstallationId = null;
      }
      setSetupStatus("idle");
      void unregisterDeviceInstallation(installationId).catch(() => {
        // Authentication may already have ended when the browser reports this.
      });
    });

    foregroundCleanup?.();
    foregroundCleanup = onMessage(messaging, onForegroundMessage);

    await register(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
  } catch (error) {
    setSetupStatus("error");
    throw error;
  }
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
    setSetupStatus("idle");
  }

  if (typeof window !== "undefined" && (await isSupported())) {
    await unregister(getMessaging(firebaseApp));
  }
}
