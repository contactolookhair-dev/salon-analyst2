import type { ParsedReceiptDocument, QuantityUnit } from "@/shared/types/sales-processing";

import {
  extractCurrency,
  extractKnownBranch,
  extractValue,
  normalizeWhitespace,
  parseDateToIso,
} from "@/features/receipt-parser/parser-utils";

function extractQuantity(rawText: string) {
  const quantityMatch = rawText.match(
    /(cantidad|cant\.?|pares|laminas|láminas|unidades|qty)\s*:?[\s-]*(\d+)/i
  );

  if (quantityMatch?.[2]) {
    return Number(quantityMatch[2]);
  }

  const saleLineMatch = rawText.match(/(?:^|\n)(\d+)\s+.+?\$\s*[\d.,]+/m);
  return saleLineMatch?.[1] ? Number(saleLineMatch[1]) : 1;
}

function extractUnit(rawText: string): QuantityUnit | undefined {
  if (/(pares|par)\b/i.test(rawText)) {
    return "pair";
  }

  if (/(laminas|láminas|lamina|lámina)\b/i.test(rawText)) {
    return "sheet";
  }

  if (/(sesion|sesión|session)\b/i.test(rawText)) {
    return "session";
  }

  if (/(unidades|unidad|unit)\b/i.test(rawText)) {
    return "unit";
  }

  return undefined;
}

function extractClient(rawText: string) {
  const labeledClient = extractValue(rawText, ["Cliente", "Client"]);

  if (labeledClient) {
    return labeledClient;
  }

  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const clientLabelIndex = lines.findIndex((line) => /^cliente$/i.test(line));

  if (clientLabelIndex >= 0 && lines[clientLabelIndex + 1]) {
    return lines[clientLabelIndex + 1];
  }

  return "Cliente no identificado";
}

function extractDate(rawText: string) {
  const labeledDate = extractValue(rawText, ["Fecha", "Date"]);

  if (labeledDate) {
    return parseDateToIso(labeledDate);
  }

  const textDateMatch = rawText.match(
    /(?:^|\n)(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)[^,\n]*,\s*(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/im
  );

  if (textDateMatch?.[1]) {
    return parseDateToIso(textDateMatch[1]);
  }

  return "";
}

function extractServiceLine(rawText: string) {
  const labeledService = extractValue(rawText, [
    "Servicio",
    "Service",
    "Treatment",
  ]);

  if (labeledService) {
    return {
      rawName: labeledService,
      lineTotal:
        extractCurrency(extractValue(rawText, ["Precio", "Price", "Subtotal"])) ||
        extractCurrency(extractValue(rawText, ["Total", "Total a pagar"])),
    };
  }

  const saleLineMatch = rawText.match(
    /(?:^|\n)(\d+)\s+(.+?)\s+\$\s*([\d.,]+)(?:\n|$)/m
  );

  if (!saleLineMatch) {
    return null;
  }

  return {
    rawName: normalizeWhitespace(saleLineMatch[2]),
    lineTotal: extractCurrency(saleLineMatch[3]),
  };
}

export function parseFreshaReceipt(rawText: string): ParsedReceiptDocument {
  const serviceLine = extractServiceLine(rawText);
  const totalDocument = extractCurrency(
    extractValue(rawText, ["Total", "Total a pagar", "Amount paid"])
  );
  const branchName =
    extractValue(rawText, ["Sucursal", "Branch", "Location"]) ||
    extractKnownBranch(rawText);
  const date = extractDate(rawText);
  const observations: string[] = [];

  if (!serviceLine?.rawName) {
    observations.push("No se pudo detectar el nombre del servicio o producto.");
  }

  if (!branchName) {
    observations.push("No se pudo detectar la sucursal en la boleta.");
  }

  if (!extractValue(rawText, ["Profesional", "Staff", "Employee"])) {
    observations.push("No se pudo detectar el profesional en la boleta.");
  }

  if (!date) {
    observations.push("No se pudo detectar la fecha en la boleta.");
  }

  return {
    source: "fresha",
    date,
    branchName,
    professionalName: extractValue(rawText, ["Profesional", "Staff", "Employee"]),
    clientName: extractClient(rawText),
    items: serviceLine
      ? [
          {
            rawName: serviceLine.rawName,
            quantity: extractQuantity(rawText),
            unit: extractUnit(rawText),
            lineTotal: serviceLine.lineTotal || totalDocument,
            notes: extractValue(rawText, ["Observaciones", "Notes"]),
          },
        ]
      : [],
    totalDocument,
    observations,
    rawText,
  };
}
