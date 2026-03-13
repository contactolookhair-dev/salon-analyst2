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

type ServicesChartProps = {
  data: { name: string; amount: number }[];
};

export function ServicesChart({ data }: ServicesChartProps) {
  return (
    <Card className="h-full">
      <p className="text-sm text-muted-foreground">Services Chart</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-olive-950">
        Ventas por tipo de servicio
      </h3>
      <div className="mt-6">
        <ChartShell>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid horizontal={false} stroke="#e8e4d8" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={120}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="amount" fill="#7f996d" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </Card>
  );
}
