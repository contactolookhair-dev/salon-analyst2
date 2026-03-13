import { Sparkles } from "lucide-react";

import { Card } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";

type ProfessionalsTableProps = {
  items: {
    professional: {
      id: string;
      name: string;
      role: string;
    };
    tickets: number;
    netSales: number;
    commission: number;
    topService: string;
  }[];
};

export function ProfessionalsTable({ items }: ProfessionalsTableProps) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Ventas por profesional
          </p>
          <h3 className="mt-1 text-xl font-semibold text-olive-950">
            Rendimiento del equipo
          </h3>
        </div>
        <div className="rounded-full bg-olive-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-olive-700">
          Hoy
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div
            key={item.professional.id}
            className="grid gap-4 rounded-3xl border border-olive-950/6 bg-[#fbfaf6] p-4 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]"
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-olive-950 text-sm font-semibold text-white">
                  {item.professional.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-olive-950">
                    {item.professional.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.professional.role}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Venta neta
              </p>
              <p className="mt-2 text-lg font-semibold text-olive-950">
                {formatCurrency(item.netSales)}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Comisión
              </p>
              <p className="mt-2 text-lg font-semibold text-olive-950">
                {formatCurrency(item.commission)}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Tickets
              </p>
              <p className="mt-2 text-lg font-semibold text-olive-950">
                {item.tickets}
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm text-olive-700">
                <Sparkles className="size-4" />
                {item.topService}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

