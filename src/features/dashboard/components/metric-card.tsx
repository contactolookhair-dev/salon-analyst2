import type { ReactNode } from "react";

import { Card } from "@/shared/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
};

export function MetricCard({ label, value, helper, icon }: MetricCardProps) {
  return (
    <Card className="relative min-w-0 overflow-hidden">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-olive-500/10 blur-2xl" />
      <div className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(2rem,2.4vw,3rem)] font-semibold tracking-tight text-olive-950">
            {value}
          </p>
          <p className="mt-3 text-sm text-olive-700">{helper}</p>
        </div>
        <div className="shrink-0 self-start rounded-2xl bg-olive-950 p-3 text-white">
          {icon}
        </div>
      </div>
    </Card>
  );
}
