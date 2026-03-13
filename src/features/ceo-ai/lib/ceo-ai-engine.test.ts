import { describe, expect, it } from "vitest";

import { analyzeCeoAI } from "@/features/ceo-ai/lib/ceo-ai-engine";
import {
  expenses,
  professionals,
  sales,
} from "@/features/dashboard/data/mock-dashboard";

const context = {
  sales,
  expenses,
  professionals,
};

describe("ceo ai engine", () => {
  it("genera lectura ejecutiva con resumen, alertas y recomendacion", () => {
    const result = analyzeCeoAI(context, "all");

    expect(result.summary.title).toBe("Resumen del día");
    expect(result.summary.metrics).toHaveLength(4);
    expect(result.alerts.length).toBeGreaterThan(0);
    expect(result.opportunities.length).toBeGreaterThan(0);
    expect(result.recommendation.title).toBe("Recomendación del día");
  });
});
