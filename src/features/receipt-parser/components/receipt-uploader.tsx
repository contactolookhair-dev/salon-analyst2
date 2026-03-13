"use client";

import { useState } from "react";
import { FileUp, FileText, LoaderCircle, ReceiptText } from "lucide-react";

import type { ParsedReceiptResult } from "@/features/receipt-parser/receipt-types";
import { Card } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";

type ReceiptUploaderProps = {
  onRegistered?: () => void;
};

export function ReceiptUploader({ onRegistered }: ReceiptUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParsedReceiptResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleProcessReceipt() {
    if (!file) {
      setError("Selecciona un PDF para procesar la boleta.");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setIsConfirmed(false);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-receipt", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ParsedReceiptResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No pude procesar la boleta.");
      }

      setResult(payload);
    } catch (processError) {
      setResult(null);
      setError(
        processError instanceof Error
          ? processError.message
          : "No pude procesar la boleta."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleConfirmSale() {
    if (!result) {
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: result.sale.date,
          branch: result.sale.branch,
          professional: result.sale.professional,
          service: result.sale.service,
          total: result.sale.total,
          clientName: result.sale.client,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No pude registrar la venta.");
      }

      setIsConfirmed(true);
      onRegistered?.();
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "No pude registrar la venta."
      );
    } finally {
      setIsProcessing(false);
    }
  }

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
            El archivo se envía al servidor, se lee con `pdf-parse` y luego se
            identifica automáticamente si la boleta proviene de Fresha o AgendaPro.
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
            Sube una boleta real en PDF para extraer su texto y detectar sus campos.
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf,text/plain,.txt"
            className="hidden"
            onChange={(event) => {
              const selectedFile = event.target.files?.[0] ?? null;
              setFile(selectedFile);
              setResult(null);
              setError(null);
              setIsConfirmed(false);
            }}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleProcessReceipt}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 rounded-full bg-olive-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isProcessing ? (
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
            disabled={isProcessing}
            className="rounded-full border border-olive-950/10 bg-[#f2f0e7] px-4 py-2 text-sm font-semibold text-olive-950"
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

      {result ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Datos detectados
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <p><span className="font-semibold text-olive-950">Proveedor:</span> {result.provider}</p>
              <p><span className="font-semibold text-olive-950">Fecha:</span> {result.sale.date}</p>
              <p><span className="font-semibold text-olive-950">Sucursal:</span> {result.sale.branch}</p>
              <p><span className="font-semibold text-olive-950">Cliente:</span> {result.sale.client}</p>
              <p><span className="font-semibold text-olive-950">Profesional:</span> {result.sale.professional}</p>
              <p><span className="font-semibold text-olive-950">Servicio:</span> {result.sale.service}</p>
              <p><span className="font-semibold text-olive-950">Precio:</span> {formatCurrency(result.sale.price)}</p>
              <p><span className="font-semibold text-olive-950">Total:</span> {formatCurrency(result.sale.total)}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-olive-950/8 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Resultado del flujo
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {isConfirmed
                ? "La venta ya fue enviada al sistema de almacenamiento y el dashboard puede refrescarse."
                : "Revisa los datos detectados y confirma el registro para guardar la venta en la base de datos o usar fallback temporal."}
            </p>
            {isConfirmed ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Venta registrada correctamente.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
