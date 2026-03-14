"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Coins,
  HandCoins,
  Landmark,
  ReceiptText,
  Wallet,
} from "lucide-react";

import { AlertsIntelligenceSection } from "@/features/business-alerts/components/alerts-intelligence-section";
import { BranchLogo } from "@/features/branches/components/branch-logo";
import { branches as baseBranches } from "@/features/branches/data/mock-branches";
import {
  BRANCH_CONFIG_UPDATED_EVENT,
  loadEditableBranches,
} from "@/features/branches/lib/branch-config-storage";
import { ExpensesList } from "@/features/dashboard/components/expenses-list";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { QuickAccessCard } from "@/features/dashboard/components/quick-access-card";
import { RecentActivityCard } from "@/features/dashboard/components/recent-activity-card";
import {
  getDashboardDataFromSnapshot,
} from "@/features/dashboard/data/mock-dashboard";
import { Card } from "@/shared/components/ui/card";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { useBranch } from "@/shared/context/branch-context";
import { useBusinessSnapshot } from "@/shared/hooks/use-business-snapshot";
import { formatCurrency, formatPercent } from "@/shared/lib/utils";

export function DashboardOverview() {
  const { branch: selectedBranch } = useBranch();
  const { snapshot: filteredSnapshot } = useBusinessSnapshot(selectedBranch);
  const [branchConfigs, setBranchConfigs] = useState(baseBranches);

  useEffect(() => {
    const syncBranches = () => setBranchConfigs(loadEditableBranches());

    syncBranches();
    window.addEventListener(BRANCH_CONFIG_UPDATED_EVENT, syncBranches);

    return () => {
      window.removeEventListener(BRANCH_CONFIG_UPDATED_EVENT, syncBranches);
    };
  }, []);

  const { branch, metrics, branchExpenses } = getDashboardDataFromSnapshot(
    filteredSnapshot,
    selectedBranch,
    branchConfigs
  );
  const todaySales = filteredSnapshot.sales
    .filter((sale) => sale.saleDate === metrics.today)
    .sort((left, right) =>
      `${right.saleDate}T${right.createdAt}`.localeCompare(
        `${left.saleDate}T${left.createdAt}`
      )
    );
  const totalGrossSalesToday = todaySales.reduce((sum, sale) => sum + sale.grossAmount, 0);
  const totalVatToday = Math.max(totalGrossSalesToday - metrics.totalNetSales, 0);

  const recentActivity = [
    ...todaySales.slice(0, 4).map((sale) => ({
      id: `sale-${sale.id}`,
      title: sale.service,
      subtitle: `${sale.clientName} · ${sale.branch} · ${sale.createdAt}`,
      amount: sale.grossAmount,
      tone: "sale" as const,
      timestamp: sale.createdAt,
    })),
    ...branchExpenses.slice(0, 3).map((expense) => ({
      id: `expense-${expense.id}`,
      title: expense.title,
      subtitle: `${expense.category} · ${expense.createdAt}`,
      amount: expense.amount,
      tone: "expense" as const,
      timestamp: expense.createdAt,
    })),
  ]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 6);

  const branchSummaryCards = branchConfigs
    .filter((item) => selectedBranch === "all" || item.id === selectedBranch)
    .map((branchConfig) => {
      const branchSales = filteredSnapshot.sales.filter(
        (sale) => sale.branchId === branchConfig.id && sale.saleDate === metrics.today
      );
      const gross = branchSales.reduce((sum, sale) => sum + sale.grossAmount, 0);
      const commission = branchSales.reduce(
        (sum, sale) => sum + sale.commissionValue,
        0
      );
      const expenses = filteredSnapshot.expenses
        .filter(
          (expense) =>
            expense.branchId === branchConfig.id && expense.expenseDate === metrics.today
        )
        .reduce((sum, expense) => sum + expense.amount, 0);

      return {
        id: branchConfig.id,
        name: branchConfig.name,
        gross,
        commission,
        expenses,
      };
    });

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Resumen del día"
        title={branch?.name ?? "Todas las sucursales"}
        description="Panel operativo para leer rápido ventas, utilidad, comisiones, gastos y alertas urgentes sin sobrecargar la pantalla."
        visual={branch ? <BranchLogo branch={branch} size="lg" /> : undefined}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.75fr)]">
        <Card className="overflow-hidden bg-olive-950 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-white/45">
                Resumen diario
              </p>
              <h3 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight">
                Control operativo enfocado en lo urgente: vender, cobrar, pagar y reaccionar a tiempo.
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
                    width: `${
                      metrics.commercialTargetApplies
                        ? Math.min(metrics.progress * 100, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        <QuickAccessCard />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <MetricCard
          label="Ventas del día"
          value={formatCurrency(totalGrossSalesToday)}
          helper="Lectura bruta operativa acumulada."
          icon={<ReceiptText className="size-5" />}
        />
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
          label="Comisiones del día"
          value={formatCurrency(metrics.totalCommission)}
          helper="Base calculada con reglas activas del negocio."
          icon={<HandCoins className="size-5" />}
        />
        <MetricCard
          label="IVA estimado"
          value={formatCurrency(totalVatToday)}
          helper="IVA aproximado sobre ventas del día."
          icon={<Landmark className="size-5" />}
        />
        <MetricCard
          label="Resultado contable"
          value={formatCurrency(metrics.accountingResult)}
          helper={`Gastos del día ${formatCurrency(metrics.totalExpenses)} · cuota fija ${formatCurrency(
            metrics.fixedExpensesToday
          )}.`}
          icon={<BarChart3 className="size-5" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <RecentActivityCard items={recentActivity} />
        <ExpensesList items={branchExpenses} />
      </div>

      <Card className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Resumen por sucursal</p>
          <h3 className="mt-1 text-xl font-semibold text-olive-950">
            Lectura operativa del día
          </h3>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {branchSummaryCards.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-olive-950">{item.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ventas, comisiones y gasto del día para la sucursal activa.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--theme-accent)]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--theme-accent)]">
                  Hoy
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-[var(--theme-card-strong)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Ventas
                  </p>
                  <p className="mt-2 font-semibold text-olive-950">
                    {formatCurrency(item.gross)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--theme-card-strong)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Comisiones
                  </p>
                  <p className="mt-2 font-semibold text-olive-950">
                    {formatCurrency(item.commission)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--theme-card-strong)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Gastos
                  </p>
                  <p className="mt-2 font-semibold text-olive-950">
                    {formatCurrency(item.expenses)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <AlertsIntelligenceSection snapshot={filteredSnapshot} />
    </section>
  );
}
