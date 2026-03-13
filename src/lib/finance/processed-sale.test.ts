import { describe, expect, it } from "vitest";

import { processParsedSale } from "@/lib/finance";
import type { ParsedReceiptDocument } from "@/shared/types/sales-processing";

describe("processParsedSale", () => {
  it("normaliza nombres y calcula comision porcentual sobre neto", () => {
    const document: ParsedReceiptDocument = {
      source: "fresha",
      date: "2026-03-11",
      branchName: "House of hair",
      professionalName: "Ivanova",
      clientName: "Camila",
      items: [
        {
          rawName: "BALAYAGE PREMIUM",
          quantity: 1,
          lineTotal: 148000,
        },
      ],
      totalDocument: 148000,
      observations: [],
      rawText: "mock",
    };

    const result = processParsedSale(document);

    expect(result.reviewRequired).toBe(false);
    expect(result.branchName).toBe("House Of Hair");
    expect(result.items[0]).toMatchObject({
      matchedCatalogName: "Balayage Premium",
      net: 124370,
      vat: 23630,
      commissionType: "percent",
      commissionValue: 0.4,
      commissionAmount: 49748,
      totalCost: 22000,
      profit: 52622,
      status: "matched",
    });
  });

  it("marca revision cuando no encuentra el servicio en configuracion", () => {
    const document: ParsedReceiptDocument = {
      source: "agendapro",
      date: "2026-03-09",
      branchName: "Look Hair Extensions",
      professionalName: "Jenny",
      clientName: "Paula",
      items: [
        {
          rawName: "Servicio inventado",
          quantity: 1,
          lineTotal: 119000,
        },
      ],
      totalDocument: 119000,
      observations: [],
      rawText: "mock",
    };

    const result = processParsedSale(document);

    expect(result.reviewRequired).toBe(true);
    expect(result.items[0].status).toBe("service_not_found");
    expect(result.items[0].warnings).toContain(
      "Servicio o producto no encontrado en configuración."
    );
  });
});
