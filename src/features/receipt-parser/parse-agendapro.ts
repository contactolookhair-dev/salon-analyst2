import type { ParsedReceiptResult } from "@/features/receipt-parser/receipt-types";

function extractValue(rawText: string, labels: string[]) {
  for (const label of labels) {
    const regex = new RegExp(`${label}\\s*:?\\s*(.+)`, "i");
    const match = rawText.match(regex);

    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return "";
}

function extractCurrency(value: string) {
  const numeric = value.replace(/[^\d]/g, "");

  return Number(numeric);
}

export function parseAgendaProReceipt(rawText: string): ParsedReceiptResult {
  return {
    provider: "agendapro",
    rawText,
    sale: {
      date: extractValue(rawText, ["Fecha", "Date"]),
      branch: extractValue(rawText, [
        "Sucursal",
        "Branch",
        "Location",
      ]) as ParsedReceiptResult["sale"]["branch"],
      professional: extractValue(rawText, ["Profesional", "Staff", "Employee"]),
      client: extractValue(rawText, ["Cliente", "Client"]),
      service: extractValue(rawText, ["Servicio", "Service", "Treatment"]),
      price: extractCurrency(extractValue(rawText, ["Precio", "Price", "Subtotal"])),
      total: extractCurrency(extractValue(rawText, ["Total", "Total a pagar"])),
    },
  };
}
