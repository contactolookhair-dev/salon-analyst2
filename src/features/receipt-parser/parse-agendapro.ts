import type {
  ParsedReceiptDocument,
  QuantityUnit,
} from "@/shared/types/sales-processing";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseCLP(value: string) {
  if (!value) return 0;

  const cleaned = value
    .replace(/\s+/g, "")
    .replace(/\$/g, "")
    .trim();

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    // Formato chileno: 40.000,00
    if (lastComma > lastDot) {
      const normalized = cleaned.replace(/\./g, "").replace(",", ".");
      const result = Number(normalized);
      return Number.isFinite(result) ? Math.round(result) : 0;
    }

    // Formato tipo USD: 84,000.00
    const normalized = cleaned.replace(/,/g, "");
    const result = Number(normalized);
    return Number.isFinite(result) ? Math.round(result) : 0;
  }

  if (hasComma) {
    const parts = cleaned.split(",");

    // Si tiene coma y al final 1-2 dígitos, asumimos decimal
    if (parts.length === 2 && parts[1].length <= 2) {
      const normalized = cleaned.replace(/\./g, "").replace(",", ".");
      const result = Number(normalized);
      return Number.isFinite(result) ? Math.round(result) : 0;
    }

    // Si no, asumimos separador de miles
    const normalized = cleaned.replace(/,/g, "");
    const result = Number(normalized);
    return Number.isFinite(result) ? Math.round(result) : 0;
  }

  if (hasDot) {
    const parts = cleaned.split(".");

    // Si tiene punto y al final 1-2 dígitos, asumimos decimal
    if (parts.length === 2 && parts[1].length <= 2) {
      const result = Number(cleaned);
      return Number.isFinite(result) ? Math.round(result) : 0;
    }

    // Si no, asumimos separador de miles
    const normalized = cleaned.replace(/\./g, "");
    const result = Number(normalized);
    return Number.isFinite(result) ? Math.round(result) : 0;
  }

  const result = Number(cleaned);
  return Number.isFinite(result) ? Math.round(result) : 0;
}

function extractValue(rawText: string, labels: string[]) {
  for (const label of labels) {
    const escapedLabel = escapeRegExp(label);

    const patterns = [
      new RegExp(`${escapedLabel}\\s*:?\\s*(.+)`, "i"),
      new RegExp(`${escapedLabel}\\s*\\n\\s*(.+)`, "i"),
    ];

    for (const regex of patterns) {
      const match = rawText.match(regex);

      if (match?.[1]?.trim()) {
        return match[1].trim();
      }
    }
  }

  return "";
}

function extractCurrencyFromLabels(rawText: string, labels: string[]) {
  for (const label of labels) {
    const escapedLabel = escapeRegExp(label);

    const patterns = [
      new RegExp(
        `${escapedLabel}\\s*:?\\s*\\$?\\s*([\\d.,]+)`,
        "i"
      ),
      new RegExp(
        `${escapedLabel}[\\s\\S]{0,40}?\\$\\s*([\\d.,]+)`,
        "i"
      ),
    ];

    for (const regex of patterns) {
      const match = rawText.match(regex);

      if (match?.[1]) {
        const parsed = parseCLP(match[1]);
        if (parsed > 0) {
          return parsed;
        }
      }
    }
  }

  return 0;
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

function extractServiceName(rawText: string) {
  const directValue = extractValue(rawText, [
    "Servicio",
    "Service",
    "Treatment",
    "Detalle de la venta",
    "Detalle venta",
  ]);

  if (
    directValue &&
    !/^ticket\s*#/i.test(directValue) &&
    !/^cliente\b/i.test(directValue) &&
    !/^fecha\b/i.test(directValue)
  ) {
    return directValue;
  }

  const lines = rawText
    .split("\n")
    .map((line) => normalizeText(line))
    .filter(Boolean);

  const detailIndex = lines.findIndex((line) =>
    /detalle de la venta|detalle venta/i.test(line)
  );

  if (detailIndex >= 0) {
    for (let i = detailIndex + 1; i < Math.min(detailIndex + 8, lines.length); i += 1) {
      const line = lines[i];

      if (
        !/ticket\s*#|fecha|cliente|atendido por|importe base|total|monto pagado/i.test(
          line
        ) &&
        !/^\$?\s*[\d.,]+$/.test(line)
      ) {
        return line;
      }
    }
  }

  return "";
}

function extractDate(rawText: string) {
  return (
    extractValue(rawText, ["Fecha", "Date"]) ||
    rawText.match(
      /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4})/i
    )?.[1] ||
    ""
  );
}

function extractProfessional(rawText: string) {
  return (
    extractValue(rawText, [
      "Profesional",
      "Staff",
      "Employee",
      "Atendido por",
    ]) || ""
  );
}

function extractBranch(rawText: string) {
  return (
    extractValue(rawText, ["Sucursal", "Branch", "Location"]) || ""
  );
}

function extractClient(rawText: string) {
  return (
    extractValue(rawText, ["Cliente", "Client"]) || "Cliente no identificado"
  );
}

export function parseAgendaProReceipt(rawText: string): ParsedReceiptDocument {
  const serviceName = extractServiceName(rawText);

  const lineGross =
    extractCurrencyFromLabels(rawText, [
      "Precio",
      "Price",
      "Subtotal",
      "Total linea",
      "Total línea",
      "Importe base",
    ]) || 0;

  const totalDocument =
    extractCurrencyFromLabels(rawText, [
      "Total",
      "Total a pagar",
      "Monto total",
      "Monto pagado",
    ]) || 0;

  const branchName = extractBranch(rawText);
  const professionalName = extractProfessional(rawText);
  const clientName = extractClient(rawText);
  const date = extractDate(rawText);

  const observations: string[] = [];

  if (!serviceName) {
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

  if (totalDocument <= 0 && lineGross <= 0) {
    observations.push("No se pudo detectar un monto válido en la boleta.");
  }

  return {
    source: "agendapro",
    date,
    branchName,
    professionalName,
    clientName,
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
    totalDocument: totalDocument || lineGross,
    observations,
    rawText,
  };
}