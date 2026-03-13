import type { ParsedReceiptDocument, QuantityUnit } from "@/shared/types/sales-processing";

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

  return numeric ? Number(numeric) : 0;
}

function extractQuantity(rawText: string) {
  const quantityMatch = rawText.match(
    /(cantidad|cant\.?|pares|laminas|láminas|unidades|qty)\s*:?[\s-]*(\d+)/i
  );

  return quantityMatch?.[2] ? Number(quantityMatch[2]) : 1;
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

export function parseAgendaProReceipt(rawText: string): ParsedReceiptDocument {
  const serviceName = extractValue(rawText, ["Servicio", "Service", "Treatment"]);
  const lineGross =
    extractCurrency(extractValue(rawText, ["Precio", "Price", "Subtotal"])) ||
    extractCurrency(extractValue(rawText, ["Total linea", "Total línea"]));
  const totalDocument = extractCurrency(
    extractValue(rawText, ["Total", "Total a pagar", "Monto total"])
  );
  const observations: string[] = [];

  if (!serviceName) {
    observations.push("No se pudo detectar el nombre del servicio o producto.");
  }

  if (!extractValue(rawText, ["Sucursal", "Branch", "Location"])) {
    observations.push("No se pudo detectar la sucursal en la boleta.");
  }

  if (!extractValue(rawText, ["Profesional", "Staff", "Employee"])) {
    observations.push("No se pudo detectar el profesional en la boleta.");
  }

  return {
    source: "agendapro",
    date: extractValue(rawText, ["Fecha", "Date"]),
    branchName: extractValue(rawText, ["Sucursal", "Branch", "Location"]),
    professionalName: extractValue(rawText, ["Profesional", "Staff", "Employee"]),
    clientName:
      extractValue(rawText, ["Cliente", "Client"]) || "Cliente no identificado",
    items: serviceName
      ? [
          {
            rawName: serviceName,
            quantity: extractQuantity(rawText),
            unit: extractUnit(rawText),
            lineTotal: lineGross || totalDocument,
            notes: extractValue(rawText, ["Observaciones", "Notes"]),
          },
        ]
      : [],
    totalDocument,
    observations,
    rawText,
  };
}
