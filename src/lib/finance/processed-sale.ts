import { branches } from "@/features/branches/data/mock-branches";
import { businessCatalog } from "@/features/configuration/data/business-rules";
import { professionals as mockProfessionals } from "@/features/dashboard/data/mock-dashboard";
import { normalizeLooseName, normalizeText, namesProbablyMatch } from "@/shared/lib/normalize";
import type { BranchId, BranchName } from "@/shared/types/business";
import type {
  BusinessCatalogItem,
  MatchStatus,
  ParsedReceiptDocument,
  ProcessedSale,
  ProcessedSaleItem,
} from "@/shared/types/sales-processing";
import { calcularComisionFija, calcularComisionPorcentaje } from "@/lib/finance/commissions";
import { roundCurrency } from "@/lib/finance/helpers";
import { calcularIVA, calcularNeto } from "@/lib/finance/tax";

function findBranchByName(name: string) {
  return branches.find(
    (branch) =>
      namesProbablyMatch(name, branch.name) ||
      normalizeLooseName(branch.name).includes(normalizeLooseName(name))
  );
}

function findProfessionalByName(name: string, branchId: BranchId | null) {
  return mockProfessionals.find((professional) => {
    const matchesName = namesProbablyMatch(name, professional.name);
    const matchesBranch = branchId
      ? professional.branchIds.includes(branchId)
      : true;

    return matchesName && matchesBranch;
  });
}

function findCatalogItem(name: string, branchId: BranchId | null) {
  const normalizedName = normalizeLooseName(name);

  return businessCatalog.find((item) => {
    const matchesName =
      item.normalizedName === normalizedName ||
      item.aliases.includes(normalizedName) ||
      namesProbablyMatch(normalizedName, item.name);
    const matchesBranch = item.branchIds?.length
      ? branchId
        ? item.branchIds.includes(branchId)
        : true
      : true;

    return matchesName && matchesBranch;
  });
}

function calculateCommissionAmount(
  item: BusinessCatalogItem | null,
  net: number,
  quantity: number
) {
  if (!item?.commissionType || item.commissionValue == null) {
    return 0;
  }

  if (item.commissionType === "percent") {
    return calcularComisionPorcentaje(net, item.commissionValue);
  }

  return calcularComisionFija(item.commissionValue * quantity);
}

function calculateProcessedItem(
  rawItem: ParsedReceiptDocument["items"][number],
  branchId: BranchId | null
): ProcessedSaleItem {
  const matchedItem = findCatalogItem(rawItem.rawName, branchId) ?? null;
  const gross = roundCurrency(rawItem.lineTotal);
  const net = calcularNeto(gross);
  const vat = calcularIVA(gross);
  const quantity = Math.max(rawItem.quantity || 1, 1);
  const commissionAmount = calculateCommissionAmount(matchedItem, net, quantity);
  const unitCost = matchedItem?.unitCost ?? null;
  const totalCost = unitCost != null ? roundCurrency(unitCost * quantity) : 0;
  const profit = roundCurrency(net - commissionAmount - totalCost);

  const warnings: string[] = [];
  let status: MatchStatus = "matched";

  if (!matchedItem) {
    warnings.push("Servicio o producto no encontrado en configuración.");
    status = "service_not_found";
  } else if (matchedItem.commissionType == null || matchedItem.commissionValue == null) {
    warnings.push("Falta regla de comisión para este item.");
    status = "missing_commission_rule";
  } else if (matchedItem.unitCost == null) {
    warnings.push("Falta costo configurado para este item.");
    status = "missing_cost";
  }

  if (profit < 0) {
    warnings.push("La utilidad de esta línea es negativa.");
    status = status === "matched" ? "pending_review" : status;
  }

  if (net > 0 && commissionAmount / net > 0.65) {
    warnings.push("La comisión es demasiado alta respecto al neto.");
    status = status === "matched" ? "pending_review" : status;
  }

  return {
    rawName: rawItem.rawName,
    normalizedName: normalizeText(rawItem.rawName),
    matchedCatalogId: matchedItem?.id ?? null,
    matchedCatalogName: matchedItem?.name ?? null,
    type: matchedItem?.type ?? null,
    quantity,
    quantityUnit: matchedItem?.quantityUnit ?? rawItem.unit ?? "unit",
    gross,
    net,
    vat,
    commissionType: matchedItem?.commissionType ?? null,
    commissionValue: matchedItem?.commissionValue ?? null,
    commissionAmount,
    unitCost,
    totalCost,
    profit,
    status,
    warnings,
  };
}

function aggregateMaterials(items: ProcessedSaleItem[]) {
  const grouped = new Map<string, { name: string; quantity: number; cost: number }>();

  items.forEach((item) => {
    const key = item.matchedCatalogName ?? item.rawName;
    const current = grouped.get(key);

    if (current) {
      current.quantity += item.quantity;
      current.cost += item.totalCost;
      return;
    }

    grouped.set(key, {
      name: key,
      quantity: item.quantity,
      cost: item.totalCost,
    });
  });

  return Array.from(grouped.values());
}

export function processParsedSale(document: ParsedReceiptDocument): ProcessedSale {
  const branch = findBranchByName(document.branchName);
  const professional = findProfessionalByName(document.professionalName, branch?.id ?? null);
  const processedItems = document.items.map((item) =>
    calculateProcessedItem(item, branch?.id ?? null)
  );
  const warnings = [...document.observations];

  if (!branch) {
    warnings.push("No se pudo identificar la sucursal.");
  }

  if (!professional) {
    warnings.push("No se pudo identificar el profesional.");
  }

  const totals = processedItems.reduce(
    (accumulator, item) => ({
      gross: accumulator.gross + item.gross,
      net: accumulator.net + item.net,
      vat: accumulator.vat + item.vat,
      commission: accumulator.commission + item.commissionAmount,
      cost: accumulator.cost + item.totalCost,
      profit: accumulator.profit + item.profit,
    }),
    {
      gross: 0,
      net: 0,
      vat: 0,
      commission: 0,
      cost: 0,
      profit: 0,
    }
  );

  const reviewRequired =
    !branch ||
    !professional ||
    processedItems.some((item) => item.status !== "matched");

  return {
    id: `preview-${Date.now()}`,
    source: document.source,
    branchId: (branch?.id as BranchId | null) ?? null,
    branchName: (branch?.name as BranchName | null) ?? null,
    date: document.date,
    professionalId: professional?.id ?? null,
    professionalName: professional?.name ?? null,
    clientName: document.clientName,
    items: processedItems,
    totals: {
      gross: roundCurrency(totals.gross),
      net: roundCurrency(totals.net),
      vat: roundCurrency(totals.vat),
      commission: roundCurrency(totals.commission),
      cost: roundCurrency(totals.cost),
      profit: roundCurrency(totals.profit),
    },
    reviewRequired,
    warnings,
    materials: aggregateMaterials(processedItems),
  };
}

