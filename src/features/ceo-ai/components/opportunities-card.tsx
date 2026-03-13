import { TrendingUp } from "lucide-react";

import type { CeoAiAnalysis } from "@/features/ceo-ai/lib/ceo-ai-engine";
import { Card } from "@/shared/components/ui/card";

type OpportunitiesCardProps = {
  opportunities: CeoAiAnalysis["opportunities"];
};

export function OpportunitiesCard({
  opportunities,
}: OpportunitiesCardProps) {
  return (
    <Card className="h-full">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[#eef3eb] p-3 text-olive-950">
          <TrendingUp className="size-4" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Oportunidades</p>
          <h3 className="text-xl font-semibold tracking-tight text-olive-950">
            Palancas de crecimiento visibles
          </h3>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {opportunities.map((opportunity) => (
          <div
            key={opportunity.title}
            className="rounded-[24px] border border-olive-950/6 bg-[#fbfaf6] p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold text-olive-950">{opportunity.title}</p>
              <span className="rounded-full bg-olive-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-olive-700">
                {opportunity.metric}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {opportunity.description}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

