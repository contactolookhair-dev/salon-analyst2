import { Clock3 } from "lucide-react";

import { Card } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";

type RecentActivityCardProps = {
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    amount: number;
    tone: "sale" | "expense";
    timestamp: string;
  }>;
};

export function RecentActivityCard({ items }: RecentActivityCardProps) {
  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Actividad reciente</p>
          <h3 className="mt-1 text-xl font-semibold text-olive-950">
            Últimos movimientos
          </h3>
        </div>
        <div className="rounded-full bg-[var(--theme-accent)]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--theme-accent)]">
          Live
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-olive-950">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      item.tone === "sale" ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {item.tone === "sale" ? "+" : "-"}
                    {formatCurrency(item.amount)}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <Clock3 className="size-3" />
                    {item.timestamp}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-5 text-sm text-muted-foreground">
            Aún no hay movimientos recientes para mostrar.
          </div>
        )}
      </div>
    </Card>
  );
}
