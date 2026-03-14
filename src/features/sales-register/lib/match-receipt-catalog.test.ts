import { describe, expect, it } from "vitest";

import {
  createEmptyManualSaleDraft,
  createSaleDraftFromExtraction,
} from "@/features/sales-register/lib/match-receipt-catalog";
import { recalculateSaleLine } from "@/features/sales-register/lib/calculate-receipt-financials";

describe("match receipt catalog", () => {
  it("autocompleta un item desde el catalogo", () => {
    const draft = createSaleDraftFromExtraction({
      source: "unknown",
      extractedBy: "manual",
      clientName: "Camila",
      clientEmail: null,
      clientPhone: null,
      professionalName: "Ivanova",
      branchName: "House Of Hair",
      receiptNumber: null,
      date: "2026-03-14",
      time: null,
      issuerName: null,
      paymentMethod: null,
      subtotal: null,
      tax: null,
      grossTotal: 32000,
      netTotal: null,
      totalPaid: 32000,
      balance: null,
      currency: "CLP",
      origin: "manual",
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
      clientEmail: null,
      clientPhone: null,
      professionalName: "null",
      branchName: "House Of Hair",
      receiptNumber: "251",
      date: "2026-03-14",
      time: null,
      issuerName: null,
      paymentMethod: "Crédito",
      subtotal: 100000,
      tax: 19000,
      grossTotal: 119000,
      netTotal: 100000,
      totalPaid: 119000,
      balance: null,
      currency: "CLP",
      origin: "pdf",
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
      clientEmail: null,
      clientPhone: null,
      professionalName: "Ivanova",
      branchName: "House Of Hair",
      receiptNumber: "1",
      date: "2026-03-14",
      time: null,
      issuerName: null,
      paymentMethod: "Credito",
      subtotal: 0,
      tax: 0,
      grossTotal: 170000,
      netTotal: 0,
      totalPaid: 170000,
      balance: null,
      currency: "CLP",
      origin: "pdf",
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

  it("mantiene comision fija por lamina en match exacto de extensiones adhesivas", () => {
    const draft = createSaleDraftFromExtraction({
      source: "fresha",
      extractedBy: "text",
      clientName: "Cliente",
      clientEmail: null,
      clientPhone: null,
      professionalName: "Ivanova",
      branchName: "House Of Hair",
      receiptNumber: "5",
      date: "2026-03-14",
      time: null,
      issuerName: null,
      paymentMethod: "Credito",
      subtotal: 0,
      tax: 0,
      grossTotal: 85000,
      netTotal: 0,
      totalPaid: 85000,
      balance: null,
      currency: "CLP",
      origin: "pdf",
      items: [
        {
          id: "adh-exact",
          name: "Extension adhesivas #1b",
          type: "unknown",
          quantity: 1,
          unitPrice: null,
          lineTotal: 85000,
          warnings: [],
          confidence: 0.8,
        },
      ],
      warnings: [],
      confidence: 0.8,
      rawText: "",
    });

    const recalculated = recalculateSaleLine(draft.items[0]);

    expect(recalculated.unitLabel).toBe("sheet");
    expect(recalculated.quantity).toBe(10);
    expect(recalculated.priceMode).toBe("unit");
    expect(recalculated.unitPrice).toBe(8500);
    expect(recalculated.grossLineTotal).toBe(85000);
    expect(recalculated.commissionType).toBe("fixed");
    expect(recalculated.commissionValue).toBe(500);
    expect(recalculated.commissionAmount).toBe(5000);
  });

  it("aplica regla de nano keratina como lamina con costo unitario 500", () => {
    const draft = createSaleDraftFromExtraction({
      source: "fresha",
      extractedBy: "text",
      clientName: "Cliente",
      clientEmail: null,
      clientPhone: null,
      professionalName: "Ivanova",
      branchName: "House Of Hair",
      receiptNumber: "2",
      date: "2026-03-14",
      time: null,
      issuerName: null,
      paymentMethod: "Credito",
      subtotal: 0,
      tax: 0,
      grossTotal: 550000,
      netTotal: 0,
      totalPaid: 550000,
      balance: null,
      currency: "CLP",
      origin: "pdf",
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
      clientEmail: null,
      clientPhone: null,
      professionalName: "Ivanova",
      branchName: "House Of Hair",
      receiptNumber: "3",
      date: "2026-03-14",
      time: null,
      issuerName: null,
      paymentMethod: "Credito",
      subtotal: 0,
      tax: 0,
      grossTotal: 8000,
      netTotal: 0,
      totalPaid: 8000,
      balance: null,
      currency: "CLP",
      origin: "pdf",
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

  it("convierte mantencion adhesiva exacta a pares cuando el total indica laminas", () => {
    const draft = createSaleDraftFromExtraction({
      source: "fresha",
      extractedBy: "text",
      clientName: "Cliente",
      clientEmail: null,
      clientPhone: null,
      professionalName: "Ivanova",
      branchName: "House Of Hair",
      receiptNumber: "6",
      date: "2026-03-14",
      time: null,
      issuerName: null,
      paymentMethod: "Credito",
      subtotal: 0,
      tax: 0,
      grossTotal: 80000,
      netTotal: 0,
      totalPaid: 80000,
      balance: null,
      currency: "CLP",
      origin: "pdf",
      items: [
        {
          id: "maint-exact",
          name: "MANTENCIÓN DE EXTENSION ADHESIVA",
          type: "unknown",
          quantity: 1,
          unitPrice: null,
          lineTotal: 80000,
          warnings: [],
          confidence: 0.8,
        },
      ],
      warnings: [],
      confidence: 0.8,
      rawText: "",
    });

    const recalculated = recalculateSaleLine(draft.items[0]);

    expect(recalculated.unitLabel).toBe("pair");
    expect(recalculated.quantity).toBe(20);
    expect(recalculated.priceMode).toBe("unit");
    expect(recalculated.unitPrice).toBe(4000);
    expect(recalculated.grossLineTotal).toBe(80000);
    expect(recalculated.commissionType).toBe("percentage");
    expect(recalculated.commissionValue).toBe(40);
    expect(recalculated.commissionAmount).toBe(26891);
    expect(recalculated.totalCost).toBe(10000);
    expect(recalculated.profit).toBe(30336);
  });

  it("no aplica 40 por ciento automatico a otras mantenciones", () => {
    const draft = createSaleDraftFromExtraction({
      source: "agendapro",
      extractedBy: "text",
      clientName: "Cliente",
      clientEmail: null,
      clientPhone: null,
      professionalName: "Ivanova",
      branchName: "House Of Hair",
      receiptNumber: "4",
      date: "2026-03-14",
      time: null,
      issuerName: null,
      paymentMethod: "Credito",
      subtotal: 0,
      tax: 0,
      grossTotal: 30000,
      netTotal: 0,
      totalPaid: 30000,
      balance: null,
      currency: "CLP",
      origin: "pdf",
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
