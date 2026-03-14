import { NextResponse } from "next/server";

import {
  processReceiptBuffer,
  type ReceiptProcessingApiResponse,
} from "@/features/receipt-parser/receipt-parser";

export const runtime = "nodejs";

function isPdfFile(file: File) {
  const normalizedName = file.name.toLowerCase();
  return file.type === "application/pdf" || normalizedName.endsWith(".pdf");
}

function buildErrorResponse(
  error: string,
  code: string,
  stage:
    | "request_validation"
    | "pdf_extraction"
    | "provider_detection"
    | "field_parsing"
    | "financial_processing",
  options?: {
    status?: number;
    fileName?: string;
    warnings?: string[];
    extractedTextPreview?: string;
    detectedSource?: "fresha" | "agendapro" | "unknown";
  }
) {
  return NextResponse.json(
    {
      success: false,
      error,
      stage,
      code,
      fallback: {
        fileName: options?.fileName,
        detectedSource: options?.detectedSource ?? "unknown",
        extractedTextPreview: options?.extractedTextPreview ?? "",
        warnings: options?.warnings ?? [],
      },
    } satisfies ReceiptProcessingApiResponse,
    { status: options?.status ?? 400 }
  );
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    console.info("[receipt-parser] api_request_started", {
      contentType,
    });

    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return buildErrorResponse(
        "La solicitud no fue enviada como formulario multipart.",
        "invalid_content_type",
        "request_validation",
        {
          status: 400,
          warnings: [`Content-Type recibido: ${contentType || "vacío"}`],
        }
      );
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch (error) {
      console.error("[receipt-parser] formdata_parse_failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      return buildErrorResponse(
        "No pude leer el formulario del archivo enviado.",
        "formdata_parse_failed",
        "request_validation",
        {
          status: 400,
          warnings: [
            error instanceof Error
              ? error.message
              : "Error desconocido al leer formData().",
          ],
        }
      );
    }

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return buildErrorResponse(
        "Debes enviar un archivo PDF válido.",
        "missing_file",
        "request_validation",
        {
          status: 400,
          warnings: ["No se recibió ningún archivo en la solicitud."],
        }
      );
    }

    if (!isPdfFile(file)) {
      return buildErrorResponse(
        "El archivo seleccionado no es un PDF válido.",
        "invalid_file_type",
        "request_validation",
        {
          status: 400,
          fileName: file.name,
          warnings: [
            `Tipo recibido: ${file.type || "desconocido"}. Nombre: ${file.name}.`,
          ],
        }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    console.info("[receipt-parser] api_file_received", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      byteLength: arrayBuffer.byteLength,
    });

    if (!arrayBuffer.byteLength) {
      return buildErrorResponse(
        "El archivo PDF está vacío.",
        "empty_file",
        "request_validation",
        {
          status: 400,
          fileName: file.name,
          warnings: ["El archivo fue recibido pero no contiene bytes."],
        }
      );
    }

    const result = await processReceiptBuffer(Buffer.from(arrayBuffer), {
      fileName: file.name,
    });

    console.info("[receipt-parser] api_processing_finished", {
      fileName: file.name,
      success: result.success,
      status: result.success ? 200 : 422,
      code: result.success ? "ok" : result.code,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    });
  } catch (error) {
    console.error("[receipt-parser] api_unhandled_error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return buildErrorResponse(
      "No pude procesar la boleta por un error interno.",
      "unhandled_route_error",
      "request_validation",
      {
        status: 500,
        warnings: [
          error instanceof Error
            ? error.message
            : "Error no identificado en el endpoint.",
        ],
      }
    );
  }
}