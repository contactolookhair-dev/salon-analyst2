import { branches } from "@/features/branches/data/mock-branches";
import {
  calcularUtilidadDia,
  calcularVentasPorProfesional,
} from "@/lib/finance";
import {
  countOperatingDaysInMonth,
  getDailyExpenseQuota,
  getDaysInMonth,
  getBranchesForFilter,
  getBranchStatus,
  getDailyTarget,
} from "@/shared/lib/branch-operations";
import { getTodayChileDateString } from "@/shared/lib/safe-date";
import { filterExpensesByBranch, filterSalesByBranch } from "@/shared/lib/branch";
import type {
  Branch,
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
    primaryBranchId: "house-of-hair",
    active: true,
    commissionMode: "system_rules",
    avatarColor: "#7c6f4f",
  },
  {
    id: "jenny",
    name: "Jenny",
    branchIds: ["house-of-hair"],
    role: "Especialista en Corte",
    primaryBranchId: "house-of-hair",
    active: true,
    commissionMode: "system_rules",
    avatarColor: "#9f7a5a",
  },
  {
    id: "darling",
    name: "Darling",
    branchIds: ["look-hair-extensions"],
    role: "Extensionista",
    primaryBranchId: "look-hair-extensions",
    active: true,
    commissionMode: "system_rules",
    avatarColor: "#546b5f",
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
    type: "variable",
    category: "Insumos",
    amount: 38500,
    active: true,
    expenseDate: "2026-03-02",
    createdAt: "08:45",
  },
  {
    id: "expense-2",
    branchId: "house-of-hair",
    branch: "House Of Hair",
    title: "Café clientes",
    type: "variable",
    category: "Atención",
    amount: 9800,
    active: true,
    expenseDate: "2026-03-08",
    createdAt: "12:05",
  },
  {
    id: "expense-3",
    branchId: "look-hair-extensions",
    branch: "Look Hair Extensions",
    title: "Compra de adhesivos",
    type: "variable",
    category: "Insumos",
    amount: 27400,
    active: true,
    expenseDate: "2026-03-11",
    createdAt: "09:35",
  },
  {
    id: "fixed-expense-1",
    branchId: "house-of-hair",
    branch: "House Of Hair",
    title: "Arriendo",
    type: "fixed",
    category: "Arriendo",
    amount: 1800000,
    monthlyAmount: 1800000,
    active: true,
    prorationMode: "calendar_days",
    expenseDate: "2026-03-01",
    createdAt: "00:00",
  },
  {
    id: "fixed-expense-2",
    branchId: "look-hair-extensions",
    branch: "Look Hair Extensions",
    title: "Software",
    type: "fixed",
    category: "Software",
    amount: 240000,
    monthlyAmount: 240000,
    active: true,
    prorationMode: "calendar_days",
    expenseDate: "2026-03-01",
    createdAt: "00:00",
  },
];

