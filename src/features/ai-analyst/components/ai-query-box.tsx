"use client";

import { useState } from "react";
import { Bot, Search } from "lucide-react";

import { responderPreguntaAi } from "@/features/ai-analyst/lib/ai-insights-engine";
import type {
  AiQueryContext,
  AiQueryResult,
} from "@/features/ai-analyst/types/ai-analyst.types";
import { Card } from "@/shared/components/ui/card";

const EXAMPLE_QUESTIONS = [
  "¿Qué servicio me generó más ganancia este mes?",
  "¿Qué profesional vendió más en Look Hair Extensions?",
  "¿Cuál sucursal fue más rentable?",
  "¿Cuánto gasté este mes?",
  "¿Qué servicio deja más margen?",
];

type AiQueryBoxProps = {
  context: AiQueryContext;
};

export function AiQueryBox({ context }: AiQueryBoxProps) {
  const [question, setQuestion] = useState(EXAMPLE_QUESTIONS[0]);
  const [result, setResult] = useState<AiQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function runQuestion(nextQuestion: string) {
    setIsLoading(true);
    try {
      const nextResult = await responderPreguntaAi(nextQuestion, context);
      setResult(nextResult);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runQuestion(question);
  }

  return (
    <Card className="h-full bg-olive-950 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-white/45">
            Buscador de preguntas
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">
            Consulta rápida del negocio
          </h3>
        </div>
        <Bot className="size-5 text-white/70" />
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="sr-only">Pregunta para el analista</span>
          <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
            <Search className="size-4 text-white/45" />
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              placeholder="Escribe una pregunta del negocio..."
            />
          </div>
        </label>

        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={async () => {
                setQuestion(example);
                await runQuestion(example);
              }}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10"
            >
              {example}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-olive-950"
        >
          {isLoading ? "Analizando..." : "Analizar pregunta"}
        </button>
      </form>

      <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/40">
          Respuesta
        </p>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/80">
          {result?.answer ??
            "Haz una pregunta para consultar al analista. Si existe OPENAI_API_KEY, se usará OpenAI; si no, seguirá funcionando el motor local."}
        </p>
        {result ? (
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/40">
            Fuente:{" "}
            {result.source === "openai"
              ? `OpenAI${result.model ? ` · ${result.model}` : ""}`
              : "Motor local"}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
