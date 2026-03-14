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
      processReceiptText(`Comprobante interno
Movimiento manual
Registro operativo
Sin proveedor detectado`)
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
      "El archivo no parece ser un PDF válido o está dañado."
    );
    expect(response.fallback.fileName).toBe("archivo-roto.pdf");
  });

  it("parsea un formato real de Fresha sin labels explicitos", () => {
    const result = processReceiptText(`House of Hair
House of Hair
+56 9 87606049
Sale 301
Wednesday, 11 Mar 2026 en 16:20
Cliente
Alex Flores
+56 9 76240248
1 Protesis Tono #2 $289,990.00
House of Hair
Subtotal $243,689.08
Iva 19% $46,300.92
Total $289,990.00
Crédito $289,990.00`);

    expect(result.parsedReceipt).toMatchObject({
      source: "fresha",
      branchName: "House Of Hair",
      date: "2026-03-11",
      clientName: "Alex Flores",
      totalDocument: 289990,
    });
    expect(result.parsedReceipt.items[0]).toMatchObject({
      rawName: "Protesis Tono #2",
      quantity: 1,
      lineTotal: 289990,
    });
  });

  it("parsea un formato real de AgendaPro con multiples lineas", () => {
    const result = processReceiptText(`Look Hair Extensions
RUT: 78.166.658-0
Dirección: Av. Manquehue Sur 31
Nivel 2 local 374, Las
Condes.Centro Comercial
Apumanque.
Roxana Bejarano
Detalle de la venta
MANTENCIÓN DE EXTENSION
ADHESIVA x1 $ 4.000
MANTENCIÓN DE EXTENSION
ADHESIVA x9 $ 36.000
TOTAL: $ 40.000,00
IMPORTE BASE: $ 33.613,45
IVA: $ 6.386,55
TOTAL : $ 40.000
Monto pagado : $ 40.000
Monto por pagar : $ 0
Venta #3053
Ticket #37366916
12-03-2026 15:05
Pagado en: Pos
Atendido por: Edixon Mendoza,
Edixon Mendoza (prestador)`);

    expect(result.parsedReceipt).toMatchObject({
      source: "agendapro",
      branchName: "Look Hair Extensions",
      date: "2026-03-12",
      clientName: "Roxana Bejarano",
      professionalName: "Edixon Mendoza",
      totalDocument: 40000,
    });
    expect(result.parsedReceipt.items).toHaveLength(2);
    expect(result.parsedReceipt.items[0]).toMatchObject({
      rawName: "MANTENCIÓN DE EXTENSION ADHESIVA",
      quantity: 1,
      lineTotal: 4000,
    });
    expect(result.parsedReceipt.items[1]).toMatchObject({
      quantity: 9,
      lineTotal: 36000,
    });
  });
});
