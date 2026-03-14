import { describe, expect, it } from "vitest";

import { parseSafeSaleDate } from "@/shared/lib/safe-date";

describe("parseSafeSaleDate", () => {
  it("convierte fechas dd/mm/yyyy", () => {
    const result = parseSafeSaleDate("14/03/2026");

    expect(result.isoDate).toBe("2026-03-14");
    expect(result.usedFallback).toBe(false);
  });

  it("usa fallback si la fecha es invalida", () => {
    const result = parseSafeSaleDate("Invalid Date");

    expect(result.usedFallback).toBe(true);
    expect(result.value instanceof Date).toBe(true);
  });
});
