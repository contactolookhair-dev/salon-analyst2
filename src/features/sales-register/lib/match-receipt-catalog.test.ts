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
});
