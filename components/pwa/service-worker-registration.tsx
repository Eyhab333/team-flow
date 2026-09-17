"use client";

import { useEffect } from "react";

import { getMessagingServiceWorkerRegistration } from "@/lib/notifications/fcm";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    void getMessagingServiceWorkerRegistration().catch(() => {
      // Push is optional; messaging setup surfaces retryable errors in the UI.
    });
  }, []);

  return null;
}
