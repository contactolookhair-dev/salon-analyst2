import type { ParsedReceiptDocument, QuantityUnit } from "@/shared/types/sales-processing";

import {
  extractCurrency,
  extractKnownBranch,
  extractValue,
  normalizeWhitespace,
  parseDateToIso,
} from "@/features/receipt-parser/parser-utils";

function inferUnitFromServiceName(serviceName: string): QuantityUnit | undefined {
  if (/(pares|par)\b/i.test(serviceName)) {
    return "pair";
  }

  if (/(laminas|láminas|lamina|lámina)\b/i.test(serviceName)) {
    return "sheet";
  }

  return undefined;
}

function extractClient(rawText: string) {
  const labeledClient = extractValue(rawText, ["Cliente", "Client"]);

  if (labeledClient) {
    return labeledClient;
  }

  const detailIndex = rawText.indexOf("Detalle de la venta");

  if (detailIndex === -1) {
    return "Cliente no identificado";
  }

  const beforeDetail = rawText.slice(0, detailIndex);
  const lines = beforeDetail
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^rut:/i.test(line) &&
        !/^direcci[oó]n:/i.test(line) &&
        !/^nivel/i.test(line) &&
        !/^condes/i.test(line) &&
        !/^apumanque/i.test(line)
    );

  return lines[lines.length - 1] ?? "Cliente no identificado";
}

function extractItems(rawText: string) {
  const itemBlockMatch = rawText.match(
    /Detalle de la venta\s+([\s\S]+?)\s+TOTAL\s*:?\s*\$\s*[\d.,]+/i
  );

  if (!itemBlockMatch?.[1]) {
    return [];
  }

  const normalizedBlock = normalizeWhitespace(itemBlockMatch[1]).replace(
    /\s+\$\s*/g,
    " $"
  );
  const matches = normalizedBlock.matchAll(
    /(.+?)\s+x(\d+)\s+\$([\d.,]+)/g
  );

  return Array.from(matches).map((match) => ({
    rawName: normalizeWhitespace(match[1]),
    quantity: Number(match[2]),
    unit: inferUnitFromServiceName(match[1]),
    lineTotal: extractCurrency(match[3]),
    notes: "",
  }));
}

function extractDate(rawText: string) {
  const labeledDate = extractValue(rawText, ["Fecha", "Date"]);

  if (labeledDate) {
    return parseDateToIso(labeledDate);
  }

  const numericDateMatch = rawText.match(/(\d{2}-\d{2}-\d{4})(?:\s+\d{2}:\d{2})?/);
  return numericDateMatch?.[1] ? parseDateToIso(numericDateMatch[1]) : "";
}

export function parseAgendaProReceipt(rawText: string): ParsedReceiptDocument {
  const items = extractItems(rawText);
  const branchName =
    extractValue(rawText, ["Sucursal", "Branch", "Location"]) ||
    extractKnownBranch(rawText);
  const date = extractDate(rawText);
  const totalDocument =
    extractCurrency(extractValue(rawText, ["Total", "Total a pagar", "Monto total"])) ||
    extractCurrency(extractValue(rawText, ["TOTAL", "Monto pagado"]));
  const professionalName =
    extractValue(rawText, ["Profesional", "Staff", "Employee"]) ||
    normalizeWhitespace(
      rawText.match(/Atendido por:\s*([^\n,]+)/i)?.[1] ??
        rawText.match(/([^\n]+)\s+\(prestador\)/i)?.[1] ??
        ""
    );
  const observations: string[] = [];

  if (items.length === 0) {
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
    source: "agendapro",
    date,
    branchName,
    professionalName,
    clientName: extractClient(rawText),
    items,
    totalDocument,
    observations,
    rawText,
  };
}
