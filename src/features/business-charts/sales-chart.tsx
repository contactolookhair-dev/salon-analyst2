"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartShell } from "@/features/business-charts/chart-shell";
import { Card } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";

type SalesChartProps = {
  data: { date: string; amount: number }[];
};

export function SalesChart({ data }: SalesChartProps) {
  return (
    <Card className="h-full">
      <p className="text-sm text-muted-foreground">Sales Chart</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-olive-950">
        Ventas por día del último período
      </h3>
      <div className="mt-6">
        <ChartShell>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667d56" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#667d56" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e8e4d8" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#667d56"
                strokeWidth={2}
                fill="url(#salesFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </Card>
  );
}
