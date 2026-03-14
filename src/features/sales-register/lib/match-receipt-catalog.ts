import { branches } from "@/features/branches/data/mock-branches";
import { type CatalogItem } from "@/features/configuration/data/business-rules";
import {
  resolveCatalogMatch,
} from "@/features/sales-register/lib/catalog-search";
import type { ReceiptExtraction, SaleDraft, SaleLineDraft } from "@/features/sales-register/types";
import { normalizeLooseName } from "@/shared/lib/normalize";
import type { QuantityUnit } from "@/shared/types/sales-processing";

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

type BusinessRuleClassification =
  | "adhesive_sheet"
  | "nano_sheet"
  | "adhesive_maintenance_pair"
  | "generic_service"
  | "generic_product";

type QuantityDetection = {
  quantity: number;
  unitLabel?: QuantityUnit;
  confidence: "high" | "low";
  warning?: string;
};

function detectQuantityFromName(name: string, fallbackQuantity: number) {
  const normalizedName = normalizeLooseName(name);
  const directPatterns: Array<{ regex: RegExp; unitLabel?: QuantityUnit }> = [
    { regex: /\b(\d+)\s*(laminas|lamina|láminas|lámina)\b/i, unitLabel: "sheet" },
    { regex: /\bx\s*(\d+)\b/i },
    { regex: /\b(\d+)\s*(pares|par)\b/i, unitLabel: "pair" },
    { regex: /\b(\d+)\s*nano\b/i },
  ];

  for (const pattern of directPatterns) {
    const match = normalizedName.match(pattern.regex);

    if (match) {
      return {
        quantity: Math.max(Number(match[1]) || fallbackQuantity || 1, 1),
        unitLabel: pattern.unitLabel,
        confidence: "high" as const,
      };
    }
  }

  if (fallbackQuantity > 1) {
    return {
      quantity: fallbackQuantity,
      confidence: "high" as const,
    };
  }

  return {
    quantity: Math.max(fallbackQuantity || 1, 1),
    confidence: "low" as const,
    warning: "No se pudo detectar la cantidad con confianza. Revísala manualmente.",
  };
}

function classifyBusinessRule(name: string, inferredType: SaleLineDraft["itemType"]) {
  const normalizedName = normalizeLooseName(name);
  const mentionsAdhesive =
    /(adhesiva|adhesivas|extension adhesiva|extensiones adhesivas|invisible premium|adhesiva invisible|tape|cinta adhesiva|cintas adhesivas)/.test(
      normalizedName
    );
  const mentionsNano =
    /(nano keratina|nano keratin|punto a punto nano|\bnano\b)/.test(normalizedName);
  const adhesiveMaintenance =
    /(mantencion|mantencion de|mantencion tape|mantencion de tape|mantencion extensiones adhesivas|mantencion extension adhesiva)/.test(
      normalizedName
    ) && mentionsAdhesive;

  if (adhesiveMaintenance) {
    return "adhesive_maintenance_pair" satisfies BusinessRuleClassification;
  }

  if (mentionsAdhesive) {
    return "adhesive_sheet" satisfies BusinessRuleClassification;
  }

  if (mentionsNano) {
    return "nano_sheet" satisfies BusinessRuleClassification;
  }

  return inferredType === "product" ? "generic_product" : "generic_service";
}

function applyBusinessFallbackRules(
  baseLine: SaleLineDraft,
  detectedName: string,
  originalQuantity: number
) {
  const classification = classifyBusinessRule(detectedName, baseLine.itemType);
  const quantityDetection = detectQuantityFromName(detectedName, originalQuantity);
  const warnings = [...baseLine.warnings];

  if (quantityDetection.warning) {
    warnings.push(quantityDetection.warning);
  }

  let unitLabel = baseLine.unitLabel;
  let unitCost = baseLine.unitCost;
  let commissionType = baseLine.commissionType;
  let commissionValue = baseLine.commissionValue;
  let itemType = baseLine.itemType;

  if (classification === "adhesive_sheet") {
    unitLabel = "sheet";
    unitCost = 500;
    itemType = "product";
  }

  if (classification === "nano_sheet") {
    unitLabel = "sheet";
    unitCost = 500;
    itemType = "product";
  }

  if (classification === "adhesive_maintenance_pair") {
    unitLabel = "pair";
    unitCost = unitCost || 500;
    commissionType = "percentage";
    commissionValue = 40;
    itemType = "service";
  }

  return {
    ...baseLine,
    itemType,
    quantity: quantityDetection.quantity,
    unitLabel: quantityDetection.unitLabel ?? unitLabel,
    unitCost,
    commissionType,
    commissionValue,
    warnings: Array.from(new Set(warnings)),
  };
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

  const baseLine: SaleLineDraft = {
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

  if (catalogItem && matchType !== "suggested") {
    return baseLine;
  }

  const fallbackLine = applyBusinessFallbackRules(
    {
      ...baseLine,
      catalogItem: matchType === "suggested" ? null : baseLine.catalogItem,
      matchedCatalogId: matchType === "suggested" ? null : baseLine.matchedCatalogId,
      matchedCatalogName: matchType === "suggested" ? null : baseLine.matchedCatalogName,
      commissionType: matchType === "suggested" ? "none" : baseLine.commissionType,
      commissionValue: matchType === "suggested" ? 0 : baseLine.commissionValue,
      unitCost: matchType === "suggested" ? 0 : baseLine.unitCost,
      unitLabel: matchType === "suggested" ? "unit" : baseLine.unitLabel,
      matchType: matchType === "suggested" ? "unmatched" : baseLine.matchType,
      status: matchType === "suggested" ? "requires_review" : baseLine.status,
      warnings:
        matchType === "suggested"
          ? Array.from(new Set([...baseLine.warnings, "Coincidencia sugerida: revisar antes de confirmar."]))
          : baseLine.warnings,
    },
    detectedName,
    quantity
  );

  return fallbackLine;
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
