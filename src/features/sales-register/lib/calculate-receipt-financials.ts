import { calcularIVA, calcularNeto } from "@/lib/finance";
import { roundCurrency } from "@/lib/finance/helpers";
import type { SaleDraft, SaleDraftTotals, SaleLineDraft } from "@/features/sales-register/types";

function getQuantity(line: SaleLineDraft) {
  return Math.max(line.quantity || 1, 1);
}

function calculateGrossLineTotal(line: SaleLineDraft) {
  return roundCurrency(line.unitPrice * getQuantity(line));
}

function calculateEstimatedServiceUnitCost(line: SaleLineDraft) {
  const basePrice = line.baseUnitPrice > 0 ? line.baseUnitPrice : line.unitPrice;
  const baseCost = line.baseUnitCost > 0 ? line.baseUnitCost : line.unitCost;

  if (line.itemType !== "service") {
    return line.unitCost;
  }

  if (basePrice <= 0 || baseCost <= 0) {
    return line.unitCost;
  }

  if (line.unitPrice === basePrice) {
    return baseCost;
  }

  return baseCost * (line.unitPrice / basePrice);
}

function calculateCommission(line: SaleLineDraft, netLineTotal: number) {
  if (line.commissionType === "none") {
    return 0;
  }

  if (line.commissionType === "fixed") {
    return roundCurrency(line.commissionValue * getQuantity(line));
  }

  if (line.commissionBase === "gross") {
    return roundCurrency((line.grossLineTotal * line.commissionValue) / 100);
  }

  return roundCurrency((netLineTotal * line.commissionValue) / 100);
}

function dedupeWarnings(line: SaleLineDraft) {
  const warnings = [...line.warnings];

  if (!line.matchedCatalogId) {
    warnings.push(
      line.itemType === "product"
        ? "Producto sin configurar."
        : "Servicio sin configurar."
    );
  }

  if (line.itemType === "product" && !line.unitCost) {
    warnings.push("Falta costo unitario configurado para el producto.");
  }

  if (line.itemType === "service" && !line.baseUnitCost) {
    warnings.push("Falta costo base configurado para el servicio.");
  }

  return Array.from(new Set(warnings));
}

export function recalculateSaleLine(line: SaleLineDraft): SaleLineDraft {
  const quantity = getQuantity(line);
  const grossLineTotal = calculateGrossLineTotal(line);
  const netLineTotal = calcularNeto(grossLineTotal);
  const vatAmount = calcularIVA(grossLineTotal);
  const estimatedUnitCost =
    line.itemType === "service"
      ? calculateEstimatedServiceUnitCost(line)
      : line.unitCost;
  const totalCost = roundCurrency(estimatedUnitCost * quantity);
  const commissionAmount = calculateCommission(
    { ...line, grossLineTotal, quantity },
    netLineTotal
  );
  const profit = roundCurrency(netLineTotal - commissionAmount - totalCost);
  const warnings = dedupeWarnings(line);

  return {
    ...line,
    quantity,
    sourceLineTotal: line.sourceLineTotal || grossLineTotal,
    grossLineTotal,
    netLineTotal,
    vatAmount,
    estimatedUnitCost,
    totalCost,
    commissionAmount,
    profit,
    warnings,
    status:
      !line.matchedCatalogId || !line.catalogItem || profit < 0
        ? "requires_review"
        : "ready",
  };
}

function applyReceiptGrossAdjustment(line: SaleLineDraft, grossAdjustment: number) {
  if (grossAdjustment === 0) {
    return line;
  }

  const grossLineTotal = roundCurrency(line.grossLineTotal + grossAdjustment);
  const netLineTotal = calcularNeto(grossLineTotal);
  const vatAmount = calcularIVA(grossLineTotal);
  const commissionAmount = calculateCommission(
    { ...line, grossLineTotal },
    netLineTotal
  );
  const profit = roundCurrency(netLineTotal - line.totalCost - commissionAmount);
  const warnings = Array.from(
    new Set([
      ...line.warnings,
      "Se ajustó esta línea para cuadrar exactamente con el total de la boleta.",
    ])
  );

  return {
    ...line,
    grossLineTotal,
    netLineTotal,
    vatAmount,
    commissionAmount,
    profit,
    warnings,
  };
}

export function recalculateSaleDraft(draft: SaleDraft) {
  const recalculatedItems = draft.items.map(recalculateSaleLine);
  const receiptGrossTarget =
    draft.origin === "pdf" && draft.totalPaid > 0 ? draft.totalPaid : 0;
  const calculatedGrossTotal = recalculatedItems.reduce(
    (sum, item) => sum + item.grossLineTotal,
    0
  );
  const grossAdjustment =
    receiptGrossTarget > 0 ? receiptGrossTarget - calculatedGrossTotal : 0;
  const items =
    grossAdjustment !== 0 && recalculatedItems.length > 0
      ? recalculatedItems.map((item, index) =>
          index === recalculatedItems.length - 1
            ? applyReceiptGrossAdjustment(item, grossAdjustment)
            : item
        )
      : recalculatedItems;

  const totals = items.reduce<SaleDraftTotals>(
    (accumulator, item) => {
      accumulator.subtotal += item.netLineTotal;
      accumulator.tax += item.vatAmount;
      accumulator.grossTotal += item.grossLineTotal;
      accumulator.netTotal += item.netLineTotal;
      accumulator.totalPaid += item.grossLineTotal;
      accumulator.commissionTotal += item.commissionAmount;
      accumulator.costTotal += item.totalCost;
      accumulator.profitTotal += item.profit;
      return accumulator;
    },
    {
      subtotal: 0,
      tax: 0,
      grossTotal: 0,
      netTotal: 0,
      totalPaid: 0,
      commissionTotal: 0,
      costTotal: 0,
      profitTotal: 0,
    }
  );

  const roundedTotals: SaleDraftTotals = {
    subtotal: roundCurrency(totals.subtotal),
    tax: roundCurrency(totals.tax),
    grossTotal: roundCurrency(totals.grossTotal),
    netTotal: roundCurrency(totals.netTotal),
    totalPaid: roundCurrency(totals.totalPaid),
    commissionTotal: roundCurrency(totals.commissionTotal),
    costTotal: roundCurrency(totals.costTotal),
    profitTotal: roundCurrency(totals.profitTotal),
  };

  return {
    draft: {
      ...draft,
      items,
      subtotal: roundedTotals.subtotal,
      tax: roundedTotals.tax,
      grossTotal: roundedTotals.grossTotal,
      netTotal: roundedTotals.netTotal,
      totalPaid:
        receiptGrossTarget > 0 ? receiptGrossTarget : roundedTotals.grossTotal,
      reviewRequired:
        items.some((item) => item.status === "requires_review") ||
        !draft.branchName ||
        !draft.professionalName ||
        (receiptGrossTarget > 0 && roundedTotals.grossTotal !== receiptGrossTarget),
      warnings:
        receiptGrossTarget > 0 && roundedTotals.grossTotal !== receiptGrossTarget
          ? Array.from(
              new Set([
                ...draft.warnings,
                "El total de las líneas no cuadra con la boleta. Revísalo antes de guardar.",
              ])
            )
          : draft.warnings,
    },
    totals: roundedTotals,
  };
}
