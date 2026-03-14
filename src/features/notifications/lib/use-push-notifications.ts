"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getFirebaseMessagingToken, isFirebaseConfigured } from "@/features/notifications/lib/firebase-client";
import { useBranch } from "@/shared/context/branch-context";

const DEVICE_ID_STORAGE_KEY = "salon-analyst2-device-id";

type NotificationPreferences = {
  alertCritical: boolean;
  alertImportant: boolean;
  alertPredictive: boolean;
  dailySummary: boolean;
  soundEnabled: boolean;
};

function getLocalDeviceId() {
  const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const generated = `local-${crypto.randomUUID()}`;
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
  return generated;
}

export function usePushNotifications(defaultPreferences: NotificationPreferences) {
  const { branch } = useBranch();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window === "undefined" ? "default" : Notification.permission
  );
  const [token, setToken] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firebaseReady = useMemo(() => isFirebaseConfigured(), []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setPermission(Notification.permission);
  }, []);

  const registerDevice = useCallback(
    async (preferences: NotificationPreferences) => {
      try {
        setIsRegistering(true);
        setError(null);

        const nextPermission =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();

        setPermission(nextPermission);

        if (nextPermission !== "granted") {
          throw new Error("Debes permitir notificaciones para registrar este dispositivo.");
        }

        const nextToken =
          (await getFirebaseMessagingToken().catch(() => null)) ?? getLocalDeviceId();

        setToken(nextToken);

        const response = await fetch("/api/notifications/register-device", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: nextToken,
            provider: firebaseReady ? "fcm" : "local",
            branchPreference: branch,
            deviceLabel: navigator.userAgent,
            ...preferences,
          }),
        });

        const payload = (await response.json()) as {
          success: boolean;
          error?: string;
        };

        if (!response.ok || !payload.success) {
          throw new Error(payload.error ?? "No pude registrar el dispositivo.");
        }

        return nextToken;
      } catch (registrationError) {
        const message =
          registrationError instanceof Error
            ? registrationError.message
            : "No pude registrar las notificaciones.";
        setError(message);
        throw registrationError;
      } finally {
        setIsRegistering(false);
      }
    },
    [branch, firebaseReady]
  );

  const sendLocalTestNotification = useCallback(async () => {
    const registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");

    if (registration) {
      await registration.showNotification("SalonAnalyst2", {
        body: "Prueba local de notificaciones.",
        data: { url: "/" },
      });
      return;
    }

    new Notification("SalonAnalyst2", {
      body: "Prueba local de notificaciones.",
    });
  }, []);

  useEffect(() => {
    if (permission === "granted" && !token) {
      void registerDevice(defaultPreferences).catch(() => undefined);
    }
  }, [defaultPreferences, permission, registerDevice, token]);

  return {
    permission,
    token,
    isRegistering,
    error,
    firebaseReady,
    registerDevice,
    sendLocalTestNotification,
  };
}
