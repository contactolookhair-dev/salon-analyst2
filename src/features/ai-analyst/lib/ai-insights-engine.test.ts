import { describe, expect, it } from "vitest";

import {
  analizarNegocio,
  responderPreguntaAiLocal,
} from "@/features/ai-analyst/lib/ai-insights-engine";
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

describe("AiInsightsEngine", () => {
  it("genera insights estructurados con los mocks del dashboard", () => {
    const insights = analizarNegocio(context);

    expect(insights.topProfitableService?.service).toBe("Extensiones Full Set");
    expect(insights.topProfitableService?.utility).toBe(90748);
    expect(insights.topProfitableService?.branchId).toBe("look-hair-extensions");
    expect(insights.topProfitableService?.margin ?? 0).toBeCloseTo(0.4075, 4);

    expect(insights.topSellingProduct).toEqual({
      productName: "Kit Balayage Care",
      units: 2,
      revenue: 212000,
    });

    expect(insights.mostProfitableBranch).toEqual({
      branchId: "look-hair-extensions",
      utility: 120530,
    });
  });

  it("responde preguntas por palabras clave", () => {
    expect(
      responderPreguntaAiLocal(
        "¿Qué servicio me generó más ganancia este mes?",
        context
      ).answer
    ).toContain("Extensiones Full Set");

    expect(
      responderPreguntaAiLocal(
        "¿Qué profesional vendió más en Look Hair Extensions?",
        context
      ).answer
    ).toContain("Darling");

    expect(
      responderPreguntaAiLocal("¿Cuánto gasté este mes?", context).answer
    ).toContain("$2.115.700");
  });
});
