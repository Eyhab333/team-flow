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

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

if (
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId
) {
  firebase.initializeApp(firebaseConfig);

  // Firebase Messaging displays webpush.notification payloads in the background
  // and handles fcmOptions.link click navigation for the same-origin application.
  firebase.messaging();
}
`;

  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, max-age=0, must-revalidate",
    },
  });
}
