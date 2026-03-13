import { describe, expect, it } from "vitest";

import {
  detectReceiptProvider,
  processReceiptBuffer,
  processReceiptText,
} from "@/features/receipt-parser/receipt-parser";

describe("receipt parser", () => {
  it("detecta Fresha automaticamente", () => {
    expect(
      detectReceiptProvider("FRESHA\nFecha: 2026-03-12\nSucursal: Look Hair Extensions")
    ).toBe("fresha");
  });

  it("detecta AgendaPro automaticamente", () => {
    expect(
      detectReceiptProvider("AgendaPro\nFecha: 2026-03-08\nSucursal: House Of Hair")
    ).toBe("agendapro");
  });

  it("marca unknown cuando no reconoce el origen", () => {
    expect(
      detectReceiptProvider("Boleta interna\nFecha: 2026-03-08\nSucursal: House Of Hair")
    ).toBe("unknown");
  });

  it("parsea y procesa una boleta de Fresha con reglas financieras reales", () => {
    const result = processReceiptText(`FRESHA
Fecha: 2026-03-12
Sucursal: Look Hair Extensions
Cliente: Daniela T.
Profesional: Darling
Servicio: Mantencion adhesiva
Pares: 1
Precio: $45.000
Total: $45.000`);

    expect(result.parsedReceipt).toMatchObject({
      source: "fresha",
      branchName: "Look Hair Extensions",
      professionalName: "Darling",
      clientName: "Daniela T.",
      totalDocument: 45000,
    });

    expect(result.processedSale.branchName).toBe("Look Hair Extensions");
    expect(result.processedSale.professionalName).toBe("Darling");
    expect(result.processedSale.reviewRequired).toBe(false);
    expect(result.processedSale.items[0]).toMatchObject({
      matchedCatalogName: "Mantención de Extension Adhesiva",
      quantity: 1,
      gross: 45000,
      net: 37815,
      vat: 7185,
      commissionType: "fixed",
      commissionAmount: 8000,
      totalCost: 12000,
      profit: 17815,
      status: "matched",
    });
  });

  it("falla con mensaje claro cuando no reconoce Fresha ni AgendaPro", () => {
    expect(() =>
      processReceiptText(`Salon interno
Fecha: 2026-03-12
Sucursal: Look Hair Extensions
Cliente: Daniela T.
Profesional: Darling
Servicio: Mantencion adhesiva
Total: $45.000`)
    ).toThrow("No se pudo identificar si la boleta es de Fresha o AgendaPro.");
  });

  it("devuelve error funcional cuando el buffer no es un pdf valido", async () => {
    const response = await processReceiptBuffer(
      Buffer.from("esto no es un pdf"),
      {
        fileName: "archivo-roto.pdf",
      }
    );

    expect(response.success).toBe(false);

    if (response.success) {
      throw new Error("Se esperaba una respuesta de error.");
    }

    expect(response.code).toBe("invalid_pdf");
    expect(response.error).toBe(
      "El archivo no parece ser un PDF valido o esta dañado."
    );
    expect(response.fallback.fileName).toBe("archivo-roto.pdf");
  });
});
