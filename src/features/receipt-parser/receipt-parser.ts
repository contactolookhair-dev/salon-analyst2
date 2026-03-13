import { PDFParse } from "pdf-parse";

import { parseAgendaProReceipt } from "@/features/receipt-parser/parse-agendapro";
import { parseFreshaReceipt } from "@/features/receipt-parser/parse-fresha";
import type {
  ParsedReceiptDocument,
  ProcessedSale,
  ReceiptSource,
} from "@/features/receipt-parser/receipt-types";
import { processParsedSale } from "@/lib/finance";

export type ReceiptParserStage =
  | "request_validation"
  | "pdf_extraction"
  | "provider_detection"
  | "field_parsing"
  | "financial_processing";

export type ReceiptProcessingResult = {
  parsedReceipt: ParsedReceiptDocument;
  processedSale: ProcessedSale;
};

export type ReceiptProcessingSuccess = {
  success: true;
  data: ReceiptProcessingResult;
  warnings: string[];
  fallback: {
    fileName?: string;
    detectedSource: ReceiptSource;
    extractedTextPreview: string;
  };
};

export type ReceiptProcessingFailure = {
  success: false;
  error: string;
  stage: ReceiptParserStage;
  code: string;
  fallback: {
    fileName?: string;
    detectedSource: ReceiptSource;
    extractedTextPreview: string;
    warnings: string[];
  };
};

export type ReceiptProcessingApiResponse =
  | ReceiptProcessingSuccess
  | ReceiptProcessingFailure;

type ReceiptProcessingOptions = {
  fileName?: string;
};

type ParserFailureContext = {
  fileName?: string;
  rawText?: string;
  detectedSource?: ReceiptSource;
  warnings?: string[];
  cause?: unknown;
};

class ReceiptParserError extends Error {
  code: string;
  stage: ReceiptParserStage;
  fallback: ReceiptProcessingFailure["fallback"];

  constructor(
    message: string,
    stage: ReceiptParserStage,
    code: string,
    context: ParserFailureContext = {}
  ) {
    super(message);
    this.name = "ReceiptParserError";
    this.code = code;
    this.stage = stage;
    this.fallback = {
      fileName: context.fileName,
      detectedSource: context.detectedSource ?? "unknown",
      extractedTextPreview: buildTextPreview(context.rawText),
      warnings: context.warnings ?? [],
    };

    if (context.cause) {
      this.cause = context.cause;
    }
  }
}

function buildTextPreview(rawText?: string) {
  if (!rawText?.trim()) {
    return "";
  }

  return rawText.replace(/\s+/g, " ").trim().slice(0, 500);
}

function logReceiptEvent(message: string, context: Record<string, unknown>) {
  console.info(`[receipt-parser] ${message}`, context);
}

function logReceiptError(message: string, context: Record<string, unknown>) {
  console.error(`[receipt-parser] ${message}`, context);
}

export function detectReceiptProvider(rawText: string): ReceiptSource {
  const normalizedText = rawText.toLowerCase();

  if (normalizedText.includes("fresha")) {
    return "fresha";
  }

  if (normalizedText.includes("agendapro")) {
    return "agendapro";
  }

  return "unknown";
}

function validateParsedReceipt(parsedReceipt: ParsedReceiptDocument) {
  const warnings = [...parsedReceipt.observations];

  if (!parsedReceipt.date) {
    warnings.push("Falta fecha en el documento.");
  }

  if (parsedReceipt.totalDocument <= 0) {
    warnings.push("Falta total en el documento.");
  }

  if (parsedReceipt.items.length === 0) {
    warnings.push("No se encontraron servicios o productos en la boleta.");
  }

  if (
    parsedReceipt.items.length > 0 &&
    parsedReceipt.items.every((item) => item.lineTotal <= 0)
  ) {
    warnings.push("No se pudo detectar el total bruto de los items.");
  }

  return warnings;
}

function mapPdfParseError(error: unknown, context: ParserFailureContext) {
  const rawMessage =
    error instanceof Error ? error.message : "No pude leer el PDF.";
  const normalizedMessage = rawMessage.toLowerCase();

  if (normalizedMessage.includes("invalid pdf")) {
    return new ReceiptParserError(
      "El archivo no parece ser un PDF valido o esta dañado.",
      "pdf_extraction",
      "invalid_pdf",
      { ...context, cause: error }
    );
  }

  if (normalizedMessage.includes("password")) {
    return new ReceiptParserError(
      "El PDF esta protegido con contraseña y no se puede leer automaticamente.",
      "pdf_extraction",
      "password_protected_pdf",
      { ...context, cause: error }
    );
  }

  if (normalizedMessage.includes("expected pattern")) {
    return new ReceiptParserError(
      "No pude interpretar la estructura interna del PDF. Intenta exportarlo nuevamente desde Fresha o AgendaPro.",
      "pdf_extraction",
      "pdf_structure_error",
      { ...context, cause: error }
    );
  }

  return new ReceiptParserError(
    "No pude leer el contenido del PDF.",
    "pdf_extraction",
    "pdf_extraction_failed",
    { ...context, cause: error }
  );
}

