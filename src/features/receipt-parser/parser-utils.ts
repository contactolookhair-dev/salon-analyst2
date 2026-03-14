import { branches } from "@/features/branches/data/mock-branches";
import { normalizeLooseName } from "@/shared/lib/normalize";

const monthMap: Record<string, string> = {
  jan: "01",
  ene: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  ago: "08",
  sep: "09",
  sept: "09",
  oct: "10",
  nov: "11",
  dec: "12",
  dic: "12",
};

export function extractValue(rawText: string, labels: string[]) {
  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?:^|\\n)${escapedLabel}\\s*:?\\s*(.+)$`,
      "im"
    );
    const match = rawText.match(regex);

    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return "";
}

export function extractCurrency(value: string) {
  const sanitized = value.replace(/[^\d,.-]/g, "").trim();

  if (!sanitized) {
    return 0;
  }

  const hasComma = sanitized.includes(",");
  const hasDot = sanitized.includes(".");

  if (hasComma && hasDot) {
    const lastComma = sanitized.lastIndexOf(",");
    const lastDot = sanitized.lastIndexOf(".");
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const integerPart = sanitized
      .slice(0, sanitized.lastIndexOf(decimalSeparator))
      .replace(/[^\d-]/g, "");

    return Number(integerPart || "0");
  }

  if (/[.,]\d{3}$/.test(sanitized)) {
    return Number(sanitized.replace(/[^\d-]/g, "")) || 0;
  }

  if (/[.,]\d{1,2}$/.test(sanitized)) {
    const integerPart = sanitized.slice(0, -3).replace(/[^\d-]/g, "");
    return Number(integerPart || "0");
  }

  return Number(sanitized.replace(/[^\d-]/g, "")) || 0;
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function extractKnownBranch(rawText: string) {
  const normalizedText = normalizeLooseName(rawText);

  const branch = branches.find((item) =>
    normalizedText.includes(normalizeLooseName(item.name))
  );

  return branch?.name ?? "";
}

export function parseDateToIso(value: string) {
  const normalizedValue = normalizeWhitespace(value);

  const numericMatch = normalizedValue.match(
    /(\d{2})[-/](\d{2})[-/](\d{4})/
  );

  if (numericMatch) {
    const [, day, month, year] = numericMatch;
    return `${year}-${month}-${day}`;
  }

  const textualMatch = normalizedValue.match(
    /(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóú]{3,})\s+(\d{4})/i
  );

  if (textualMatch) {
    const [, day, rawMonth, year] = textualMatch;
    const month = monthMap[normalizeLooseName(rawMonth).slice(0, 4)] ?? monthMap[normalizeLooseName(rawMonth).slice(0, 3)];

    if (month) {
      return `${year}-${month}-${day.padStart(2, "0")}`;
    }
  }

  return "";
}
