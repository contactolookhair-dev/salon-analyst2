"use client";

import { BarChart3, Building2, Percent, TrendingUp, Users } from "lucide-react";

import { AiAnalystSection } from "@/features/ai-analyst/components/ai-analyst-section";
import { BusinessChartsSection } from "@/features/business-charts/business-charts-section";
import { PredictionCard } from "@/features/business-predictions/prediction-card";
import { CeoAiSection } from "@/features/ceo-ai/components/ceo-ai-section";
import { ProfessionalsTable } from "@/features/dashboard/components/professionals-table";
import { getDashboardDataFromSnapshot, type BusinessSnapshot } from "@/features/dashboard/data/mock-dashboard";
import { Card } from "@/shared/components/ui/card";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { useBranch } from "@/shared/context/branch-context";
import { formatCurrency, formatPercent } from "@/shared/lib/utils";

type StatisticsOverviewProps = {
  snapshot: BusinessSnapshot;
};

function buildTopServices(snapshot: BusinessSnapshot) {
  const grouped = new Map<string, { name: string; amount: number; count: number }>();

  snapshot.sales.forEach((sale) => {
    const current = grouped.get(sale.service) ?? {
      name: sale.service,
      amount: 0,
      count: 0,
    };

    current.amount += sale.grossAmount;
    current.count += 1;
    grouped.set(sale.service, current);
  });

  return Array.from(grouped.values())
    .sort((left, right) => right.count - left.count || right.amount - left.amount)
    .slice(0, 6);
}

function buildTopProducts(snapshot: BusinessSnapshot) {
  const grouped = new Map<string, { name: string; amount: number; count: number }>();

  snapshot.sales.forEach((sale) => {
    if (!sale.productName) {
      return;
    }

    const current = grouped.get(sale.productName) ?? {
      name: sale.productName,
      amount: 0,
      count: 0,
    };

    current.amount += sale.grossAmount;
    current.count += 1;
    grouped.set(sale.productName, current);
  });

  return Array.from(grouped.values())
    .sort((left, right) => right.count - left.count || right.amount - left.amount)
    .slice(0, 6);
}

function buildBranchComparison(snapshot: BusinessSnapshot) {
  const grouped = new Map<
    string,
    { branch: string; gross: number; net: number; commission: number; profit: number }
  >();

  snapshot.sales.forEach((sale) => {
    const current = grouped.get(sale.branchId) ?? {
      branch: sale.branch,
      gross: 0,
      net: 0,
      commission: 0,
      profit: 0,
    };

    current.gross += sale.grossAmount;
    current.net += sale.netAmount;
    current.commission += sale.commissionValue;
    current.profit += sale.netAmount - sale.commissionValue - sale.cost;
    grouped.set(sale.branchId, current);
  });

  return Array.from(grouped.values()).sort((left, right) => right.profit - left.profit);
}

export function StatisticsOverview({ snapshot }: StatisticsOverviewProps) {
  const { branch } = useBranch();
  const { salesByProfessional } = getDashboardDataFromSnapshot(snapshot, branch);
  const totalGross = snapshot.sales.reduce((sum, sale) => sum + sale.grossAmount, 0);
  const ticketAverage = snapshot.sales.length ? totalGross / snapshot.sales.length : 0;
  const totalNet = snapshot.sales.reduce((sum, sale) => sum + sale.netAmount, 0);
  const totalCommission = snapshot.sales.reduce((sum, sale) => sum + sale.commissionValue, 0);
  const marginRatio =
    totalNet > 0
      ? (totalNet - totalCommission - snapshot.sales.reduce((sum, sale) => sum + sale.cost, 0)) /
        totalNet
      : 0;
  const topServices = buildTopServices(snapshot);
  const topProducts = buildTopProducts(snapshot);
  const branchComparison = buildBranchComparison(snapshot);

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Estadísticas"
        title="Capa analítica del negocio"
        description="Aquí vive la lectura histórica, comparativa y proyectada. El dashboard principal queda enfocado en operación diaria, mientras esta vista concentra tendencias, rankings y análisis extensos."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ticket promedio"
          value={formatCurrency(ticketAverage)}
          helper="Promedio bruto por venta en el rango cargado."
          icon={<BarChart3 className="size-5" />}
        />
        <MetricCard
          label="Margen neto histórico"
          value={formatPercent(marginRatio)}
          helper="Utilidad neta sobre ventas netas acumuladas."
          icon={<Percent className="size-5" />}
        />
        <MetricCard
          label="Profesionales activos"
          value={`${snapshot.professionals.filter((professional) => professional.active).length}`}
          helper="Base activa para comparativas y desempeño."
          icon={<Users className="size-5" />}
        />
        <MetricCard
          label="Sucursales comparadas"
          value={`${branchComparison.length}`}
          helper="Comparativa basada en ventas y utilidad histórica."
          icon={<Building2 className="size-5" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <ProfessionalsTable items={salesByProfessional} />
        <Card className="space-y-5">
          <div>
            <p className="text-sm text-muted-foreground">Comparación entre sucursales</p>
            <h3 className="mt-1 text-xl font-semibold text-olive-950">
              Rendimiento acumulado
            </h3>
          </div>

          <div className="space-y-3">
            {branchComparison.map((item) => (
              <div
                key={item.branch}
                className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-olive-950">{item.branch}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ventas netas {formatCurrency(item.net)} · Comisiones {formatCurrency(item.commission)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Utilidad</p>
                    <p className="mt-1 text-lg font-semibold text-olive-950">
                      {formatCurrency(item.profit)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-5">
          <div>
            <p className="text-sm text-muted-foreground">Servicios más vendidos</p>
            <h3 className="mt-1 text-xl font-semibold text-olive-950">
              Ranking por servicio
            </h3>
          </div>
          <div className="space-y-3">
            {topServices.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-olive-950">
                    {index + 1}. {item.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.count} ventas
                  </p>
                </div>
                <p className="font-semibold text-olive-950">
                  {formatCurrency(item.amount)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-sm text-muted-foreground">Productos más vendidos</p>
            <h3 className="mt-1 text-xl font-semibold text-olive-950">
              Ranking por producto
            </h3>
          </div>
          <div className="space-y-3">
            {topProducts.length ? (
              topProducts.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-olive-950">
                      {index + 1}. {item.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.count} ventas
                    </p>
                  </div>
                  <p className="font-semibold text-olive-950">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-5 text-sm text-muted-foreground">
                Todavía no hay productos suficientes para comparar en esta vista.
              </div>
            )}
          </div>
        </Card>
      </div>

      <PredictionCard
        context={{
          sales: snapshot.sales,
          expenses: snapshot.expenses,
          professionals: snapshot.professionals,
        }}
      />

      <BusinessChartsSection snapshot={snapshot} />

      <AiAnalystSection
        context={{
          sales: snapshot.sales,
          expenses: snapshot.expenses,
          professionals: snapshot.professionals,
        }}
      />

      <CeoAiSection
        branch={branch}
        context={{
          sales: snapshot.sales,
          expenses: snapshot.expenses,
          professionals: snapshot.professionals,
        }}
      />
    </section>
  );
}
