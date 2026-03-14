"use client";

import { useMemo, useState } from "react";
import { Bell, BellRing, Smartphone } from "lucide-react";

import { Card } from "@/shared/components/ui/card";
import { usePushNotifications } from "@/features/notifications/lib/use-push-notifications";

const defaultPreferences = {
  alertCritical: true,
  alertImportant: true,
  alertPredictive: true,
  dailySummary: false,
  soundEnabled: true,
};

export function NotificationSettingsCard() {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    permission,
    token,
    isRegistering,
    error,
    firebaseReady,
    registerDevice,
    sendLocalTestNotification,
  } = usePushNotifications(defaultPreferences);

  const permissionLabel = useMemo(() => {
    if (permission === "granted") {
      return "Permiso concedido";
    }

    if (permission === "denied") {
      return "Permiso bloqueado";
    }

    return "Pendiente";
  }, [permission]);

  async function handleSave() {
    try {
      await registerDevice(preferences);
      setFeedback("Preferencias guardadas y dispositivo registrado.");
    } catch {
      setFeedback(null);
    }
  }

  async function handleTest() {
    try {
      if (!token) {
        await handleSave();
      }

      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: token ?? null }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No pude probar la notificación.");
      }

      if (!firebaseReady) {
        await sendLocalTestNotification();
      }

      setFeedback(payload.message ?? "Prueba enviada.");
    } catch (testError) {
      setFeedback(
        testError instanceof Error
          ? testError.message
          : "No pude probar la notificación."
      );
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[var(--theme-accent)]/15 p-3 text-[var(--theme-accent)]">
          <Bell className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--theme-text)]">
            Notificaciones y push
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Configura alertas críticas, importantes, predictivas y resúmenes para recibir avisos aunque no tengas la app abierta.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { key: "alertCritical", label: "Recibir alertas críticas" },
          { key: "alertImportant", label: "Recibir alertas importantes" },
          { key: "alertPredictive", label: "Recibir alertas predictivas" },
          { key: "dailySummary", label: "Recibir resumen diario" },
          { key: "soundEnabled", label: "Activar sonido" },
        ].map((item) => (
          <label
            key={item.key}
            className="flex items-center justify-between rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-3 text-sm"
          >
            <span className="font-medium text-[var(--theme-text)]">{item.label}</span>
            <input
              type="checkbox"
              checked={preferences[item.key as keyof typeof preferences]}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  [item.key]: event.target.checked,
                }))
              }
              className="size-4"
            />
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-3 text-sm">
          <p className="text-muted-foreground">Estado</p>
          <p className="mt-2 font-semibold text-[var(--theme-text)]">{permissionLabel}</p>
        </div>
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-3 text-sm">
          <p className="text-muted-foreground">Proveedor</p>
          <p className="mt-2 font-semibold text-[var(--theme-text)]">
            {firebaseReady ? "Firebase Cloud Messaging" : "Registro local preparado"}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-3 text-sm">
          <p className="text-muted-foreground">Dispositivo</p>
          <p className="mt-2 truncate font-semibold text-[var(--theme-text)]">
            {token ?? "Aún no registrado"}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {feedback ? (
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-accent)]/10 px-4 py-3 text-sm text-[var(--theme-text)]">
          {feedback}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isRegistering}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--theme-accent)] px-5 py-3 text-sm font-semibold text-[var(--theme-accent-foreground)] disabled:opacity-60"
        >
          <Smartphone className="size-4" />
          {isRegistering ? "Registrando..." : "Guardar preferencias"}
        </button>
        <button
          type="button"
          onClick={() => void handleTest()}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-card)] px-5 py-3 text-sm font-semibold text-[var(--theme-text)]"
        >
          <BellRing className="size-4" />
          Probar notificación
        </button>
      </div>
    </Card>
  );
}
