import { describe, expect, it } from "vitest";

import { analyzeBusinessPredictions } from "@/features/business-predictions/prediction-engine";
import {
  expenses,
  professionals,
  sales,
} from "@/features/dashboard/data/mock-dashboard";

describe("business prediction engine", () => {
  it("genera predicciones de ventas y crecimiento", () => {
    const result = analyzeBusinessPredictions({
      sales,
      expenses,
      professionals,
    });

    expect(result.metrics).toHaveLength(4);
    expect(result.tomorrowSalesPrediction).toBeGreaterThan(0);
    expect(result.weekSalesPrediction).toBeGreaterThan(0);
    expect(result.topLikelyService?.service).toBeDefined();
    expect(result.fastestGrowingBranch?.branch).toBeDefined();
  });
});

