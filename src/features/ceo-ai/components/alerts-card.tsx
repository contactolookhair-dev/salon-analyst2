import { AlertTriangle } from "lucide-react";

import type { CeoAiAnalysis } from "@/features/ceo-ai/lib/ceo-ai-engine";
import { Card } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

type AlertsCardProps = {
  alerts: CeoAiAnalysis["alerts"];
};

const severityStyles = {
  low: "bg-[#eef3eb] text-olive-700",
  medium: "bg-[#f7f0df] text-[#8a6712]",
  high: "bg-[#f9e5e2] text-[#a44735]",
};

export function AlertsCard({ alerts }: AlertsCardProps) {
  return (
    <Card className="h-full">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[#f3ede3] p-3 text-olive-950">
          <AlertTriangle className="size-4" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Alertas</p>
          <h3 className="text-xl font-semibold tracking-tight text-olive-950">
            Riesgos que conviene mirar hoy
          </h3>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.title}
            className="rounded-[24px] border border-olive-950/6 bg-[#fbfaf6] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-olive-950">{alert.title}</p>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                  severityStyles[alert.severity]
                )}
              >
                {alert.severity}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {alert.description}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

