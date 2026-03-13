"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { ChartShell } from "@/features/business-charts/chart-shell";
import { Card } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";

type ProfessionalsChartProps = {
  data: { name: string; amount: number }[];
};

const COLORS = ["#2b3424", "#667d56", "#9aae8d", "#d7decf"];

export function ProfessionalsChart({ data }: ProfessionalsChartProps) {
  return (
    <Card className="h-full">
      <p className="text-sm text-muted-foreground">Professionals Chart</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-olive-950">
        Ventas por profesional
      </h3>
      <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ChartShell heightClassName="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`${entry.name}-${entry.amount}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </ChartShell>

        <div className="space-y-3">
          {data.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-2xl border border-olive-950/6 bg-[#fbfaf6] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm font-medium text-olive-950">{item.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
