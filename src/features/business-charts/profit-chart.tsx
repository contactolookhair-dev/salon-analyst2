"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartShell } from "@/features/business-charts/chart-shell";
import { Card } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";

type ProfitChartProps = {
  data: { date: string; amount: number }[];
};

export function ProfitChart({ data }: ProfitChartProps) {
  return (
    <Card className="h-full">
      <p className="text-sm text-muted-foreground">Profit Chart</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-olive-950">
        Utilidad por día
      </h3>
      <div className="mt-6">
        <ChartShell>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid vertical={false} stroke="#e8e4d8" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="amount" fill="#2b3424" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </Card>
  );
}
