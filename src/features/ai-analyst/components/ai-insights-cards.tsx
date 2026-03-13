import { Sparkles } from "lucide-react";

import type { AiInsightCardData } from "@/features/ai-analyst/types/ai-analyst.types";
import { Card } from "@/shared/components/ui/card";

type AiInsightsCardsProps = {
  items: AiInsightCardData[];
};

export function AiInsightsCards({ items }: AiInsightsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.id} className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <span className="rounded-full bg-olive-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-olive-700">
              {item.badge}
            </span>
            <Sparkles className="size-4 text-olive-700" />
          </div>
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">{item.title}</p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-olive-950">
              {item.value}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {item.detail}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

