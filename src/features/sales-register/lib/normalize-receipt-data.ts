import type { ParsedReceiptDocument } from "@/features/receipt-parser/receipt-types";
import type { ReceiptExtraction } from "@/features/sales-register/types";
import { calcularIVA, calcularNeto } from "@/lib/finance";

function inferCurrency(rawText: string) {
  return rawText.includes("$") ? "CLP" : "CLP";
}

export function normalizeParsedReceiptData(
  parsedReceipt: ParsedReceiptDocument
): ReceiptExtraction {
  const grossTotal = parsedReceipt.totalDocument || 0;
  const netTotal = grossTotal ? calcularNeto(grossTotal) : 0;
  const tax = grossTotal ? calcularIVA(grossTotal) : 0;

  return {
    source: parsedReceipt.source,
    extractedBy: "text",
    clientName: parsedReceipt.clientName || null,
    clientEmail: parsedReceipt.clientEmail || null,
    clientPhone: parsedReceipt.clientPhone || null,
    professionalName: parsedReceipt.professionalName || null,
    branchName: parsedReceipt.branchName || null,
    receiptNumber: parsedReceipt.receiptNumber || null,
    date: parsedReceipt.date || null,
    time: parsedReceipt.time || null,
    issuerName: parsedReceipt.issuerName || parsedReceipt.branchName || null,
    paymentMethod: parsedReceipt.paymentMethod || null,
    subtotal: (parsedReceipt.subtotalDocument ?? netTotal) || null,
    tax: (parsedReceipt.taxDocument ?? tax) || null,
    grossTotal: grossTotal || null,
    netTotal: netTotal || null,
    totalPaid: grossTotal || null,
    balance: parsedReceipt.balanceDocument ?? null,
    currency: inferCurrency(parsedReceipt.rawText),
    origin: "pdf",
    items: parsedReceipt.items.map((item, index) => ({
      id: `parsed-item-${index + 1}`,
      name: item.rawName,
      type: "unknown",
      quantity: item.quantity || 1,
      unit: item.unit ?? null,
      unitPrice:
        item.lineTotal && item.quantity
          ? Math.round(item.lineTotal / Math.max(item.quantity, 1))
          : null,
      lineTotal: item.lineTotal || null,
      warnings: item.notes ? [item.notes] : [],
      confidence: 0.82,
    })),
    warnings: [...parsedReceipt.observations],
    confidence: parsedReceipt.items.length > 0 ? 0.82 : 0.55,
    rawText: parsedReceipt.rawText,
  };
}
