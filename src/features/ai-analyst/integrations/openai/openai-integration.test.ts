import { describe, expect, it } from "vitest";

import { parseOpenAIBusinessResponse } from "@/features/ai-analyst/integrations/openai/ai-response-parser";
import { buildBusinessAIContext } from "@/features/ai-analyst/integrations/openai/build-ai-context";
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

describe("OpenAI integration helpers", () => {
  it("arma un contexto de negocio util para OpenAI", () => {
    const aiContext = buildBusinessAIContext(context);

    expect(aiContext.salesCount).toBe(4);
    expect(aiContext.expensesCount).toBe(5);
    expect(aiContext.utility.utilidad).toBe(-1923754);
    expect(aiContext.professionals[0]).toHaveProperty("professionalName");
    expect(aiContext.services.length).toBeGreaterThan(0);
  });

  it("convierte la respuesta JSON del modelo a formato UI", () => {
    expect(
      parseOpenAIBusinessResponse(
        JSON.stringify({
          answer: "Extensiones Full Set fue el servicio con más utilidad.",
          matchedRule: "servicio-mas-rentable",
          bullets: ["Utilidad: $90.748", "Sucursal: Look Hair Extensions"],
        }),
        "¿Qué servicio me generó más utilidad este mes?",
        "gpt-5-mini"
      )
    ).toEqual({
      question: "¿Qué servicio me generó más utilidad este mes?",
      answer:
        "Extensiones Full Set fue el servicio con más utilidad.\n\n- Utilidad: $90.748\n- Sucursal: Look Hair Extensions",
      matchedRule: "servicio-mas-rentable",
      source: "openai",
      model: "gpt-5-mini",
    });
  });
});
