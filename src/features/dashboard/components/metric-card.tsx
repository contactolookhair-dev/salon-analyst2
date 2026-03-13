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
    <Card className="relative overflow-hidden">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-olive-500/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-olive-950">
            {value}
          </p>
          <p className="mt-3 text-sm text-olive-700">{helper}</p>
        </div>
        <div className="rounded-2xl bg-olive-950 p-3 text-white">{icon}</div>
      </div>
    </Card>
  );
}

