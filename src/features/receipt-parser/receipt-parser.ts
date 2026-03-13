import { PDFParse } from "pdf-parse";

import { parseAgendaProReceipt } from "@/features/receipt-parser/parse-agendapro";
import { parseFreshaReceipt } from "@/features/receipt-parser/parse-fresha";
import type {
  ParsedReceiptResult,
  ReceiptProvider,
} from "@/features/receipt-parser/receipt-types";

export function detectReceiptProvider(rawText: string): ReceiptProvider {
  if (rawText.toUpperCase().includes("FRESHA")) {
    return "fresha";
  }

  if (rawText.toLowerCase().includes("agendapro")) {
    return "agendapro";
  }

  throw new Error("No pude detectar el tipo de boleta.");
}

export function parseReceiptText(rawText: string): ParsedReceiptResult {
  const provider = detectReceiptProvider(rawText);

  if (provider === "fresha") {
    return parseFreshaReceipt(rawText);
  }

  return parseAgendaProReceipt(rawText);
}

export async function extractPdfTextFromBuffer(buffer: Buffer | Uint8Array) {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export async function parseReceiptBuffer(buffer: Buffer | Uint8Array) {
  const rawText = await extractPdfTextFromBuffer(buffer);

  return parseReceiptText(rawText);
}
