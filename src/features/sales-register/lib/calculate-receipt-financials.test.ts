import { describe, expect, it } from "vitest";

import { recalculateSaleDraft, recalculateSaleLine } from "@/features/sales-register/lib/calculate-receipt-financials";
import { createEmptyManualSaleDraft } from "@/features/sales-register/lib/match-receipt-catalog";

describe("calculate receipt financials", () => {
  it("calcula comision porcentual sobre neto", () => {
    const line = recalculateSaleLine({
      ...createEmptyManualSaleDraft().items[0],
      matchedCatalogId: "corte-cabello-mujer",
      matchedCatalogName: "Corte de Cabello Mujer",
      inputName: "Corte de Cabello Mujer",
      itemType: "service",
      quantity: 1,
      unitPrice: 119000,
      commissionType: "percentage",
      commissionValue: 30,
      commissionBase: "net",
      unitCost: 10000,
      catalogItem: null,
      warnings: [],
    });

    expect(line.netLineTotal).toBe(100000);
    expect(line.commissionAmount).toBe(30000);
    expect(line.profit).toBe(60000);
  });

  it("calcula comision fija por unidad", () => {
    const line = recalculateSaleLine({
      ...createEmptyManualSaleDraft().items[0],
      matchedCatalogId: "mantencion-adhesiva",
      matchedCatalogName: "Mantención de Extension Adhesiva",
      inputName: "Mantención de Extension Adhesiva",
      itemType: "service",
      quantity: 2,
      unitPrice: 45000,
      commissionType: "fixed",
      commissionValue: 8000,
      commissionBase: "unit",
      unitCost: 12000,
      catalogItem: null,
      warnings: [],
    });

    expect(line.grossLineTotal).toBe(90000);
    expect(line.commissionAmount).toBe(16000);
    expect(line.totalCost).toBe(24000);
  });

  it("recalcula totales sin crash cuando faltan reglas", () => {
    const draft = createEmptyManualSaleDraft();
    const result = recalculateSaleDraft(draft);

    expect(result.totals.grossTotal).toBe(0);
    expect(result.draft.reviewRequired).toBe(true);
  });
});
