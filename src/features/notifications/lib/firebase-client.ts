"use client";

import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every(Boolean);
}

export async function getFirebaseMessagingToken() {
  if (!hasFirebaseConfig()) {
    return null;
  }

  const messagingSupported = await isSupported().catch(() => false);

  if (!messagingSupported || !("serviceWorker" in navigator)) {
    return null;
  }

  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(app);

  return getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
}

export function isFirebaseConfigured() {
  return hasFirebaseConfig();
}
