type ExtractReceiptTextResult = {
  success: boolean;
  text: string;
  warnings: string[];
  error?: string;
  fileName?: string;
  strategy: "pdf_text_extraction" | "partial_rescue";
  confidence: number;
};

function logReceiptTextEvent(message: string, context: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(`[extract-receipt-text] ${message}`, context);
}

function decodePdfString(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextObjects(rawPdf: string) {
  const matches = rawPdf.match(/\((?:\\.|[^\\()]){2,}\)/g) ?? [];

  return matches
    .map((match) => decodePdfString(match.slice(1, -1)))
    .filter((item) => /[A-Za-zÁÉÍÓÚáéíóú0-9$#]/.test(item))
    .filter((item) => item.length >= 2);
}

function extractAsciiRuns(rawPdf: string) {
  const matches =
    rawPdf.match(/[A-Za-zÁÉÍÓÚáéíóú0-9$#:+/\-.,()%]{4,}(?:\s+[A-Za-zÁÉÍÓÚáéíóú0-9$#:+/\-.,()%]{2,})*/g) ??
    [];

  return matches
    .map((match) => match.replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 4);
}

function dedupePreserveOrder(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = value.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function scoreExtractedText(text: string) {
  const normalized = text.toLowerCase();
  let score = 0;

  if (text.length > 80) score += 0.2;
  if (/(total|subtotal|iva|cliente|ticket|venta|sale)/i.test(normalized)) score += 0.2;
  if (/\$\s*[\d.,]+/.test(text)) score += 0.2;
  if (/\d{2}[-/]\d{2}[-/]\d{4}/.test(text) || /\d{1,2}\s+[a-z]{3}\s+\d{4}/i.test(text)) score += 0.2;
  if (/(fresha|agendapro|house of hair|look hair extensions)/i.test(normalized)) score += 0.2;

  return Math.min(score, 1);
}

function extractTextFromPdfBytes(buffer: Uint8Array) {
  const rawPdf = Buffer.from(buffer).toString("latin1");
  const extracted = dedupePreserveOrder([
    ...extractTextObjects(rawPdf),
    ...extractAsciiRuns(rawPdf),
  ]);
  const text = extracted.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return {
    text,
    confidence: scoreExtractedText(text),
  };
}

function buildFailureResult(
  fileName: string | undefined,
  error: string,
  warnings: string[],
  text = ""
): ExtractReceiptTextResult {
  return {
    success: false,
    text,
    warnings,
    error,
    fileName,
    strategy: "partial_rescue",
    confidence: scoreExtractedText(text),
  };
}

export async function extractReceiptText(
  fileBuffer: Buffer | Uint8Array,
  fileName?: string
): Promise<ExtractReceiptTextResult> {
  if (!fileBuffer.byteLength) {
    return buildFailureResult(fileName, "No hay contenido para leer.", [
      "El archivo está vacío.",
    ]);
  }

  try {
    const safeBuffer =
      fileBuffer instanceof Uint8Array ? fileBuffer : new Uint8Array(fileBuffer);
    const { text, confidence } = extractTextFromPdfBytes(safeBuffer);

    if (!text) {
      logReceiptTextEvent("partial_rescue_empty", {
        fileName,
        byteLength: safeBuffer.byteLength,
      });

      return buildFailureResult(
        fileName,
        "No se pudo rescatar texto útil del documento con el lector local.",
        [
          "La extracción local no encontró texto confiable.",
          "Se continuará con el fallback asistido por IA.",
        ]
      );
    }

    const strategy = confidence >= 0.45 ? "pdf_text_extraction" : "partial_rescue";

    logReceiptTextEvent(strategy, {
      fileName,
      byteLength: safeBuffer.byteLength,
      extractedLength: text.length,
      confidence,
      preview: text.slice(0, 220),
    });

    return {
      success: confidence >= 0.45,
      text,
      warnings:
        confidence >= 0.45
          ? []
          : [
              "La extracción local recuperó texto parcial con baja confianza.",
              "Se recomienda completar con rescate asistido por IA.",
            ],
      fileName,
      strategy,
      confidence,
      ...(confidence >= 0.45
        ? {}
        : {
            error: "La extracción local fue parcial.",
          }),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo leer el documento.";

    logReceiptTextEvent("partial_rescue_failed", {
      fileName,
      error: message,
    });

    return buildFailureResult(
      fileName,
      "La extracción local del documento falló.",
      [message, "Se continuará con el fallback asistido por IA."]
    );
  }
}
