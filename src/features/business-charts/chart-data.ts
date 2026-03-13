import { calcularComisionVenta } from "@/lib/finance";
import type { BusinessSnapshot } from "@/features/dashboard/data/mock-dashboard";

function sortByAmountDescending<T extends { amount: number }>(items: T[]) {
  return [...items].sort((left, right) => right.amount - left.amount);
}

export function buildSalesChartData(snapshot: BusinessSnapshot) {
  const grouped = new Map<string, number>();

  snapshot.sales.forEach((sale) => {
    grouped.set(sale.saleDate, (grouped.get(sale.saleDate) ?? 0) + sale.netAmount);
  });

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, amount]) => ({
      date,
      amount,
    }));
}

export function buildProfitChartData(snapshot: BusinessSnapshot) {
  const grouped = new Map<string, number>();

  snapshot.sales.forEach((sale) => {
    const profit = sale.netAmount - calcularComisionVenta(sale) - sale.cost;
    grouped.set(sale.saleDate, (grouped.get(sale.saleDate) ?? 0) + profit);
  });

  snapshot.expenses.forEach((expense) => {
    grouped.set(
      expense.expenseDate,
      (grouped.get(expense.expenseDate) ?? 0) - expense.amount
    );
  });

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, amount]) => ({
      date,
      amount,
    }));
}

export function buildServicesChartData(snapshot: BusinessSnapshot) {
  const grouped = new Map<string, number>();

  snapshot.sales.forEach((sale) => {
    grouped.set(sale.service, (grouped.get(sale.service) ?? 0) + sale.netAmount);
  });

  return sortByAmountDescending(
    Array.from(grouped.entries()).map(([name, amount]) => ({
      name,
      amount,
    }))
  );
}

export function buildProfessionalsChartData(snapshot: BusinessSnapshot) {
  const professionalNameById = new Map(
    snapshot.professionals.map((professional) => [professional.id, professional.name])
  );
  const grouped = new Map<string, number>();

  snapshot.sales.forEach((sale) => {
    const label = professionalNameById.get(sale.professionalId) ?? sale.professionalId;
    grouped.set(label, (grouped.get(label) ?? 0) + sale.netAmount);
  });

  return sortByAmountDescending(
    Array.from(grouped.entries()).map(([name, amount]) => ({
      name,
      amount,
    }))
  );
}

