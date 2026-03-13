import {
  analyzeCeoAI,
  type CeoAiAnalysis,
} from "@/features/ceo-ai/lib/ceo-ai-engine";
import { AlertsCard } from "@/features/ceo-ai/components/alerts-card";
import { DailySummaryCard } from "@/features/ceo-ai/components/daily-summary-card";
import { OpportunitiesCard } from "@/features/ceo-ai/components/opportunities-card";
import { RecommendationCard } from "@/features/ceo-ai/components/recommendation-card";
import type { AiQueryContext } from "@/features/ai-analyst/types/ai-analyst.types";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import type { BranchFilter } from "@/shared/types/business";

type CeoAiSectionProps = {
  context: AiQueryContext;
  branch: BranchFilter;
};

export function CeoAiSection({ context, branch }: CeoAiSectionProps) {
  const analysis: CeoAiAnalysis = analyzeCeoAI(context, branch);

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="CEO IA del salon"
        title="Lectura ejecutiva automatica"
        description="Una capa de supervision diaria para ver el estado del negocio, detectar alertas y priorizar la mejor accion operativa del dia."
      />
      <DailySummaryCard summary={analysis.summary} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AlertsCard alerts={analysis.alerts} />
        <OpportunitiesCard opportunities={analysis.opportunities} />
      </div>
      <RecommendationCard recommendation={analysis.recommendation} />
    </section>
  );
}
