import { branches } from "@/features/branches/data/mock-branches";
import { type CatalogItem } from "@/features/configuration/data/business-rules";
import {
  resolveCatalogMatch,
} from "@/features/sales-register/lib/catalog-search";
import type { ReceiptExtraction, SaleDraft, SaleLineDraft } from "@/features/sales-register/types";
import { normalizeLooseName } from "@/shared/lib/normalize";

function sanitizeNullableString(value: string | null | undefined) {
  if (!value || /^null$/i.test(value.trim()) || /^undefined$/i.test(value.trim())) {
    return "";
  }

  return value.trim();
}

function inferItemTypeFromName(name: string): "service" | "product" | "unknown" {
  const normalizedName = normalizeLooseName(name);

  if (
    /(shampoo|hairtech|removedor|cinta|spray|serum|mascarilla|ampolla|protesis)/.test(
      normalizedName
    )
  ) {
    return "product";
  }

  if (
    /(mantencion|mantencion|instalacion|corte|lavado|secado|balayage|tratamiento|color|servicio)/.test(
      normalizedName
    )
  ) {
    return "service";
  }

  return "unknown";
}

function buildLineDraftFromCatalog(
  detectedName: string,
  quantity: number,
  lineTotal: number,
  catalogItem: CatalogItem | null,
  matchType: SaleLineDraft["matchType"] = "unmatched"
): SaleLineDraft {
  const inferredType = catalogItem?.tipo ?? inferItemTypeFromName(detectedName);
  const missingConfigLabel =
    inferredType === "product" ? "Producto sin configurar." : "Servicio sin configurar.";
  const incompleteConfigLabel =
    inferredType === "product"
      ? "Producto con configuración incompleta."
      : "Servicio con configuración incompleta.";
  const warnings: string[] = [];
  const quantityValue = Math.max(quantity || catalogItem?.default_quantity || 1, 1);
  const unitPrice = Math.round(lineTotal / quantityValue) || catalogItem?.precio_venta_bruto || 0;

  if (!catalogItem) {
    warnings.push(missingConfigLabel);
  }

  return {
    id: `draft-line-${Math.random().toString(36).slice(2, 8)}`,
    inputName: detectedName,
    normalizedName: normalizeLooseName(detectedName),
    matchedCatalogId: catalogItem?.id ?? null,
    matchedCatalogName: catalogItem?.nombre ?? null,
    itemType: inferredType,
    quantity: quantityValue,
    unitLabel: catalogItem?.unit_label ?? "unit",
    unitPrice,
    grossLineTotal: lineTotal || unitPrice * quantityValue,
    netLineTotal: 0,
    vatAmount: 0,
    commissionType: catalogItem?.commission_type ?? "none",
    commissionValue: catalogItem?.commission_value ?? 0,
    commissionBase: catalogItem?.commission_base ?? "net",
    commissionAmount: 0,
    unitCost: catalogItem?.costo ?? 0,
    totalCost: 0,
    profit: 0,
    warnings:
      catalogItem?.estado_configuracion === "incompleto"
        ? [...warnings, incompleteConfigLabel]
        : warnings,
    status:
      catalogItem && catalogItem.estado_configuracion === "completo"
        ? "ready"
        : "requires_review",
    catalogItem,
    matchType: catalogItem ? matchType : "unmatched",
  };
}

export function createSaleDraftFromExtraction(
  extraction: ReceiptExtraction
): SaleDraft {
  const branch = branches.find((item) => item.name === extraction.branchName) ?? null;
  const items = extraction.items.map((item) => {
    const resolvedMatch = resolveCatalogMatch(item.name);
    return buildLineDraftFromCatalog(
      item.name,
      item.quantity,
      item.lineTotal ?? 0,
      resolvedMatch.item,
      resolvedMatch.matchType
    );
  });

  return {
    sourceMode: "scan",
    sourceProvider: extraction.source,
    extractedBy: extraction.extractedBy,
    clientName: sanitizeNullableString(extraction.clientName),
    professionalName: sanitizeNullableString(extraction.professionalName),
    branchName: sanitizeNullableString(extraction.branchName),
    branchId: branch?.id ?? null,
    receiptNumber: extraction.receiptNumber ?? "",
    date: extraction.date ?? "",
    paymentMethod: extraction.paymentMethod ?? "",
    currency: extraction.currency ?? "CLP",
    subtotal: extraction.subtotal ?? 0,
    tax: extraction.tax ?? 0,
    grossTotal: extraction.grossTotal ?? 0,
    netTotal: extraction.netTotal ?? 0,
    totalPaid: extraction.totalPaid ?? extraction.grossTotal ?? 0,
    items,
    warnings: [...extraction.warnings],
    confidence: extraction.confidence,
    reviewRequired:
      items.some((item) => item.status === "requires_review") ||
      !sanitizeNullableString(extraction.branchName) ||
      !sanitizeNullableString(extraction.professionalName),
  };
}

export function createEmptyManualSaleDraft(): SaleDraft {
  return {
    sourceMode: "manual",
    sourceProvider: "unknown",
    extractedBy: "manual",
    clientName: "",
    professionalName: "",
    branchName: "",
    branchId: null,
    receiptNumber: "",
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "",
    currency: "CLP",
    subtotal: 0,
    tax: 0,
    grossTotal: 0,
    netTotal: 0,
    totalPaid: 0,
    items: [
      buildLineDraftFromCatalog("", 1, 0, null),
    ],
    warnings: [],
    confidence: 1,
    reviewRequired: true,
  };
}
