import { describe, expect, it } from "vitest";

import {
  detectReceiptProvider,
  parseReceiptText,
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

  it("parsea una boleta de Fresha", () => {
    expect(
      parseReceiptText(`FRESHA
Fecha: 2026-03-12
Sucursal: Look Hair Extensions
Cliente: Daniela T.
Profesional: Jenny
Servicio: Mantencion adhesiva
Precio: $45.000
Total: $45.000`)
    ).toEqual({
      provider: "fresha",
      rawText: `FRESHA
Fecha: 2026-03-12
Sucursal: Look Hair Extensions
Cliente: Daniela T.
Profesional: Jenny
Servicio: Mantencion adhesiva
Precio: $45.000
Total: $45.000`,
      sale: {
        date: "2026-03-12",
        branch: "Look Hair Extensions",
        professional: "Jenny",
        client: "Daniela T.",
        service: "Mantencion adhesiva",
        price: 45000,
        total: 45000,
      },
    });
  });
});
