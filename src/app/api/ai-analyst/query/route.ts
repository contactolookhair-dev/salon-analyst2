import { NextResponse } from "next/server";

import {
  askBusinessAI,
  hasOpenAIConfig,
} from "@/features/ai-analyst/integrations/openai/openai-client";
import { responderPreguntaAiLocal } from "@/features/ai-analyst/lib/ai-insights-engine";
import type { AiQueryContext } from "@/features/ai-analyst/types/ai-analyst.types";

export const runtime = "nodejs";

type RequestPayload = {
  question: string;
  context: AiQueryContext;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestPayload;

    if (!body.question?.trim()) {
      return NextResponse.json(
        { error: "La pregunta es obligatoria." },
        { status: 400 }
      );
    }

    if (!body.context) {
      return NextResponse.json(
        { error: "El contexto del negocio es obligatorio." },
        { status: 400 }
      );
    }

    const result = hasOpenAIConfig()
      ? await askBusinessAI(body.question, body.context)
      : responderPreguntaAiLocal(body.question, body.context);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No pude procesar la consulta del analista.",
      },
      { status: 500 }
    );
  }
}
