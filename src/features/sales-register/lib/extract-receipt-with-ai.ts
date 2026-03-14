import "server-only";

import OpenAI from "openai";

import { extractCurrency, extractKnownBranch, parseDateToIso } from "@/features/receipt-parser/parser-utils";
import type { ReceiptExtraction } from "@/features/sales-register/types";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

type AIExtractionInput = {
  rawText?: string;
  fileBuffer?: Buffer | Uint8Array;
  fileName?: string;
  mimeType?: string;
};

type AIInputContent =
  | {
      type: "input_text";
      text: string;
    }
  | {
      type: "input_file";
      filename: string;
      file_data: string;
    };

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function logAIExtractionEvent(message: string, context: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(`[extract-receipt-with-ai] ${message}`, context);
}

function detectSource(rawText: string) {
  const normalized = rawText.toLowerCase();

  if (normalized.includes("agendapro")) {
    return "agendapro" as const;
  }

  if (normalized.includes("fresha")) {
    return "fresha" as const;
  }

  return "unknown" as const;
}

function buildLocalRescueExtraction(rawText: string): ReceiptExtraction {
  const totalMatch = rawText.match(/(?:total|monto pagado)\s*:?\s*\$?\s*([\d.,]+)/i);
  const receiptNumberMatch = rawText.match(/(?:sale|venta|ticket)\s*#?\s*([A-Za-z0-9-]+)/i);
  const paymentMethodMatch = rawText.match(
    /(?:pagado en|payment method|credito|crédito|débito|debito)\s*:?\s*([^\n]+)/i
  );
  const itemMatches = Array.from(
    rawText.matchAll(/(?:^|\n)(\d+)?\s*([^\n$]+?)\s+\$ ?([\d.,]+)(?:\n|$)/gm)
  );
  const grossTotal = totalMatch?.[1] ? extractCurrency(totalMatch[1]) : null;
  const branchName = extractKnownBranch(rawText) || null;
  const dateMatch = rawText.match(
    /(\d{2}[-/]\d{2}[-/]\d{4}|\d{1,2}\s+[A-Za-zÁÉÍÓÚáéíóú]{3,}\s+\d{4})/
  );

  return {
    source: detectSource(rawText),
    extractedBy: "hybrid",
    clientName: null,
    clientEmail: null,
    clientPhone: null,
    professionalName: null,
    branchName,
    receiptNumber: receiptNumberMatch?.[1] ?? null,
    date: dateMatch?.[1] ? parseDateToIso(dateMatch[1]) : null,
    time: null,
    issuerName: branchName,
    paymentMethod: paymentMethodMatch?.[1]?.trim() ?? null,
    subtotal: null,
    tax: null,
    grossTotal,
    netTotal: null,
    totalPaid: grossTotal,
    balance: null,
    currency: "CLP",
    origin: "pdf",
    items: itemMatches.map((match, index) => ({
      id: `rescued-item-${index + 1}`,
      name: match[2].trim(),
      type: "unknown",
      quantity: match[1] ? Number(match[1]) : 1,
      unit: null,
      unitPrice: match[3] ? extractCurrency(match[3]) : null,
      lineTotal: match[3] ? extractCurrency(match[3]) : null,
      warnings: [],
      confidence: 0.45,
    })),
    warnings: [
      "Se usó rescate asistido/local porque la extracción estructurada no fue suficiente.",
      ...(branchName ? [] : ["No se pudo confirmar la sucursal."]),
    ],
    confidence: 0.45,
    rawText,
  };
}

function buildBase64FileData(
  fileBuffer: Buffer | Uint8Array,
  mimeType: string
) {
  const base64 = Buffer.from(fileBuffer).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

function normalizeAIResponse(
  parsed: Omit<ReceiptExtraction, "source" | "extractedBy" | "rawText">,
  rawText: string
): ReceiptExtraction {
  return {
    source: detectSource(`${rawText}\n${parsed.branchName ?? ""}`),
    extractedBy: "ai",
    rawText,
    ...parsed,
  };
}

export async function extractReceiptWithAI({
  rawText = "",
  fileBuffer,
  fileName,
  mimeType,
}: AIExtractionInput): Promise<ReceiptExtraction> {
  const client = getOpenAIClient();

  if (!client) {
    logAIExtractionEvent("partial_rescue_no_openai", {
      fileName,
      hasRawText: Boolean(rawText.trim()),
      hasFile: Boolean(fileBuffer?.byteLength),
    });
    return buildLocalRescueExtraction(rawText);
  }

  try {
    const inputContent: AIInputContent[] = [];

    if (fileBuffer?.byteLength && mimeType) {
      inputContent.push({
        type: "input_file",
        filename: fileName ?? "receipt",
        file_data: buildBase64FileData(fileBuffer, mimeType),
      });
    }

    if (rawText.trim()) {
      inputContent.push({
        type: "input_text",
        text: `Texto rescatado localmente del documento:\n${rawText}`,
      });
    }

    if (inputContent.length === 0) {
      return buildLocalRescueExtraction(rawText);
    }

    logAIExtractionEvent("ai_fallback", {
      fileName,
      hasRawText: Boolean(rawText.trim()),
      hasFile: Boolean(fileBuffer?.byteLength),
      mimeType,
    });

    const response = await client.responses.create({
      model: process.env.OPENAI_RECEIPT_MODEL ?? DEFAULT_OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Extrae datos útiles desde boletas de salón en Chile. No inventes datos. Si no estás seguro usa null y agrega warning. Si recibes PDF o imagen, úsalo como fuente principal; si además recibes texto rescatado, úsalo como apoyo.",
            },
          ],
        },
        {
          role: "user",
          content: inputContent,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "receipt_extraction",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              clientName: { type: ["string", "null"] },
              clientEmail: { type: ["string", "null"] },
              clientPhone: { type: ["string", "null"] },
              professionalName: { type: ["string", "null"] },
              branchName: { type: ["string", "null"] },
              receiptNumber: { type: ["string", "null"] },
              date: { type: ["string", "null"] },
              time: { type: ["string", "null"] },
              issuerName: { type: ["string", "null"] },
              paymentMethod: { type: ["string", "null"] },
              subtotal: { type: ["number", "null"] },
              tax: { type: ["number", "null"] },
              grossTotal: { type: ["number", "null"] },
              netTotal: { type: ["number", "null"] },
              totalPaid: { type: ["number", "null"] },
              balance: { type: ["number", "null"] },
              currency: { type: ["string", "null"] },
              origin: { type: "string" },
              warnings: {
                type: "array",
                items: { type: "string" },
              },
              confidence: { type: "number" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    type: { type: "string" },
                    quantity: { type: "number" },
                    unit: { type: ["string", "null"] },
                    unitPrice: { type: ["number", "null"] },
                    lineTotal: { type: ["number", "null"] },
                    warnings: {
                      type: "array",
                      items: { type: "string" },
                    },
                    confidence: { type: "number" },
                  },
                  required: [
                    "id",
                    "name",
                    "type",
                    "quantity",
                    "unit",
                    "unitPrice",
                    "lineTotal",
                    "warnings",
                    "confidence",
                  ],
                },
              },
            },
            required: [
              "clientName",
              "clientEmail",
              "clientPhone",
              "professionalName",
              "branchName",
              "receiptNumber",
              "date",
              "time",
              "issuerName",
              "paymentMethod",
              "subtotal",
              "tax",
              "grossTotal",
              "netTotal",
              "totalPaid",
              "balance",
              "currency",
              "origin",
              "warnings",
              "confidence",
              "items",
            ],
          },
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as Omit<
      ReceiptExtraction,
      "source" | "extractedBy" | "rawText"
    >;

    return normalizeAIResponse(parsed, rawText);
  } catch (error) {
    logAIExtractionEvent("partial_rescue_after_ai_error", {
      fileName,
      error: error instanceof Error ? error.message : String(error),
    });
    return buildLocalRescueExtraction(rawText);
  }
}
