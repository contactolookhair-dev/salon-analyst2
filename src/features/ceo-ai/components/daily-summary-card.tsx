import { Card } from "@/shared/components/ui/card";
import type { CeoAiAnalysis } from "@/features/ceo-ai/lib/ceo-ai-engine";

type DailySummaryCardProps = {
  summary: CeoAiAnalysis["summary"];
};

export function DailySummaryCard({ summary }: DailySummaryCardProps) {
  return (
    <Card className="overflow-hidden bg-olive-950 text-white">
      <p className="text-sm uppercase tracking-[0.22em] text-white/45">
        {summary.title}
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
        {summary.subtitle}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[24px] border border-white/10 bg-white/5 p-4"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-white/45">
              {metric.label}
            </p>
            <p className="mt-3 text-xl font-semibold tracking-tight text-white">
              {metric.value}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

