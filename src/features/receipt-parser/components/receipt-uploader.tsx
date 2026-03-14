"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileUp,
  LoaderCircle,
  ReceiptText,
} from "lucide-react";

import type { ProcessedSale } from "@/features/receipt-parser/receipt-types";
import type {
  ReceiptProcessingApiResponse,
  ReceiptProcessingFailure,
  ReceiptProcessingSuccess,
} from "@/features/receipt-parser/receipt-parser";
import { Card } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";

type ReceiptUploaderProps = {
  onRegistered?: () => void;
};

type UploadStatus = "idle" | "uploading" | "processing" | "error" | "ready";

type SafeJsonResult<T> = {
  ok: boolean;
  data: T | null;
  rawText: string;
};

function getStatusLabel(status: ProcessedSale["items"][number]["status"]) {
  switch (status) {
    case "matched":
      return "Detectado correctamente";
    case "missing_commission_rule":
      return "Falta regla de comisión";
    case "missing_cost":
      return "Falta costo";
    case "missing_branch":
      return "Falta sucursal";
    case "missing_professional":
      return "Falta profesional";
    case "service_not_found":
      return "Servicio no encontrado";
    default:
      return "Requiere revisión";
  }
}

function getStatusClasses(status: ProcessedSale["items"][number]["status"]) {
  if (status === "matched") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function isPdfFile(file: File) {
  const normalizedName = file.name.toLowerCase();
  return file.type === "application/pdf" || normalizedName.endsWith(".pdf");
}

function getUploadMessage(status: UploadStatus) {
  switch (status) {
    case "uploading":
      return "Subiendo boleta al servidor...";
    case "processing":
      return "Procesando PDF y extrayendo texto...";
    case "ready":
      return "Boleta lista para revisión.";
    case "error":
      return "No pudimos procesar la boleta.";
    default:
      return "Lista para recibir una boleta PDF.";
  }
}

async function parseJsonSafely<T>(response: Response): Promise<SafeJsonResult<T>> {
  const rawText = await response.text();

  if (!rawText) {
    return {
      ok: false,
      data: null,
      rawText: "",
    };
  }

  try {
    return {
      ok: true,
      data: JSON.parse(rawText) as T,
      rawText,
    };
  } catch {
    return {
      ok: false,
      data: null,
      rawText,
    };
  }
}

function buildReadableErrorMessage(
  fallbackMessage: string,
  options?: {
    responseStatus?: number;
    rawText?: string;
    parsedError?: string | null;
  }
) {
  if (options?.parsedError?.trim()) {
    return options.parsedError.trim();
  }

  if (options?.responseStatus && options.responseStatus >= 500) {
    return "El servidor encontró un error interno al procesar la boleta.";
  }

  if (options?.responseStatus && options.responseStatus >= 400) {
    return fallbackMessage;
  }

  if (options?.rawText?.trim()) {
    return `${fallbackMessage} Respuesta recibida: ${options.rawText.slice(0, 240)}`;
  }

  return fallbackMessage;
}

export function ReceiptUploader({ onRegistered }: ReceiptUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ReceiptProcessingSuccess | null>(null);
  const [failure, setFailure] = useState<ReceiptProcessingFailure | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleProcessReceipt() {
    if (!file) {
      setStatus("error");
      setError("Selecciona un PDF para procesar la boleta.");
      return;
    }

    if (!isPdfFile(file)) {
      setStatus("error");
      setError("El archivo seleccionado no es un PDF válido.");
      return;
    }

    try {
      setStatus("uploading");
      setError(null);
      setFailure(null);
      setResult(null);
      setIsConfirmed(false);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-receipt", {
        method: "POST",
        body: formData,
      });

      setStatus("processing");

      const parsed = await parseJsonSafely<ReceiptProcessingApiResponse>(response);

      if (!parsed.ok || !parsed.data) {
        throw new Error(
          buildReadableErrorMessage(
            "El servidor no devolvió una respuesta válida al procesar la boleta.",
            {
              responseStatus: response.status,
              rawText: parsed.rawText,
            }
          )
        );
      }

      const payload = parsed.data;

      if (!payload.success) {
        setFailure(payload);
        setStatus("error");
        setError(
          buildReadableErrorMessage(
            "No pude procesar la boleta.",
            {
              responseStatus: response.status,
              parsedError: payload.error,
            }
          )
        );
        return;
      }

      setResult(payload);
      setStatus("ready");
    } catch (processError) {
      setFailure(null);
      setResult(null);
      setStatus("error");
      setError(
        processError instanceof Error
          ? processError.message
          : "No pude procesar la boleta."
      );
    }
  }

  async function handleConfirmSale() {
    if (!result) {
      return;
    }

    try {
      setStatus("processing");
      setError(null);

      const primaryItem = result.data.processedSale.items[0];

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: result.data.processedSale.date,
          branch:
            result.data.processedSale.branchName ??
            result.data.parsedReceipt.branchName,
          professional:
            result.data.processedSale.professionalName ??
            result.data.parsedReceipt.professionalName,
          service:
            primaryItem?.matchedCatalogName ??
            primaryItem?.rawName ??
            "Venta desde boleta",
          total: result.data.processedSale.totals.gross,
          clientName: result.data.processedSale.clientName,
        }),
      });

      const parsed = await parseJsonSafely<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(
          buildReadableErrorMessage(
            "No pude registrar la venta.",
            {
              responseStatus: response.status,
              parsedError: parsed.data?.error ?? null,
              rawText: parsed.rawText,
            }
          )
        );
      }

      setIsConfirmed(true);
      setStatus("ready");
      onRegistered?.();
    } catch (confirmError) {
      setStatus("error");
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "No pude registrar la venta."
      );
    }
  }

  const processedSale = result?.data.processedSale;
  const parsedReceipt = result?.data.parsedReceipt;

  return (
    <Card className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-olive-700">
            Lectura de boletas
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-olive-950">
            Subir PDF de Fresha o AgendaPro
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            El uploader valida el archivo, lo envía al backend, extrae el texto
            con pdf-parse y solo entonces intenta detectar proveedor, ítems y
            cálculos financieros.
          </p>
        </div>
        <ReceiptText className="size-5 text-olive-700" />
      </div>

      <div className="rounded-[28px] border border-dashed border-olive-950/15 bg-[#fbfaf6] p-5">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[22px] border border-white/70 bg-white/80 px-6 py-10 text-center shadow-soft">
          <FileUp className="size-5 text-olive-700" />
          <span className="text-sm font-medium text-olive-950">
            {file ? file.name : "Seleccionar archivo PDF"}
          </span>
          <span className="text-xs text-muted-foreground">
            Solo PDFs. Si el documento no contiene texto seleccionable o faltan
            campos clave, lo verás claramente antes de guardar.
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              const selectedFile = event.target.files?.[0] ?? null;
              setFile(selectedFile);
              setResult(null);
              setFailure(null);
              setError(null);
              setStatus("idle");
              setIsConfirmed(false);
            }}
          />
        </label>
      </div>

      <div className="rounded-2xl border border-olive-950/8 bg-[#f8f6ef] px-4 py-3 text-sm text-olive-900">
        {getUploadMessage(status)}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleProcessReceipt}
          disabled={status === "uploading" || status === "processing"}
          className="inline-flex items-center gap-2 rounded-full bg-olive-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "uploading" || status === "processing" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <FileText className="size-4" />
          )}
          Procesar boleta
        </button>

        {result ? (
          <button
            type="button"
            onClick={handleConfirmSale}
            disabled={
              status === "uploading" ||
              status === "processing" ||
              result.data.processedSale.reviewRequired
            }
            className="rounded-full border border-olive-950/10 bg-[#f2f0e7] px-4 py-2 text-sm font-semibold text-olive-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirmar registro de venta
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {failure ? (
        <div className="space-y-4 rounded-[24px] border border-amber-200 bg-amber-50/80 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                No se pudo procesar la boleta completamente
              </p>
              <p className="mt-1 text-sm text-amber-800">{failure.error}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white/80 p-4 text-sm">
              <p className="font-semibold text-olive-950">Archivo</p>
              <p className="mt-1 text-muted-foreground">
                {failure.fallback.fileName ?? "No disponible"}
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 text-sm">
              <p className="font-semibold text-olive-950">Origen detectado</p>
              <p className="mt-1 text-muted-foreground">
                {failure.fallback.detectedSource}
              </p>
            </div>
          </div>

          {failure.fallback.warnings.length ? (
            <div className="rounded-2xl bg-white/80 p-4 text-sm text-amber-900">
              <p className="font-semibold text-olive-950">Warnings</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {failure.fallback.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {failure.fallback.extractedTextPreview ? (
            <div className="rounded-2xl bg-[#fffdf7] p-4 text-sm">
              <p className="font-semibold text-olive-950">Texto extraído parcial</p>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                {failure.fallback.extractedTextPreview}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {result && processedSale && parsedReceipt ? (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Preview procesado
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-olive-950">
                    Revisión previa antes de guardar
                  </h4>
                </div>
                {processedSale.reviewRequired ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    <AlertTriangle className="size-3.5" />
                    Revisar antes de guardar
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="size-3.5" />
                    Listo para guardar
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/70 bg-white/90 p-4 text-sm">
                  <p className="font-semibold text-olive-950">Origen</p>
                  <p className="mt-1 text-muted-foreground">{parsedReceipt.source}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/90 p-4 text-sm">
                  <p className="font-semibold text-olive-950">Fecha</p>
                  <p className="mt-1 text-muted-foreground">
                    {processedSale.date || "Revisar antes de guardar"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/90 p-4 text-sm">
                  <p className="font-semibold text-olive-950">Sucursal</p>
                  <p className="mt-1 text-muted-foreground">
                    {processedSale.branchName ?? "Revisar antes de guardar"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/90 p-4 text-sm">
                  <p className="font-semibold text-olive-950">Profesional</p>
                  <p className="mt-1 text-muted-foreground">
                    {processedSale.professionalName ?? "Revisar antes de guardar"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/90 p-4 text-sm md:col-span-2">
                  <p className="font-semibold text-olive-950">Cliente</p>
                  <p className="mt-1 text-muted-foreground">
                    {processedSale.clientName}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-olive-950/8 bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Totales calculados
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-olive-950/8 bg-[#f8f6ef] p-4 text-sm">
                  <p className="text-muted-foreground">Bruto</p>
                  <p className="mt-1 text-lg font-semibold text-olive-950">
                    {formatCurrency(processedSale.totals.gross)}
                  </p>
                </div>
                <div className="rounded-2xl border border-olive-950/8 bg-[#f8f6ef] p-4 text-sm">
                  <p className="text-muted-foreground">Neto</p>
                  <p className="mt-1 text-lg font-semibold text-olive-950">
                    {formatCurrency(processedSale.totals.net)}
                  </p>
                </div>
                <div className="rounded-2xl border border-olive-950/8 bg-[#f8f6ef] p-4 text-sm">
                  <p className="text-muted-foreground">IVA</p>
                  <p className="mt-1 text-lg font-semibold text-olive-950">
                    {formatCurrency(processedSale.totals.vat)}
                  </p>
                </div>
                <div className="rounded-2xl border border-olive-950/8 bg-[#f8f6ef] p-4 text-sm">
                  <p className="text-muted-foreground">Comisión</p>
                  <p className="mt-1 text-lg font-semibold text-olive-950">
                    {formatCurrency(processedSale.totals.commission)}
                  </p>
                </div>
                <div className="rounded-2xl border border-olive-950/8 bg-[#f8f6ef] p-4 text-sm">
                  <p className="text-muted-foreground">Costo</p>
                  <p className="mt-1 text-lg font-semibold text-olive-950">
                    {formatCurrency(processedSale.totals.cost)}
                  </p>
                </div>
                <div className="rounded-2xl border border-olive-950/8 bg-[#eef4eb] p-4 text-sm">
                  <p className="text-muted-foreground">Utilidad</p>
                  <p className="mt-1 text-lg font-semibold text-olive-950">
                    {formatCurrency(processedSale.totals.profit)}
                  </p>
                </div>
              </div>

              {isConfirmed ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Venta registrada correctamente.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[24px] border border-olive-950/8 bg-white/85 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Ítems detectados
            </p>
            <h4 className="mt-2 text-lg font-semibold text-olive-950">
              Líneas procesadas desde la boleta
            </h4>

            <div className="mt-4 space-y-4">
              {processedSale.items.map((item, index) => (
                <div
                  key={`${item.rawName}-${index}`}
                  className="rounded-[22px] border border-olive-950/8 bg-[#fbfaf6] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-olive-950">
                        {item.matchedCatalogName ?? item.rawName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Detectado como {item.type ?? "item sin clasificar"} · cantidad{" "}
                        {item.quantity}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(item.status)}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <div className="rounded-2xl bg-white/90 p-3 text-sm">
                      <p className="text-muted-foreground">Bruto</p>
                      <p className="mt-1 font-semibold text-olive-950">
                        {formatCurrency(item.gross)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/90 p-3 text-sm">
                      <p className="text-muted-foreground">Neto</p>
                      <p className="mt-1 font-semibold text-olive-950">
                        {formatCurrency(item.net)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/90 p-3 text-sm">
                      <p className="text-muted-foreground">Comisión</p>
                      <p className="mt-1 font-semibold text-olive-950">
                        {formatCurrency(item.commissionAmount)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/90 p-3 text-sm">
                      <p className="text-muted-foreground">Costo</p>
                      <p className="mt-1 font-semibold text-olive-950">
                        {formatCurrency(item.totalCost)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/90 p-3 text-sm">
                      <p className="text-muted-foreground">Utilidad</p>
                      <p className="mt-1 font-semibold text-olive-950">
                        {formatCurrency(item.profit)}
                      </p>
                    </div>
                  </div>

                  {item.warnings.length ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {item.warnings.join(" ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}