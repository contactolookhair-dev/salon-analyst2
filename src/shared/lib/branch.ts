import { branches } from "@/features/branches/data/mock-branches";
import type {
  BranchFilter,
  BranchId,
  BranchName,
  Expense,
  Sale,
} from "@/shared/types/business";

export function getBranchName(branchId: BranchId): BranchName {
  return branches.find((branch) => branch.id === branchId)?.name ?? "House Of Hair";
}

export function filterSalesByBranch(sales: Sale[], branch: BranchFilter) {
  if (branch === "all") {
    return sales;
  }

  return sales.filter((sale) => sale.branchId === branch);
}

export function filterExpensesByBranch(expenses: Expense[], branch: BranchFilter) {
  if (branch === "all") {
    return expenses;
  }

  return expenses.filter((expense) => expense.branchId === branch);
}

