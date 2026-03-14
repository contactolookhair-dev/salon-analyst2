import { describe, expect, it } from "vitest";

import { branches } from "@/features/branches/data/mock-branches";
import {
  countOperatingDaysInMonth,
  getDailyFixedExpense,
  getDailyTarget,
  isBranchOpenOnDate,
} from "@/shared/lib/branch-operations";

describe("branch operations", () => {
  it("cuenta dias operativos reales por sucursal", () => {
    const marchDate = new Date(Date.UTC(2026, 2, 14, 12, 0, 0));

    expect(countOperatingDaysInMonth(branches[0], marchDate)).toBe(26);
    expect(countOperatingDaysInMonth(branches[1], marchDate)).toBe(31);
  });

  it("detecta cierre dominical de House Of Hair", () => {
    const sunday = new Date(Date.UTC(2026, 2, 15, 12, 0, 0));

    expect(isBranchOpenOnDate(branches[0], sunday)).toBe(false);
    expect(isBranchOpenOnDate(branches[1], sunday)).toBe(true);
  });

  it("calcula meta comercial por dias operativos y gasto fijo contable por calendario", () => {
    const saturday = new Date(Date.UTC(2026, 2, 14, 12, 0, 0));
    const sunday = new Date(Date.UTC(2026, 2, 15, 12, 0, 0));

    expect(getDailyTarget(branches[0], saturday)).toBe(620000);
    expect(getDailyFixedExpense(branches[0], saturday)).toBe(58065);
    expect(getDailyTarget(branches[0], sunday)).toBe(0);
    expect(getDailyFixedExpense(branches[0], sunday)).toBe(58065);
    expect(getDailyTarget(branches[1], sunday)).toBe(480000);
    expect(getDailyFixedExpense(branches[1], sunday)).toBe(45161);
  });
});
