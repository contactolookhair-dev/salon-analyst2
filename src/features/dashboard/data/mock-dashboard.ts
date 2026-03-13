import { branches } from "@/features/branches/data/mock-branches";
import {
  calcularUtilidadDia,
  calcularVentasPorProfesional,
} from "@/lib/finance";
import { filterExpensesByBranch, filterSalesByBranch } from "@/shared/lib/branch";
import type {
  BranchFilter,
  Expense,
  Professional,
  Sale,
} from "@/shared/types/business";

export type BusinessSnapshot = {
  branch: BranchFilter;
  sales: Sale[];
  expenses: Expense[];
  professionals: Professional[];
};

export const professionals: Professional[] = [
  {
    id: "ivanova",
    name: "Ivanova",
    branchIds: ["house-of-hair", "look-hair-extensions"],
    role: "Colorista Senior",
  },
  {
    id: "jenny",
    name: "Jenny",
    branchIds: ["house-of-hair"],
    role: "Especialista en Corte",
  },
  {
    id: "darling",
    name: "Darling",
    branchIds: ["look-hair-extensions"],
    role: "Extensionista",
  },
];

export const sales: Sale[] = [
  {
    id: "sale-1",
    branchId: "house-of-hair",
    branch: "House Of Hair",
    professionalId: "ivanova",
    clientName: "Camila R.",
    service: "Balayage Premium",
    productName: "Kit Balayage Care",
    grossAmount: 148000,
    netAmount: 124370,
    commissionType: "percentage",
    commissionValue: 0.4,
    cost: 22000,
    saleDate: "2026-03-03",
    createdAt: "09:15",
  },
  {
    id: "sale-2",
    branchId: "house-of-hair",
    branch: "House Of Hair",
    professionalId: "jenny",
    clientName: "Paula M.",
    service: "Corte + Brushing",
    productName: "Spray Thermo Shield",
    grossAmount: 42000,
    netAmount: 35294,
    commissionType: "fixed",
    commissionValue: 12000,
    cost: 4500,
    saleDate: "2026-03-08",
    createdAt: "11:30",
  },
  {
    id: "sale-3",
    branchId: "look-hair-extensions",
    branch: "Look Hair Extensions",
    professionalId: "darling",
    clientName: "Daniela T.",
    service: "Extensiones Full Set",
    productName: "Extension Care Serum",
    grossAmount: 265000,
    netAmount: 222689,
    commissionType: "percentage",
    commissionValue: 0.35,
    cost: 54000,
    saleDate: "2026-03-12",
    createdAt: "10:05",
  },
  {
    id: "sale-4",
    branchId: "look-hair-extensions",
    branch: "Look Hair Extensions",
    professionalId: "ivanova",
    clientName: "Fernanda S.",
    service: "Tratamiento Reparador",
    productName: "Kit Balayage Care",
    grossAmount: 64000,
    netAmount: 53782,
    commissionType: "fixed",
    commissionValue: 15000,
    cost: 9000,
    saleDate: "2026-03-12",
    createdAt: "13:10",
  },
];

export const expenses: Expense[] = [
  {
    id: "expense-1",
    branchId: "house-of-hair",
    branch: "House Of Hair",
    title: "Reposición de tintes",
    category: "Insumos",
    amount: 38500,
    expenseDate: "2026-03-02",
    createdAt: "08:45",
  },
  {
    id: "expense-2",
    branchId: "house-of-hair",
    branch: "House Of Hair",
    title: "Café clientes",
    category: "Atención",
    amount: 9800,
    expenseDate: "2026-03-08",
    createdAt: "12:05",
  },
  {
    id: "expense-3",
    branchId: "look-hair-extensions",
    branch: "Look Hair Extensions",
    title: "Compra de adhesivos",
    category: "Insumos",
    amount: 27400,
    expenseDate: "2026-03-11",
    createdAt: "09:35",
  },
];

export function getDashboardDataFromSnapshot(
  snapshot: BusinessSnapshot,
  branch: BranchFilter
) {
  const selectedBranch =
    branch === "all" ? null : branches.find((item) => item.id === branch);
  const branchSales = snapshot.sales;
  const branchExpenses = snapshot.expenses;
  const branchProfessionals = snapshot.professionals;
  const financialSummary = calcularUtilidadDia(branchSales, branchExpenses);
  const professionalTotals = calcularVentasPorProfesional(branchSales);
  const dailyTarget =
    branch === "all"
      ? branches.reduce((sum, item) => sum + item.dailyTarget, 0)
      : selectedBranch?.dailyTarget ?? 0;
  const progress = dailyTarget ? financialSummary.totalVentasNetas / dailyTarget : 0;

  const salesByProfessional = branchProfessionals.map((professional) => {
    const professionalSales = branchSales.filter(
      (sale) => sale.professionalId === professional.id
    );
    const totals = professionalTotals.find(
      (item) => item.professionalId === professional.id
    );

    return {
      professional,
      tickets: totals?.cantidadVentas ?? 0,
      netSales: totals?.totalVentasNetas ?? 0,
      commission: totals?.totalComisiones ?? 0,
      topService: professionalSales[0]?.service ?? "Sin ventas",
    };
  });

  return {
    branch: selectedBranch,
    branchLabel:
      branch === "all" ? "Todas las sucursales" : selectedBranch?.name ?? "Sucursal",
    metrics: {
      totalNetSales: financialSummary.totalVentasNetas,
      totalCommission: financialSummary.totalComisiones,
      totalCosts: financialSummary.totalCostosDirectos,
      totalExpenses: financialSummary.totalGastos,
      profit: financialSummary.utilidad,
      progress,
    },
    salesByProfessional,
    branchExpenses,
  };
}

export function getBusinessSnapshot(branch: BranchFilter) {
  return {
    branch,
    sales: filterSalesByBranch(sales, branch),
    expenses: filterExpensesByBranch(expenses, branch),
    professionals:
      branch === "all"
        ? professionals
        : professionals.filter((professional) => professional.branchIds.includes(branch)),
  };
}

export function getDashboardData(branch: BranchFilter) {
  return getDashboardDataFromSnapshot(getBusinessSnapshot(branch), branch);
}
