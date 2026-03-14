import { describe, expect, it } from "vitest";

import { recalculateSaleDraft, recalculateSaleLine } from "@/features/sales-register/lib/calculate-receipt-financials";
import { createEmptyManualSaleDraft } from "@/features/sales-register/lib/match-receipt-catalog";

describe("calculate receipt financials", () => {
  it("calcula comision porcentual sobre neto", () => {
    const line = recalculateSaleLine({
      ...createEmptyManualSaleDraft().items[0],
      matchedCatalogId: "corte-cabello-mujer",
      matchedCatalogName: "Corte de Cabello Mujer",
      originalPdfName: "Corte de Cabello Mujer",
      inputName: "Corte de Cabello Mujer",
      category: "Peluqueria",
      itemType: "service",
      quantity: 1,
      unitPrice: 119000,
      baseUnitPrice: 119000,
      commissionType: "percentage",
      commissionValue: 30,
      commissionBase: "net",
      unitCost: 10000,
      baseUnitCost: 10000,
      estimatedUnitCost: 10000,
      sourceLineTotal: 119000,
      catalogItem: null,
      warnings: [],
      matchMethod: "manual",
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
      originalPdfName: "Mantención de Extension Adhesiva",
      inputName: "Mantención de Extension Adhesiva",
      category: "Extensiones",
      itemType: "service",
      quantity: 2,
      priceMode: "unit",
      unitPrice: 45000,
      baseUnitPrice: 45000,
      commissionType: "fixed",
      commissionValue: 8000,
      commissionBase: "unit",
      unitCost: 12000,
      baseUnitCost: 12000,
      estimatedUnitCost: 12000,
      sourceLineTotal: 90000,
      catalogItem: null,
      warnings: [],
      matchMethod: "manual",
    });

    expect(line.grossLineTotal).toBe(90000);
    expect(line.commissionAmount).toBe(16000);
    expect(line.totalCost).toBe(24000);
  });

  it("calcula productos por cantidad usando precio y costo unitario", () => {
    const line = recalculateSaleLine({
      ...createEmptyManualSaleDraft().items[0],
      matchedCatalogId: null,
      matchedCatalogName: "Extension adhesivas #1b",
      originalPdfName: "Extension adhesivas #1b",
      inputName: "Extension adhesivas #1b",
      category: "Extensiones adhesivas",
      itemType: "product",
      quantity: 10,
      unitLabel: "sheet",
      priceMode: "unit",
      unitPrice: 8500,
      baseUnitPrice: 8500,
      commissionType: "fixed",
      commissionValue: 500,
      commissionBase: "net",
      unitCost: 1500,
      baseUnitCost: 1500,
      estimatedUnitCost: 1500,
      sourceLineTotal: 85000,
      catalogItem: null,
      warnings: [],
      matchMethod: "manual",
    });

    expect(line.grossLineTotal).toBe(85000);
    expect(line.netLineTotal).toBe(71429);
    expect(line.vatAmount).toBe(13571);
    expect(line.totalCost).toBe(15000);
    expect(line.commissionAmount).toBe(5000);
    expect(line.profit).toBe(51429);
  });

  it("escala costo de servicios cuando cambia el precio cobrado", () => {
    const line = recalculateSaleLine({
      ...createEmptyManualSaleDraft().items[0],
      matchedCatalogId: "lavado-secado",
      matchedCatalogName: "LAVADO + SECADO",
      originalPdfName: "LAVADO + SECADO",
      inputName: "LAVADO + SECADO",
      category: "Peluqueria",
      itemType: "service",
      quantity: 1,
      unitPrice: 30000,
      baseUnitPrice: 13990,
      commissionType: "percentage",
      commissionValue: 40,
      commissionBase: "net",
      unitCost: 2000,
      baseUnitCost: 2000,
      estimatedUnitCost: 2000,
      sourceLineTotal: 30000,
      catalogItem: null,
      warnings: [],
      matchMethod: "manual",
    });

    expect(line.grossLineTotal).toBe(30000);
    expect(line.estimatedUnitCost).toBeCloseTo(4288.78, 1);
    expect(line.totalCost).toBe(4289);
  });

  it("recalcula totales sin crash cuando faltan reglas", () => {
    const draft = createEmptyManualSaleDraft();
    const result = recalculateSaleDraft(draft);

    expect(result.totals.grossTotal).toBe(0);
    expect(result.draft.reviewRequired).toBe(true);
  });
});
