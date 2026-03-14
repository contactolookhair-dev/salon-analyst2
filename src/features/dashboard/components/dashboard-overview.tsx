"use client";

import { useEffect, useState } from "react";
import { BarChart3, Coins, HandCoins, Wallet } from "lucide-react";

import { AiAnalystSection } from "@/features/ai-analyst/components/ai-analyst-section";
import { branches as baseBranches } from "@/features/branches/data/mock-branches";
import { loadEditableBranches } from "@/features/branches/lib/branch-config-storage";
import { BusinessChartsSection } from "@/features/business-charts/business-charts-section";
import { PredictionCard } from "@/features/business-predictions/prediction-card";
import { CeoAiSection } from "@/features/ceo-ai/components/ceo-ai-section";
import { useBranch } from "@/shared/context/branch-context";
import {
  getDashboardDataFromSnapshot,
} from "@/features/dashboard/data/mock-dashboard";
import { AiAnalystCard } from "@/features/dashboard/components/ai-analyst-card";
import { ExpensesList } from "@/features/dashboard/components/expenses-list";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { ProfessionalsTable } from "@/features/dashboard/components/professionals-table";
import { Card } from "@/shared/components/ui/card";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { useBusinessSnapshot } from "@/shared/hooks/use-business-snapshot";
import { formatCurrency, formatPercent } from "@/shared/lib/utils";

export function DashboardOverview() {
  const { branch: selectedBranch } = useBranch();
  const { snapshot: filteredSnapshot } = useBusinessSnapshot(selectedBranch);
  const [branchConfigs, setBranchConfigs] = useState(baseBranches);

  useEffect(() => {
    setBranchConfigs(loadEditableBranches());
  }, []);

  const { branch, metrics, salesByProfessional, branchExpenses } =
    getDashboardDataFromSnapshot(filteredSnapshot, selectedBranch, branchConfigs);

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Resumen del día"
        title={branch?.name ?? "Todas las sucursales"}
        description="Vista inicial pensada para decisiones rápidas. La lógica profunda vendrá después, pero la estructura ya quedó lista para escalar."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden bg-olive-950 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-white/45">
                Resumen diario
              </p>
              <h3 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight">
                Base operativa premium para controlar ventas, gastos y utilidad real.
              </h3>
            </div>
            <div className="min-w-[220px] rounded-[28px] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                Avance meta diaria
              </p>
              <p className="mt-3 text-3xl font-semibold">
                {!metrics.commercialTargetApplies
                  ? "Meta no exigible"
                  : formatPercent(metrics.progress)}
              </p>
              <p className="mt-2 text-sm text-white/60">{metrics.commercialStatusLabel}</p>
              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-white"
                  style={{
                    width: `${metrics.commercialTargetApplies ? Math.min(metrics.progress * 100, 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        <AiAnalystCard
          branchName={branch?.name ?? "Todas las sucursales"}
          profit={formatCurrency(metrics.profit)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ventas netas"
          value={formatCurrency(metrics.totalNetSales)}
          helper={
            !metrics.commercialTargetApplies
              ? "Sucursal cerrada hoy. Meta comercial no exigible."
              : `Meta diaria comercial: ${formatCurrency(metrics.dailyTarget)}.`
          }
          icon={<Wallet className="size-5" />}
        />
        <MetricCard
          label="Comisiones"
          value={formatCurrency(metrics.totalCommission)}
          helper="Base preparada para porcentaje o monto fijo."
          icon={<HandCoins className="size-5" />}
        />
        <MetricCard
          label="Gastos del día"
          value={formatCurrency(metrics.totalExpenses)}
          helper={`Incluye ${formatCurrency(metrics.fixedExpensesToday)} fijo contable y ${formatCurrency(
            metrics.recurringExpensesToday
          )} de recurrentes prorrateados.`}
          icon={<Coins className="size-5" />}
        />
        <MetricCard
          label="Resultado contable"
          value={formatCurrency(metrics.accountingResult)}
          helper={`Mes operativo: ${metrics.operatingDaysInMonth} días · meta mensual ${formatCurrency(
            metrics.monthlyTarget
          )}. ${metrics.commercialTargetApplies ? "Cumplimiento comercial activo." : "Gasto fijo del día aplicado aunque la sucursal esté cerrada."}`}
          icon={<BarChart3 className="size-5" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
        <ProfessionalsTable items={salesByProfessional} />
        <ExpensesList items={branchExpenses} />
      </div>

      <AiAnalystSection
        context={{
          sales: filteredSnapshot.sales,
          expenses: filteredSnapshot.expenses,
          professionals: filteredSnapshot.professionals,
        }}
      />

      <CeoAiSection
        branch={selectedBranch}
        context={{
          sales: filteredSnapshot.sales,
          expenses: filteredSnapshot.expenses,
          professionals: filteredSnapshot.professionals,
        }}
      />

      <PredictionCard
        context={{
          sales: filteredSnapshot.sales,
          expenses: filteredSnapshot.expenses,
          professionals: filteredSnapshot.professionals,
        }}
      />

      <BusinessChartsSection snapshot={filteredSnapshot} />
    </section>
  );
}
