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

export async function POST(request: Request) {
  try {
    console.info("[receipt-parser] api_request_started", {
      contentType: request.headers.get("content-type"),
    });

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Debes enviar un archivo PDF valido.",
          stage: "request_validation",
          code: "missing_file",
          fallback: {
            detectedSource: "unknown",
            extractedTextPreview: "",
            warnings: ["No se recibio ningun archivo en la solicitud."],
          },
        } satisfies ReceiptProcessingApiResponse,
        { status: 400 }
      );
    }

    if (!isPdfFile(file)) {
      return NextResponse.json(
        {
          success: false,
          error: "El archivo seleccionado no es un PDF valido.",
          stage: "request_validation",
          code: "invalid_file_type",
          fallback: {
            fileName: file.name,
            detectedSource: "unknown",
            extractedTextPreview: "",
            warnings: [
              `Tipo recibido: ${file.type || "desconocido"}. Nombre: ${file.name}.`,
            ],
          },
        } satisfies ReceiptProcessingApiResponse,
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    console.info("[receipt-parser] api_file_received", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      byteLength: arrayBuffer.byteLength,
    });

    const result = await processReceiptBuffer(Buffer.from(arrayBuffer), {
      fileName: file.name,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    });
  } catch (error) {
    console.error("[receipt-parser] api_unhandled_error", {
      error: error instanceof Error ? error.message : error,
    });

    return NextResponse.json(
      {
        success: false,
        error: "No pude procesar la boleta por un error interno.",
        stage: "request_validation",
        code: "unhandled_route_error",
        fallback: {
          detectedSource: "unknown",
          extractedTextPreview: "",
          warnings: [
            error instanceof Error
              ? error.message
              : "Error no identificado en el endpoint.",
          ],
        },
      } satisfies ReceiptProcessingApiResponse,
      { status: 500 }
    );
  }
}