export function parseReceiptText(rawText: string): ParsedReceiptDocument {
  const provider = detectReceiptProvider(rawText);

  if (provider === "unknown") {
    throw new ReceiptParserError(
      "No se pudo identificar si la boleta es de Fresha o AgendaPro.",
      "provider_detection",
      "unknown_provider",
      {
        rawText,
        detectedSource: provider,
        warnings: [
          "No se detecto la marca Fresha ni AgendaPro en el texto extraido.",
        ],
      }
    );
  }

  const parsedReceipt =
    provider === "fresha"
      ? parseFreshaReceipt(rawText)
      : parseAgendaProReceipt(rawText);
  const validationWarnings = validateParsedReceipt(parsedReceipt);

  if (validationWarnings.length > 0) {
    throw new ReceiptParserError(
      validationWarnings[0] ?? "Faltan datos relevantes en la boleta.",
      "field_parsing",
      "missing_required_fields",
      {
        rawText,
        detectedSource: provider,
        warnings: validationWarnings,
      }
    );
  }

  return parsedReceipt;
}

export function processReceiptText(
  rawText: string,
  options: ReceiptProcessingOptions = {}
): ReceiptProcessingResult {
  const parsedReceipt = parseReceiptText(rawText);

  try {
    return {
      parsedReceipt,
      processedSale: processParsedSale(parsedReceipt),
    };
  } catch (error) {
    throw new ReceiptParserError(
      "No pude calcular la venta procesada desde la boleta.",
      "financial_processing",
      "financial_processing_failed",
      {
        fileName: options.fileName,
        rawText,
        detectedSource: parsedReceipt.source,
        warnings: parsedReceipt.observations,
        cause: error,
      }
    );
  }
}

export async function extractPdfTextFromBuffer(
  buffer: Buffer | Uint8Array,
  options: ReceiptProcessingOptions = {}
) {
  if (!buffer.byteLength) {
    throw new ReceiptParserError(
      "El archivo PDF esta vacio.",
      "request_validation",
      "empty_file",
      {
        fileName: options.fileName,
      }
    );
  }

  const parser = new PDFParse({ data: buffer });

  try {
    logReceiptEvent("starting_pdf_extraction", {
      fileName: options.fileName,
      byteLength: buffer.byteLength,
    });

    const result = await parser.getText();
    const text = result.text ?? "";

    if (!text.trim()) {
      throw new ReceiptParserError(
        "El PDF no contiene texto seleccionable.",
        "pdf_extraction",
        "no_selectable_text",
        {
          fileName: options.fileName,
          rawText: text,
        }
      );
    }

    return text;
  } catch (error) {
    if (error instanceof ReceiptParserError) {
      throw error;
    }

    throw mapPdfParseError(error, {
      fileName: options.fileName,
    });
  } finally {
    await parser.destroy();
  }
}

export async function processReceiptBuffer(
  buffer: Buffer | Uint8Array,
  options: ReceiptProcessingOptions = {}
): Promise<ReceiptProcessingApiResponse> {
  let rawText = "";
  let detectedSource: ReceiptSource = "unknown";

  try {
    rawText = await extractPdfTextFromBuffer(buffer, options);
    detectedSource = detectReceiptProvider(rawText);

    logReceiptEvent("pdf_text_extracted", {
      fileName: options.fileName,
      detectedSource,
      textLength: rawText.length,
      preview: buildTextPreview(rawText),
    });

    const data = processReceiptText(rawText, options);

    return {
      success: true,
      data,
      warnings: data.parsedReceipt.observations,
      fallback: {
        fileName: options.fileName,
        detectedSource,
        extractedTextPreview: buildTextPreview(rawText),
      },
    };
  } catch (error) {
    const parserError =
      error instanceof ReceiptParserError
        ? error
        : new ReceiptParserError(
            "No pude procesar la boleta.",
            "field_parsing",
            "unknown_receipt_error",
            {
              fileName: options.fileName,
              rawText,
              detectedSource,
              cause: error,
            }
          );

    logReceiptError("receipt_processing_failed", {
      fileName: options.fileName,
      stage: parserError.stage,
      code: parserError.code,
      error: parserError.message,
      fallback: parserError.fallback,
      cause:
        parserError.cause instanceof Error
          ? parserError.cause.message
          : parserError.cause,
    });

    return {
      success: false,
      error: parserError.message,
      stage: parserError.stage,
      code: parserError.code,
      fallback: parserError.fallback,
    };
  }
}