export function getDashboardDataFromSnapshot(
  snapshot: BusinessSnapshot,
  branch: BranchFilter,
  branchConfigs: Branch[] = branches
) {
  const selectedBranch =
    branch === "all" ? null : branchConfigs.find((item) => item.id === branch);
  const today = getTodayChileDateString();
  const currentDate = new Date(`${today}T12:00:00.000Z`);
  const activeBranches = getBranchesForFilter(branch, branchConfigs);
  const branchSales = snapshot.sales.filter((sale) => sale.saleDate === today);
  const variableExpenses = snapshot.expenses.filter(
    (expense) => expense.expenseDate === today && expense.type === "variable"
  );
  const configuredFixedExpenses = snapshot.expenses.filter(
    (expense) => expense.type === "fixed" && expense.active
  );
  const fixedExpensesByBranch = new Map<string, Expense[]>();

  configuredFixedExpenses.forEach((expense) => {
    const branchItems = fixedExpensesByBranch.get(expense.branchId) ?? [];
    branchItems.push(expense);
    fixedExpensesByBranch.set(expense.branchId, branchItems);
  });

  const fixedExpenseItems: Expense[] = configuredFixedExpenses.reduce<Expense[]>(
    (items, expense) => {
      if (expense.expenseDate > today) {
        return items;
      }

      const branchConfig = branchConfigs.find((item) => item.id === expense.branchId);

      if (!branchConfig) {
        return items;
      }

      const dailyAmount = getDailyExpenseQuota(expense, branchConfig, currentDate);

      if (dailyAmount <= 0) {
        return items;
      }

      items.push({
        ...expense,
        id: `${expense.id}-${today}`,
        amount: dailyAmount,
        dailyAmount,
        createdAt: "00:00",
      });

      return items;
    },
    []
  );
  const fixedFallbackItems: Expense[] = activeBranches.reduce<Expense[]>(
    (items, branchConfig) => {
      if ((fixedExpensesByBranch.get(branchConfig.id)?.length ?? 0) > 0) {
        return items;
      }

      const amount = Math.round(
        branchConfig.fixedMonthlyExpenses /
          getDaysInMonth(currentDate.getUTCFullYear(), currentDate.getUTCMonth())
      );

      if (amount <= 0) {
        return items;
      }

      items.push({
        id: `fixed-${branchConfig.id}-${today}`,
        branchId: branchConfig.id,
        branch: branchConfig.name,
        title: "Prorrateo gastos fijos",
        type: "fixed",
        active: true,
        category:
          branchConfig.fixedExpenseProrationMode === "calendar_days"
            ? "Fijo · calendario"
            : "Fijo · operativo",
        amount,
        monthlyAmount: branchConfig.fixedMonthlyExpenses,
        dailyAmount: amount,
        prorationMode: branchConfig.fixedExpenseProrationMode,
        expenseDate: today,
        createdAt: "00:00",
      });

      return items;
    },
    []
  );
  const branchExpenses = [...variableExpenses, ...fixedExpenseItems, ...fixedFallbackItems];
  const branchProfessionals = snapshot.professionals;
  const financialSummary = calcularUtilidadDia(branchSales, branchExpenses);
  const professionalTotals = calcularVentasPorProfesional(branchSales);
  const dailyTarget = activeBranches.reduce(
    (sum, item) => sum + getDailyTarget(item, currentDate),
    0
  );
  const progress = dailyTarget ? financialSummary.totalVentasNetas / dailyTarget : 0;
  const openBranchesToday = activeBranches.filter(
    (item) => getBranchStatus(item, currentDate) === "open"
  );
  const isClosedToday =
    branch === "all"
      ? activeBranches.every((item) => getBranchStatus(item, currentDate) === "closed")
      : selectedBranch
        ? getBranchStatus(selectedBranch, currentDate) === "closed"
        : false;
  const commercialTargetApplies =
    branch === "all" ? openBranchesToday.length > 0 : !isClosedToday;
  const totalOperatingDays = activeBranches.reduce(
    (sum, item) => sum + countOperatingDaysInMonth(item, currentDate),
    0
  );
  const totalMonthlyTarget = activeBranches.reduce(
    (sum, item) => sum + item.monthlyTarget,
    0
  );

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
      dailyTarget,
      monthlyTarget: totalMonthlyTarget,
      operatingDaysInMonth: totalOperatingDays,
      isClosedToday,
      commercialTargetApplies,
      today,
      fixedExpensesToday: [...fixedExpenseItems, ...fixedFallbackItems].reduce(
        (sum, item) => sum + item.amount,
        0
      ),
      recurringExpensesToday: 0,
      monthlyFixedExpenses: configuredFixedExpenses.reduce(
        (sum, item) => sum + (item.monthlyAmount ?? item.amount),
        0
      ) ||
        activeBranches.reduce((sum, item) => sum + item.fixedMonthlyExpenses, 0),
      accountingResult: financialSummary.utilidad,
      commercialStatusLabel: isClosedToday
        ? "Meta comercial no aplica"
        : branch === "all" && openBranchesToday.length !== activeBranches.length
          ? "Operacion mixta segun sucursal"
          : "Meta comercial exigible",
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
