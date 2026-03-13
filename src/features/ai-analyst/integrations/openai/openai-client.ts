import "server-only";

import OpenAI from "openai";

import { parseOpenAIBusinessResponse } from "@/features/ai-analyst/integrations/openai/ai-response-parser";
import { buildBusinessAIContext } from "@/features/ai-analyst/integrations/openai/build-ai-context";
import type {
  AiQueryContext,
  AiQueryResult,
} from "@/features/ai-analyst/types/ai-analyst.types";

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function hasOpenAIConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function askBusinessAI(
  question: string,
  context: AiQueryContext
): Promise<AiQueryResult> {
  const client = getOpenAIClient();

  if (!client) {
    throw new Error("OPENAI_API_KEY no está configurada.");
  }

  const model = process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
  const businessContext = buildBusinessAIContext(context);
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "Eres un analista financiero para salones de belleza. Responde en espanol claro usando solo el contexto entregado. Devuelve JSON valido con las claves answer, matchedRule y bullets.",
      },
      {
        role: "user",
        content: `Pregunta: ${question}\n\nContexto del negocio:\n${JSON.stringify(
          businessContext
        )}`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "business_ai_response",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            answer: { type: "string" },
            matchedRule: { type: "string" },
            bullets: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["answer", "matchedRule", "bullets"],
        },
      },
    },
  });

  return parseOpenAIBusinessResponse(response.output_text, question, model);
}

