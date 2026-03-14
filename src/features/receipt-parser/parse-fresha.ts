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

function sanitizeExtractedText(value: string) {
  const sanitizedValue = normalizeWhitespace(value);

  if (!sanitizedValue || /^null$/i.test(sanitizedValue) || /^undefined$/i.test(sanitizedValue)) {
    return "";
  }

  return sanitizedValue;
}

function extractClient(rawText: string) {
  const labeledClient = extractValue(rawText, ["Cliente", "Client"]);

  if (labeledClient) {
    return sanitizeExtractedText(labeledClient);
  }

  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const clientLabelIndex = lines.findIndex((line) => /^cliente$/i.test(line));

  if (clientLabelIndex >= 0 && lines[clientLabelIndex + 1]) {
    return sanitizeExtractedText(lines[clientLabelIndex + 1]);
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

function extractServiceLines(rawText: string) {
  const labeledService = extractValue(rawText, ["Servicio", "Service", "Treatment"]);

  if (labeledService) {
    const lineTotal =
      extractCurrency(extractValue(rawText, ["Precio", "Price", "Subtotal"])) ||
      extractCurrency(extractValue(rawText, ["Total", "Total a pagar"]));

    return [
      {
        rawName: sanitizeExtractedText(labeledService),
        quantity: extractQuantity(rawText),
        unit: extractUnit(rawText),
        lineTotal,
      },
    ];
  }

  const lineMatches = Array.from(
    rawText.matchAll(/(?:^|\n)(\d+)\s+(.+?)\s+\$\s*([\d.,]+)(?:\n|$)/gm)
  );

  return lineMatches.map((match) => ({
    rawName: sanitizeExtractedText(match[2]),
    quantity: Number(match[1]) || 1,
    unit: extractUnit(match[2]),
    lineTotal: extractCurrency(match[3]),
  }));
}

export function parseFreshaReceipt(rawText: string): ParsedReceiptDocument {
  const serviceLines = extractServiceLines(rawText);
  const totalDocument = extractCurrency(
    extractValue(rawText, ["Total", "Total a pagar", "Amount paid"])
  );
  const branchName =
    extractValue(rawText, ["Sucursal", "Branch", "Location"]) ||
    extractKnownBranch(rawText);
  const date = extractDate(rawText);
  const observations: string[] = [];
  const professionalName = sanitizeExtractedText(
    extractValue(rawText, ["Profesional", "Staff", "Employee"])
  );

  if (!serviceLines.length) {
    observations.push("No se pudo detectar el nombre del servicio o producto.");
  }

  if (!branchName) {
    observations.push("No se pudo detectar la sucursal en la boleta.");
  }

  if (!professionalName) {
    observations.push("No se pudo detectar el profesional en la boleta.");
  }

  if (!date) {
    observations.push("No se pudo detectar la fecha en la boleta.");
  }

  return {
    source: "fresha",
    date,
    branchName,
    professionalName,
    clientName: extractClient(rawText),
    items: serviceLines.map((serviceLine) => ({
      rawName: serviceLine.rawName,
      quantity: serviceLine.quantity,
      unit: serviceLine.unit,
      lineTotal: serviceLine.lineTotal || totalDocument,
      notes: extractValue(rawText, ["Observaciones", "Notes"]),
    })),
    totalDocument,
    observations,
    rawText,
  };
}
