import { ArrowRight } from "lucide-react";

import type { CeoAiAnalysis } from "@/features/ceo-ai/lib/ceo-ai-engine";
import { Card } from "@/shared/components/ui/card";

type RecommendationCardProps = {
  recommendation: CeoAiAnalysis["recommendation"];
};

export function RecommendationCard({
  recommendation,
}: RecommendationCardProps) {
  return (
    <Card className="h-full bg-[#1b2117] text-white">
      <p className="text-sm uppercase tracking-[0.22em] text-white/45">
        {recommendation.title}
      </p>
      <h3 className="mt-4 text-2xl font-semibold tracking-tight">
        Acción ejecutiva sugerida
      </h3>
      <p className="mt-4 text-sm leading-7 text-white/75">
        {recommendation.description}
      </p>
      <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white">
        Prioridad del día
        <ArrowRight className="size-4" />
      </div>
    </Card>
  );
}

