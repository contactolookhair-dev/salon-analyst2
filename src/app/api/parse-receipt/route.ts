import { NextResponse } from "next/server";

import { branches } from "@/features/branches/data/mock-branches";
import { parseReceiptText } from "@/features/receipt-parser/receipt-parser";
import { extractReceiptWithAI } from "@/features/sales-register/lib/extract-receipt-with-ai";
import { extractReceiptText } from "@/features/sales-register/lib/extract-receipt-text";
import { createSaleDraftFromExtraction } from "@/features/sales-register/lib/match-receipt-catalog";
import { normalizeParsedReceiptData } from "@/features/sales-register/lib/normalize-receipt-data";
import { recalculateSaleDraft } from "@/features/sales-register/lib/calculate-receipt-financials";
import { getProfessionalsFromStorage } from "@/server/database/business-repository";
import type {
  ParseReceiptApiResponse,
  ReceiptExtraction,
} from "@/features/sales-register/types";
import type { BranchId, Professional } from "@/shared/types/business";

export const runtime = "nodejs";

function logParseReceiptEvent(message: string, context: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(`[api/parse-receipt] ${message}`, context);
}

function isSupportedDocument(file: File) {
  return (
    file.type === "application/pdf" ||
    file.type.startsWith("image/") ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function applyPreferredProfessional(
  extraction: ReceiptExtraction,
  preferredProfessionalId: string,
  preferredProfessionalName: string,
  preferredBranchId: string,
  preferredBranchName: string,
  professionals: Professional[]
) {
  const preferredProfessional =
    professionals.find((item) => item.id === preferredProfessionalId) ?? null;
  const nextWarnings = [...extraction.warnings];
  const originalDetectedProfessionalName = extraction.professionalName;
  const originalDetectedBranchName = extraction.branchName;

  if (
    extraction.professionalName &&
    extraction.professionalName.trim() &&
    extraction.professionalName.trim() !== preferredProfessionalName.trim()
  ) {
    nextWarnings.push(
      `Se priorizó el profesional seleccionado en la tarjeta (${preferredProfessionalName}).`
    );
  }

  if (
    preferredBranchName &&
    extraction.branchName &&
    extraction.branchName.trim() &&
    extraction.branchName.trim() !== preferredBranchName.trim()
  ) {
    nextWarnings.push(
      `Se priorizó la sucursal seleccionada en la carga (${preferredBranchName}).`
    );
  }

  const inferredBranchName = preferredBranchName
    ? preferredBranchName
    : !extraction.branchName && preferredProfessional?.branchIds.length === 1
      ? branches.find((branch) => branch.id === preferredProfessional.branchIds[0])?.name ?? null
      : extraction.branchName;

  return {
    ...extraction,
    professionalName: preferredProfessionalName,
    branchName: inferredBranchName,
    warnings: nextWarnings,
  };
}

export async function POST(request: Request) {
  try {
    const professionals = await getProfessionalsFromStorage();
    const formData = await request.formData();
    const file = formData.get("file");
    const preferredProfessionalId = String(
      formData.get("preferredProfessionalId") ?? ""
    ).trim();
    const preferredProfessionalName = String(
      formData.get("preferredProfessionalName") ?? ""
    ).trim();
    const preferredBranchId = String(formData.get("preferredBranchId") ?? "").trim();
    const preferredBranchName = String(formData.get("preferredBranchName") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Debes adjuntar un PDF o una imagen.",
          warnings: ["No se recibió ningún archivo."],
          partial: {
            source: "unknown",
            extractedTextPreview: "",
            extraction: null,
          },
        } satisfies ParseReceiptApiResponse,
        { status: 400 }
      );
    }

    if (!isSupportedDocument(file)) {
      return NextResponse.json(
        {
          success: false,
          error: "Solo se admiten PDFs o imágenes para registrar ventas.",
          warnings: [`Archivo recibido: ${file.name} (${file.type || "sin tipo"}).`],
          partial: {
            fileName: file.name,
            source: "unknown",
            extractedTextPreview: "",
            extraction: null,
          },
        } satisfies ParseReceiptApiResponse,
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    logParseReceiptEvent("document_received", {
      fileName: file.name,
      mimeType: file.type,
      size: buffer.byteLength,
    });

    const textResult =
      file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".pdf")
        ? {
            success: false as const,
            text: "",
            warnings: [
              "La lectura tradicional no soporta imágenes sin OCR/IA activa.",
            ],
            error: "Documento de imagen sin OCR disponible.",
            fileName: file.name,
            strategy: "partial_rescue" as const,
            confidence: 0,
          }
        : await extractReceiptText(buffer, file.name);

    const warnings = [...textResult.warnings];
    const rawText = textResult.text;
    let extraction: ReceiptExtraction | null = null;

    if (rawText && textResult.success) {
      try {
        logParseReceiptEvent("pdf_text_extraction", {
          fileName: file.name,
          strategy: textResult.strategy,
          confidence: textResult.confidence,
        });
        const parsedReceipt = parseReceiptText(rawText, {
          fileName: file.name,
        });
        extraction = normalizeParsedReceiptData(parsedReceipt);
      } catch (error) {
        warnings.push(
          error instanceof Error
            ? error.message
            : "La lectura estructurada fue incompleta."
        );
        extraction = await extractReceiptWithAI({
          rawText,
          fileBuffer: buffer,
          fileName: file.name,
          mimeType: file.type || "application/pdf",
        });
      }
    }

    if (!extraction) {
      logParseReceiptEvent("ai_fallback", {
        fileName: file.name,
        reason: textResult.error ?? "low_confidence_or_no_text",
        strategy: textResult.strategy,
        confidence: textResult.confidence,
      });

      extraction = await extractReceiptWithAI({
        rawText,
        fileBuffer: buffer,
        fileName: file.name,
        mimeType:
          file.type ||
          (file.name.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : "application/octet-stream"),
      });
    }

    if (extraction) {
      const extractionWithProfessional =
        preferredProfessionalId && preferredProfessionalName
          ? applyPreferredProfessional(
              extraction,
              preferredProfessionalId,
              preferredProfessionalName,
              preferredBranchId,
              preferredBranchName,
              professionals
            )
          : extraction;
      const parseContext = {
        preferredProfessionalApplied:
          Boolean(preferredProfessionalId && preferredProfessionalName),
        originalDetectedProfessionalName: extraction.professionalName,
        preferredBranchId:
          preferredBranchId === "house-of-hair" ||
          preferredBranchId === "look-hair-extensions"
            ? (preferredBranchId as BranchId)
            : null,
        preferredBranchName: preferredBranchName || null,
        originalDetectedBranchName: extraction.branchName,
      };

      logParseReceiptEvent("partial_rescue", {
        fileName: file.name,
        extractedBy: extractionWithProfessional.extractedBy,
        source: extractionWithProfessional.source,
        confidence: extractionWithProfessional.confidence,
        items: extractionWithProfessional.items.length,
        preferredProfessionalName: preferredProfessionalName || null,
      });

      const { draft, totals } = recalculateSaleDraft(
        createSaleDraftFromExtraction({
          ...extractionWithProfessional,
          warnings: [...extractionWithProfessional.warnings, ...warnings],
        })
      );

      return NextResponse.json({
        success: true,
        data: {
          extraction: {
            ...extractionWithProfessional,
            warnings: [...extractionWithProfessional.warnings, ...warnings],
          },
          draft,
          totals,
          context: parseContext,
        },
        warnings: [...extractionWithProfessional.warnings, ...warnings],
      } satisfies ParseReceiptApiResponse);
    }

    return NextResponse.json({
      success: false,
      error:
        textResult.error ??
        "No se pudo leer el documento, pero puedes registrar la venta manualmente.",
      warnings,
      partial: {
        fileName: file.name,
        source: "unknown",
        extractedTextPreview: rawText.slice(0, 500),
        extraction: null,
      },
    } satisfies ParseReceiptApiResponse);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Ocurrió un error inesperado al procesar la boleta.",
        warnings: [
          error instanceof Error ? error.message : "Error no identificado.",
        ],
        partial: {
          source: "unknown",
          extractedTextPreview: "",
          extraction: null,
        },
      } satisfies ParseReceiptApiResponse,
      { status: 500 }
    );
  }
}
