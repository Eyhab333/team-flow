const FIREBASE_COMPAT_VERSION = "12.19.0";

export const dynamic = "force-static";

function stringify(value: string | undefined): string {
  return JSON.stringify(value ?? "");
}

export function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const source = `
importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_VERSION}/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_VERSION}/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: ${stringify(config.apiKey)},
  authDomain: ${stringify(config.authDomain)},
  projectId: ${stringify(config.projectId)},
  storageBucket: ${stringify(config.storageBucket)},
  messagingSenderId: ${stringify(config.messagingSenderId)},
  appId: ${stringify(config.appId)},
};
const appIcon = "/icons/team-flow-192.svg";

function sameOriginLink(value) {
  const fallback = new URL("/", self.location.origin);
  try {
    const link = new URL(value || "/", self.location.origin);
    return link.origin === self.location.origin ? link.href : fallback.href;
  } catch {
    return fallback.href;
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data =
      payload.data && Object.keys(payload.data).length > 0
        ? payload.data
        : payload.notification || {};
    const title = data.title || "Team Flow";
    const body = data.body || "لديك تحديث جديد.";

    console.debug("[FCM SW] background message received");

    return self.registration.showNotification(title, {
      body,
      icon: appIcon,
      badge: appIcon,
      tag: data.notificationId || undefined,
      renotify: false,
      data: {
        link: sameOriginLink(data.link),
        notificationId: data.notificationId || null,
        type: data.type || null,
        entityId: data.entityId || null,
        entityKind: data.entityKind || null,
      },
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = sameOriginLink(event.notification.data && event.notification.data.link);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        if ("navigate" in client) await client.navigate(link);
        return client.focus();
      }

      return self.clients.openWindow(link);
    })(),
  );
});
`;

  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, max-age=0, must-revalidate",
    },
  });
}
