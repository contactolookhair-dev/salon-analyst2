import type { AiQueryResult } from "@/features/ai-analyst/types/ai-analyst.types";

type OpenAIBusinessResponse = {
  answer: string;
  matchedRule: string;
  bullets?: string[];
};

export function parseOpenAIBusinessResponse(
  rawText: string,
  question: string,
  model: string
): AiQueryResult {
  const parsed = JSON.parse(rawText) as OpenAIBusinessResponse;

  return {
    question,
    answer: parsed.bullets?.length
      ? `${parsed.answer}\n\n${parsed.bullets.map((bullet) => `- ${bullet}`).join("\n")}`
      : parsed.answer,
    matchedRule: parsed.matchedRule,
    source: "openai",
    model,
  };
}

