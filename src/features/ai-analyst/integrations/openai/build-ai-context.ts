import { branches } from "@/features/branches/data/mock-branches";
import type { AiQueryContext } from "@/features/ai-analyst/types/ai-analyst.types";
import {
  calcularUtilidadMes,
  calcularVentasPorProfesional,
  calcularVentasPorSucursal,
} from "@/lib/finance";

function buildServiceSummaries(context: AiQueryContext) {
  const grouped = new Map<
    string,
    {
      service: string;
      branch: string;
      totalNetSales: number;
      totalGrossSales: number;
      totalCost: number;
      count: number;
    }
  >();

  context.sales.forEach((sale) => {
    const key = `${sale.branchId}:${sale.service}`;
    const current = grouped.get(key);

    if (current) {
      current.totalNetSales += sale.netAmount;
      current.totalGrossSales += sale.grossAmount;
      current.totalCost += sale.cost;
      current.count += 1;
      return;
    }

    grouped.set(key, {
      service: sale.service,
      branch: sale.branch,
      totalNetSales: sale.netAmount,
      totalGrossSales: sale.grossAmount,
      totalCost: sale.cost,
      count: 1,
    });
  });

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    averageTicket: Math.round(item.totalGrossSales / item.count),
  }));
}

function buildDailySales(context: AiQueryContext) {
  const grouped = new Map<
    string,
    { date: string; totalNetSales: number; totalGrossSales: number; count: number }
  >();

  context.sales.forEach((sale) => {
    const current = grouped.get(sale.saleDate);

    if (current) {
      current.totalNetSales += sale.netAmount;
      current.totalGrossSales += sale.grossAmount;
      current.count += 1;
      return;
    }

    grouped.set(sale.saleDate, {
      date: sale.saleDate,
      totalNetSales: sale.netAmount,
      totalGrossSales: sale.grossAmount,
      count: 1,
    });
  });

  return Array.from(grouped.values());
}

export function buildBusinessAIContext(context: AiQueryContext) {
  const activeBranchIds = [...new Set(context.sales.map((sale) => sale.branchId))];
  const branchScope =
    activeBranchIds.length === branches.length
      ? "Todas las sucursales"
      : activeBranchIds.map(
          (branchId) =>
            branches.find((branch) => branch.id === branchId)?.name ?? branchId
        );

  return {
    branchScope,
    salesCount: context.sales.length,
    expensesCount: context.expenses.length,
    utility: calcularUtilidadMes(context.sales, context.expenses),
    branches: calcularVentasPorSucursal(context.sales).map((item) => ({
      ...item,
      branchName:
        branches.find((branch) => branch.id === item.branchId)?.name ?? item.branchId,
    })),
    professionals: calcularVentasPorProfesional(context.sales).map((item) => ({
      ...item,
      professionalName:
        context.professionals.find(
          (professional) => professional.id === item.professionalId
        )?.name ?? item.professionalId,
    })),
    services: buildServiceSummaries(context),
    days: buildDailySales(context),
    expenses: context.expenses.map((expense) => ({
      branch: expense.branch,
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
    })),
    sales: context.sales.map((sale) => ({
      date: sale.saleDate,
      branch: sale.branch,
      client: sale.clientName,
      professionalId: sale.professionalId,
      professional:
        context.professionals.find(
          (professional) => professional.id === sale.professionalId
        )?.name ?? sale.professionalId,
      service: sale.service,
      total: sale.grossAmount,
      net: sale.netAmount,
      cost: sale.cost,
    })),
  };
}

