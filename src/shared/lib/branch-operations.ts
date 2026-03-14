import { branches as baseBranches } from "@/features/branches/data/mock-branches";
import type {
  Branch,
  BranchFilter,
  BranchId,
  Expense,
  ExpenseProrationMode,
} from "@/shared/types/business";
import { roundCurrency } from "@/lib/finance/helpers";

export function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function isBranchOpenOnDate(branch: Branch, date: Date) {
  const weekday = date.getUTCDay();
  return branch.active && branch.openDays.includes(weekday);
}

export function countOperatingDaysInMonth(branch: Branch, date: Date) {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const daysInMonth = getDaysInMonth(year, monthIndex);
  let operatingDays = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const currentDate = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));

    if (isBranchOpenOnDate(branch, currentDate)) {
      operatingDays += 1;
    }
  }

  return operatingDays;
}

function countRemainingOperatingDaysInMonth(branch: Branch, date: Date) {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const daysInMonth = getDaysInMonth(year, monthIndex);
  let operatingDays = 0;

  for (let day = date.getUTCDate(); day <= daysInMonth; day += 1) {
    const currentDate = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));

    if (isBranchOpenOnDate(branch, currentDate)) {
      operatingDays += 1;
    }
  }

  return operatingDays;
}

export function getDailyTarget(branch: Branch, date: Date) {
  if (!isBranchOpenOnDate(branch, date)) {
    return 0;
  }

  const operatingDays = countOperatingDaysInMonth(branch, date);
  return operatingDays > 0
    ? roundCurrency(branch.monthlyTarget / operatingDays)
    : 0;
}

export function getDailyFixedExpense(branch: Branch, date: Date) {
  const calendarDays = getDaysInMonth(date.getUTCFullYear(), date.getUTCMonth());

  if (branch.fixedExpenseProrationMode === "calendar_days") {
    return roundCurrency(branch.fixedMonthlyExpenses / calendarDays);
  }

  if (!isBranchOpenOnDate(branch, date)) {
    return 0;
  }

  const operatingDays = countOperatingDaysInMonth(branch, date);
  return operatingDays > 0
    ? roundCurrency(branch.fixedMonthlyExpenses / operatingDays)
    : 0;
}

export function getDailyExpenseQuota(
  expense: Pick<
    Expense,
    | "amount"
    | "monthlyAmount"
    | "prorationMode"
    | "type"
    | "active"
    | "paymentStatus"
    | "paidAmount"
    | "paidDate"
    | "balancePending"
  >,
  branch: Branch,
  date: Date
) {
  if (!expense.active) {
    return 0;
  }

  const monthlyAmount = expense.monthlyAmount ?? expense.amount;
  const paidDate = expense.paidDate
    ? new Date(`${expense.paidDate}T12:00:00.000Z`)
    : null;
  const paidOnOrBeforeCurrentDate =
    paidDate !== null && paidDate.getTime() <= date.getTime();
  const pendingAmount =
    expense.balancePending ??
    Math.max(monthlyAmount - (expense.paidAmount ?? 0), 0);
  const mode: ExpenseProrationMode =
    expense.prorationMode ?? branch.fixedExpenseProrationMode;

  if (
    expense.paymentStatus === "paid" &&
    paidOnOrBeforeCurrentDate
  ) {
    return 0;
  }

  const baseAmount =
    expense.paymentStatus === "partial" && paidOnOrBeforeCurrentDate
      ? pendingAmount
      : monthlyAmount;

  if (baseAmount <= 0) {
    return 0;
  }

  if (mode === "calendar_days") {
    const divisor =
      expense.paymentStatus === "partial" && paidOnOrBeforeCurrentDate
        ? Math.max(
            getDaysInMonth(date.getUTCFullYear(), date.getUTCMonth()) -
              date.getUTCDate() +
              1,
            1
          )
        : getDaysInMonth(date.getUTCFullYear(), date.getUTCMonth());

    return roundCurrency(
      baseAmount / divisor
    );
  }

  if (!isBranchOpenOnDate(branch, date)) {
    return 0;
  }

  const operatingDays =
    expense.paymentStatus === "partial" && paidOnOrBeforeCurrentDate
      ? countRemainingOperatingDaysInMonth(branch, date)
      : countOperatingDaysInMonth(branch, date);

  return operatingDays > 0 ? roundCurrency(baseAmount / operatingDays) : 0;
}

export function getBranchStatus(branch: Branch, date: Date) {
  return isBranchOpenOnDate(branch, date) ? "open" : "closed";
}

export function getBranchById(branchId: BranchId, branches: Branch[] = baseBranches) {
  return branches.find((branch) => branch.id === branchId) ?? null;
}

export function getBranchesForFilter(
  branch: BranchFilter,
  branches: Branch[] = baseBranches
) {
  return branch === "all"
    ? branches.filter((item) => item.active)
    : branches.filter((item) => item.id === branch && item.active);
}
