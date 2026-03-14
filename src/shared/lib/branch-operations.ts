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
  expense: Pick<Expense, "amount" | "monthlyAmount" | "prorationMode" | "type" | "active">,
  branch: Branch,
  date: Date
) {
  if (!expense.active) {
    return 0;
  }

  const monthlyAmount = expense.monthlyAmount ?? expense.amount;
  const mode: ExpenseProrationMode =
    expense.prorationMode ?? branch.fixedExpenseProrationMode;

  if (mode === "calendar_days") {
    return roundCurrency(
      monthlyAmount / getDaysInMonth(date.getUTCFullYear(), date.getUTCMonth())
    );
  }

  if (!isBranchOpenOnDate(branch, date)) {
    return 0;
  }

  const operatingDays = countOperatingDaysInMonth(branch, date);
  return operatingDays > 0 ? roundCurrency(monthlyAmount / operatingDays) : 0;
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
