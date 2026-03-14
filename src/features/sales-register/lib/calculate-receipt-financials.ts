import { calcularComisionFija, calcularComisionPorcentaje, calcularIVA, calcularNeto } from "@/lib/finance";
import { roundCurrency } from "@/lib/finance/helpers";
import type { SaleDraft, SaleDraftTotals, SaleLineDraft } from "@/features/sales-register/types";

function calculateCommission(line: SaleLineDraft) {
  if (line.commissionType === "none") {
    return 0;
  }

  if (line.commissionType === "fixed") {
    return calcularComisionFija(line.commissionValue * Math.max(line.quantity, 1));
  }

  if (line.commissionBase === "gross") {
    return calcularComisionPorcentaje(line.grossLineTotal, line.commissionValue);
  }

  return calcularComisionPorcentaje(line.netLineTotal, line.commissionValue);
}

export function recalculateSaleLine(line: SaleLineDraft): SaleLineDraft {
  const grossLineTotal =
    line.priceMode === "line"
      ? roundCurrency(line.unitPrice)
      : roundCurrency(line.unitPrice * Math.max(line.quantity, 1));
  const netLineTotal = calcularNeto(grossLineTotal);
  const vatAmount = calcularIVA(grossLineTotal);
  const totalCost = roundCurrency(line.unitCost * Math.max(line.quantity, 1));
  const commissionAmount = calculateCommission({
    ...line,
    grossLineTotal,
    netLineTotal,
  });
  const profit = roundCurrency(netLineTotal - commissionAmount - totalCost);
  const warnings = [...line.warnings];

  if (!line.matchedCatalogId) {
    warnings.push(
      line.itemType === "product"
        ? "Producto sin configurar."
        : "Servicio sin configurar."
    );
  }

  if (!line.catalogItem && !line.unitCost) {
    warnings.push("Falta costo configurado o revisado.");
  }

  return {
    ...line,
    grossLineTotal,
    netLineTotal,
    vatAmount,
    totalCost,
    commissionAmount,
    profit,
    warnings: Array.from(new Set(warnings)),
    status:
      !line.matchedCatalogId || !line.catalogItem || profit < 0
        ? "requires_review"
        : "ready",
  };
}

export function recalculateSaleDraft(draft: SaleDraft) {
  const items = draft.items.map(recalculateSaleLine);
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

  return {
    draft: {
      ...draft,
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      grossTotal: totals.grossTotal,
      netTotal: totals.netTotal,
      totalPaid: draft.totalPaid || totals.grossTotal,
      reviewRequired:
        items.some((item) => item.status === "requires_review") ||
        !draft.branchName ||
        !draft.professionalName,
    },
    totals,
  };
}
