export const dynamic = "force-static";

function stringify(value: string | undefined): string {
  return JSON.stringify(value ?? "");
}

export function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const source = `
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");
const firebaseConfig = { apiKey: ${stringify(config.apiKey)}, authDomain: ${stringify(config.authDomain)}, projectId: ${stringify(config.projectId)}, messagingSenderId: ${stringify(config.messagingSenderId)}, appId: ${stringify(config.appId)} };
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || "Team Flow";
    self.registration.showNotification(title, {
      body: data.body || "لديك تحديث جديد.",
      icon: "/icons/team-flow-192.svg",
      badge: "/icons/team-flow-192.svg",
      tag: data.notificationId || undefined,
      data: { link: data.link || "/" },
    });
  });
}
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = new URL((event.notification.data && event.notification.data.link) || "/", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    for (const client of windows) {
      if ("focus" in client) {
        client.navigate(link);
        return client.focus();
      }
    }
    return self.clients.openWindow(link);
  }));
});`;

  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
