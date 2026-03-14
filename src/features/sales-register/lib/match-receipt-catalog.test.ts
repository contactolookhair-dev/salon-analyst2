import { describe, expect, it } from "vitest";

import {
  createEmptyManualSaleDraft,
  createSaleDraftFromExtraction,
} from "@/features/sales-register/lib/match-receipt-catalog";

describe("match receipt catalog", () => {
  it("autocompleta un item desde el catalogo", () => {
    const draft = createSaleDraftFromExtraction({
      source: "unknown",
      extractedBy: "manual",
      clientName: "Camila",
      professionalName: "Ivanova",
      branchName: "House Of Hair",
      receiptNumber: null,
      date: "2026-03-14",
      paymentMethod: null,
      subtotal: null,
      tax: null,
      grossTotal: 32000,
      netTotal: null,
      totalPaid: 32000,
      currency: "CLP",
      items: [
        {
          id: "i1",
          name: "LAVADO + SECADO",
          type: "unknown",
          quantity: 1,
          unitPrice: 13990,
          lineTotal: 13990,
          warnings: [],
          confidence: 1,
        },
      ],
      warnings: [],
      confidence: 1,
      rawText: "",
    });

    expect(draft.items[0].matchedCatalogId).toBe("lavado-secado");
    expect(draft.items[0].commissionType).toBe("percentage");
    expect(draft.items[0].unitCost).toBe(2000);
  });

  it("crea un draft manual vacio sin crashear", () => {
    const draft = createEmptyManualSaleDraft();

    expect(draft.sourceMode).toBe("manual");
    expect(draft.items).toHaveLength(1);
    expect(draft.items[0].status).toBe("requires_review");
  });

  it('limpia professionalName cuando llega como string "null"', () => {
    const draft = createSaleDraftFromExtraction({
      source: "fresha",
      extractedBy: "text",
      clientName: "Leonardo",
      professionalName: "null",
      branchName: "House Of Hair",
      receiptNumber: "251",
      date: "2026-03-14",
      paymentMethod: "Crédito",
      subtotal: 100000,
      tax: 19000,
      grossTotal: 119000,
      netTotal: 100000,
      totalPaid: 119000,
      currency: "CLP",
      items: [],
      warnings: [],
      confidence: 1,
      rawText: "",
    });

    expect(draft.professionalName).toBe("");
  });

  it("aplica regla de adhesiva como lamina con costo unitario 500", () => {
    const draft = createSaleDraftFromExtraction({
      source: "fresha",
      extractedBy: "text",
      clientName: "Cliente",
      professionalName: "Ivanova",
      branchName: "House Of Hair",
      receiptNumber: "1",
      date: "2026-03-14",
      paymentMethod: "Credito",
      subtotal: 0,
      tax: 0,
      grossTotal: 170000,
      netTotal: 0,
      totalPaid: 170000,
      currency: "CLP",
      items: [
        {
          id: "adh-1",
          name: "Extension adhesivas #1 x20",
          type: "unknown",
          quantity: 1,
          unitPrice: null,
          lineTotal: 170000,
          warnings: [],
          confidence: 0.8,
        },
      ],
      warnings: [],
      confidence: 0.8,
      rawText: "",
    });

    expect(draft.items[0].unitLabel).toBe("sheet");
    expect(draft.items[0].unitCost).toBe(500);
    expect(draft.items[0].quantity).toBe(20);
  });

  it("aplica regla de nano keratina como lamina con costo unitario 500", () => {
    const draft = createSaleDraftFromExtraction({
      source: "fresha",
      extractedBy: "text",
      clientName: "Cliente",
      professionalName: "Ivanova",
      branchName: "House Of Hair",
      receiptNumber: "2",
      date: "2026-03-14",
      paymentMethod: "Credito",
      subtotal: 0,
      tax: 0,
      grossTotal: 550000,
      netTotal: 0,
      totalPaid: 550000,
      currency: "CLP",
      items: [
        {
          id: "nano-1",
          name: "Nano keratina premium x100",
          type: "unknown",
          quantity: 1,
          unitPrice: null,
          lineTotal: 550000,
          warnings: [],
          confidence: 0.8,
        },
      ],
      warnings: [],
      confidence: 0.8,
      rawText: "",
    });

    expect(draft.items[0].unitLabel).toBe("sheet");
    expect(draft.items[0].unitCost).toBe(500);
    expect(draft.items[0].quantity).toBe(100);
  });

  it("aplica regla de mantencion adhesiva como par con 40 por ciento", () => {
    const draft = createSaleDraftFromExtraction({
      source: "agendapro",
      extractedBy: "text",
      clientName: "Cliente",
      professionalName: "Ivanova",
      branchName: "House Of Hair",
      receiptNumber: "3",
      date: "2026-03-14",
      paymentMethod: "Credito",
      subtotal: 0,
      tax: 0,
      grossTotal: 8000,
      netTotal: 0,
      totalPaid: 8000,
      currency: "CLP",
      items: [
        {
          id: "maint-1",
          name: "Mantencion de adhesiva 2 pares",
          type: "unknown",
          quantity: 1,
          unitPrice: null,
          lineTotal: 8000,
          warnings: [],
          confidence: 0.8,
        },
      ],
      warnings: [],
      confidence: 0.8,
      rawText: "",
    });

    expect(draft.items[0].unitLabel).toBe("pair");
    expect(draft.items[0].commissionType).toBe("percentage");
    expect(draft.items[0].commissionValue).toBe(40);
    expect(draft.items[0].quantity).toBe(2);
  });

  it("no aplica 40 por ciento automatico a otras mantenciones", () => {
    const draft = createSaleDraftFromExtraction({
      source: "agendapro",
      extractedBy: "text",
      clientName: "Cliente",
      professionalName: "Ivanova",
      branchName: "House Of Hair",
      receiptNumber: "4",
      date: "2026-03-14",
      paymentMethod: "Credito",
      subtotal: 0,
      tax: 0,
      grossTotal: 30000,
      netTotal: 0,
      totalPaid: 30000,
      currency: "CLP",
      items: [
        {
          id: "maint-2",
          name: "Mantencion nano",
          type: "unknown",
          quantity: 1,
          unitPrice: null,
          lineTotal: 30000,
          warnings: [],
          confidence: 0.8,
        },
      ],
      warnings: [],
      confidence: 0.8,
      rawText: "",
    });

    expect(draft.items[0].commissionValue).not.toBe(40);
    expect(draft.items[0].unitLabel).toBe("sheet");
  });
});
