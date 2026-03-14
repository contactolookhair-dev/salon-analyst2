import { describe, expect, it } from "vitest";

import { extractReceiptText } from "@/features/sales-register/lib/extract-receipt-text";

describe("extractReceiptText", () => {
  it("no crashea y devuelve partial rescue cuando no encuentra texto util", async () => {
    const result = await extractReceiptText(Buffer.from("%PDF-binary"), "broken.pdf");

    expect(result.success).toBe(false);
    expect(result.strategy).toBe("partial_rescue");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("rescata texto visible desde bytes simples de un pdf textual", async () => {
    const fakePdfBytes = Buffer.from(
      "%PDF-1.4\n(Cliente Alex Flores)\n(Total $45.000)\n(House Of Hair)\n",
      "latin1"
    );

    const result = await extractReceiptText(fakePdfBytes, "textual.pdf");

    expect(result.text).toContain("Cliente Alex Flores");
    expect(result.text).toContain("Total $45.000");
  });
});
