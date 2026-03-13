export type BranchId = "house-of-hair" | "look-hair-extensions";
export type BranchFilter = "all" | BranchId;
export type BranchName = "House Of Hair" | "Look Hair Extensions";

export type Branch = {
  id: BranchId;
  name: BranchName;
  city: string;
  dailyTarget: number;
};

export type CommissionType = "percentage" | "fixed";

export type Professional = {
  id: string;
  name: string;
  branchIds: BranchId[];
  role: string;
};

export type Sale = {
  id: string;
  branchId: BranchId;
  branch: BranchName;
  professionalId: string;
  clientName: string;
  service: string;
  productName?: string;
  grossAmount: number;
  netAmount: number;
  commissionType: CommissionType;
  commissionValue: number;
  cost: number;
  saleDate: string;
  createdAt: string;
};

export type Expense = {
  id: string;
  branchId: BranchId;
  branch: BranchName;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  createdAt: string;
};
