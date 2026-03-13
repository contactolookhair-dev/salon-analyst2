import { TrendingUp } from "lucide-react";

import {
  analyzeBusinessPredictions,
  type BusinessPredictionAnalysis,
} from "@/features/business-predictions/prediction-engine";
import type { AiQueryContext } from "@/features/ai-analyst/types/ai-analyst.types";
import { Card } from "@/shared/components/ui/card";

type PredictionCardProps = {
  context: AiQueryContext;
};

function getBarHeight(value: number, maxValue: number) {
  if (maxValue <= 0) {
    return 18;
  }

  return Math.max(18, Math.round((value / maxValue) * 100));
}

export function PredictionCard({ context }: PredictionCardProps) {
  const analysis: BusinessPredictionAnalysis = analyzeBusinessPredictions(context);
  const maxChartValue = Math.max(...analysis.chart.map((item) => item.amount), 0);

  return (
    <section className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.22em] text-olive-700">
              Predicciones del negocio
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-olive-950">
              Lectura proyectada de ventas y crecimiento
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Esta primera predicción usa historial diario, comportamiento por
              servicio y tracción por sucursal para anticipar el próximo movimiento
              del negocio.
            </p>
          </div>

          <div className="min-w-[280px] rounded-[28px] border border-olive-950/6 bg-[#fbfaf6] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#eef3eb] p-3 text-olive-950">
                <TrendingUp className="size-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tendencia semanal</p>
                <p className="text-2xl font-semibold tracking-tight text-olive-950">
                  {analysis.metrics[1]?.detail.replace("Tendencia semanal ", "")}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-end gap-3">
              {analysis.chart.map((point) => (
                <div
                  key={`${point.label}-${point.amount}`}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div
                    className="w-full rounded-t-2xl bg-olive-700/85"
                    style={{ height: `${getBarHeight(point.amount, maxChartValue)}px` }}
                  />
                  <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {point.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {analysis.metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[24px] border border-olive-950/6 bg-[#fbfaf6] p-5"
            >
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-3 text-xl font-semibold tracking-tight text-olive-950">
                {metric.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {metric.detail}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

