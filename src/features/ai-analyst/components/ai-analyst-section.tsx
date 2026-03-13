import { AiInsightsCards } from "@/features/ai-analyst/components/ai-insights-cards";
import { AiQueryBox } from "@/features/ai-analyst/components/ai-query-box";
import { analizarNegocio } from "@/features/ai-analyst/lib/ai-insights-engine";
import type { AiQueryContext } from "@/features/ai-analyst/types/ai-analyst.types";
import { SectionHeading } from "@/shared/components/ui/section-heading";

type AiAnalystSectionProps = {
  context: AiQueryContext;
};

export function AiAnalystSection({ context }: AiAnalystSectionProps) {
  const insights = analizarNegocio(context);

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Analista IA del negocio"
        title="Lecturas automáticas del negocio"
        description="Esta primera versión detecta patrones sobre ventas, gastos, comisiones y utilidad usando el motor financiero actual."
      />
      <AiInsightsCards items={insights.cards} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-panel backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">
            El motor estructurado ya puede identificar el servicio más rentable, la
            sucursal más fuerte, el mayor gasto del período y el servicio con mejor
            margen para preparar futuras recomendaciones inteligentes.
          </p>
        </div>
        <AiQueryBox context={context} />
      </div>
    </section>
  );
}
