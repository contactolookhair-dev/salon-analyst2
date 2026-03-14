"use client";

import { useState } from "react";
import { AlertTriangle, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Card } from "@/shared/components/ui/card";
import { MAINTENANCE_PROTECTED_RESOURCES } from "@/features/configuration/lib/maintenance-constants";
import { notifyBusinessSnapshotUpdated } from "@/shared/lib/business-snapshot-events";

type MaintenanceActionId =
  | "clear-month-sales"
  | "clear-expenses"
  | "reset-test-data";

type MaintenanceAction = {
  id: MaintenanceActionId;
  title: string;
  description: string;
  endpoint: string;
  buttonLabel: string;
  accentClassName: string;
};

const MAINTENANCE_ACTIONS: MaintenanceAction[] = [
  {
    id: "clear-month-sales",
    title: "Vaciar ventas del mes",
    description:
      "Elimina solo las ventas del mes actual y sus relaciones operativas derivadas, sin tocar configuración ni meses anteriores.",
    endpoint: "/api/maintenance/clear-month-sales",
    buttonLabel: "Vaciar ventas del mes",
    accentClassName:
      "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
  },
  {
    id: "clear-expenses",
    title: "Eliminar gastos",
    description:
      "Borra todos los gastos registrados para comenzar desde cero, manteniendo categorías base, sucursales y configuración.",
    endpoint: "/api/maintenance/clear-expenses",
    buttonLabel: "Eliminar gastos",
    accentClassName:
      "border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100",
  },
  {
    id: "reset-test-data",
    title: "Reiniciar datos de prueba",
    description:
      "Limpia ventas, gastos, alertas generadas y derivaciones operativas sin tocar catálogo, branding, profesionales ni sucursales.",
    endpoint: "/api/maintenance/reset-test-data",
    buttonLabel: "Reiniciar datos de prueba",
    accentClassName:
      "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100",
  },
];

type MaintenanceResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

export function SystemMaintenanceCard() {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<MaintenanceActionId | null>(null);
  const [confirmationValue, setConfirmationValue] = useState("");
  const [pendingAction, setPendingAction] = useState<MaintenanceAction | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const maintenanceEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_MAINTENANCE_TOOLS_ENABLED === "true";

  async function handleConfirmAction() {
    if (!pendingAction) {
      return;
    }

    try {
      setActiveAction(pendingAction.id);
      setFeedback(null);

      const response = await fetch(pendingAction.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmation: confirmationValue,
        }),
      });

      const payload = (await response.json()) as MaintenanceResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "No pude ejecutar la acción de mantenimiento.");
      }

      setFeedback({
        tone: "success",
        message: payload.message || "Acción de mantenimiento ejecutada correctamente.",
      });
      setPendingAction(null);
      setConfirmationValue("");
      notifyBusinessSnapshotUpdated();
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No pude ejecutar la acción de mantenimiento.",
      });
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-olive-950">
            Mantenimiento del sistema
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Herramientas seguras para limpiar datos operativos de prueba sin tocar catálogo, sucursales, logos, colores, branding ni configuración base.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          <AlertTriangle className="size-4" />
          Solo usar en pruebas o administración
        </div>
      </div>

      {!maintenanceEnabled ? (
        <div className="rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] p-4 text-sm text-muted-foreground">
          Estas herramientas están deshabilitadas en producción. Para activarlas manualmente, usa la variable
          {" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-olive-950">MAINTENANCE_TOOLS_ENABLED=true</code>
          {" "}
          en el backend y
          {" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-olive-950">NEXT_PUBLIC_MAINTENANCE_TOOLS_ENABLED=true</code>
          {" "}
          en el frontend.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {MAINTENANCE_ACTIONS.map((action) => {
          const isBusy = activeAction === action.id;

          return (
            <div
              key={action.id}
              className="rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] p-4"
            >
              <p className="text-base font-semibold text-olive-950">{action.title}</p>
              <p className="mt-2 min-h-[72px] text-sm leading-6 text-muted-foreground">
                {action.description}
              </p>
              <button
                type="button"
                disabled={!maintenanceEnabled || isBusy}
                onClick={() => {
                  setPendingAction(action);
                  setConfirmationValue("");
                  setFeedback(null);
                }}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${action.accentClassName}`}
              >
                {isBusy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : action.id === "reset-test-data" ? (
                  <RotateCcw className="size-4" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {action.buttonLabel}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-olive-950">Elementos protegidos</p>
        <p className="mt-2 leading-6">
          Estas acciones nunca eliminan:
          {" "}
          {MAINTENANCE_PROTECTED_RESOURCES.join(", ")}.
        </p>
      </div>

      {feedback ? (
        <div
          className={`rounded-[24px] border p-4 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {pendingAction ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-base font-semibold text-rose-900">
                Confirmar: {pendingAction.title}
              </p>
              <p className="max-w-3xl text-sm leading-6 text-rose-800">
                Esta acción eliminará datos del sistema y no se puede deshacer. Escribe exactamente
                {" "}
                <strong>BORRAR</strong>
                {" "}
                para continuar. No afectará logos, colores, sucursales, catálogo ni configuración base.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              value={confirmationValue}
              onChange={(event) => setConfirmationValue(event.target.value)}
              placeholder="Escribe BORRAR"
              className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-olive-950 outline-none ring-0 placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => {
                setPendingAction(null);
                setConfirmationValue("");
              }}
              className="rounded-full border border-olive-950/10 bg-white px-4 py-3 text-sm font-semibold text-olive-950"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={activeAction !== null || confirmationValue.trim().toUpperCase() !== "BORRAR"}
              onClick={() => void handleConfirmAction()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-700 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeAction ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <AlertTriangle className="size-4" />
              )}
              Confirmar borrado
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
