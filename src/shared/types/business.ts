export type BranchId = "house-of-hair" | "look-hair-extensions";
export type BranchFilter = "all" | BranchId;
export type BranchName = "House Of Hair" | "Look Hair Extensions";
export type FixedExpenseProrationMode = "calendar_days" | "operating_days";
export type ExpenseType = "fixed" | "variable";
export type ExpenseProrationMode = "calendar_days" | "operating_days";
export type PaymentStatus = "pending" | "partial" | "paid";

export type Branch = {
  id: BranchId;
  name: BranchName;
  city: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  monthlyTarget: number;
  openDays: number[];
  operatesOnSundays: boolean;
  fixedExpenseProrationMode: FixedExpenseProrationMode;
  fixedMonthlyExpenses: number;
  active: boolean;
};

export type CommissionType = "percentage" | "fixed";
export type ProfessionalCommissionMode =
  | "system_rules"
  | "percentage"
  | "fixed"
  | "mixed"
  | "none";

export type Professional = {
  id: string;
  name: string;
  branchIds: BranchId[];
  role: string;
  primaryBranchId?: BranchId | null;
  active: boolean;
  commissionMode: ProfessionalCommissionMode;
  commissionValue?: number;
  phone?: string;
  emergencyPhone?: string;
  email?: string;
  documentId?: string;
  notes?: string;
  avatarColor?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Sale = {
  id: string;
  branchId: BranchId;
  branch: BranchName;
  professionalId: string;
  customerId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
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
  type: ExpenseType;
  category: string;
  amount: number;
  monthlyAmount?: number;
  dailyAmount?: number;
  active: boolean;
  prorationMode?: ExpenseProrationMode;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  paidDate?: string;
  paymentMethod?: string;
  paymentNote?: string;
  paymentProofName?: string;
  paymentProofDataUrl?: string;
  dueDate?: string;
  balancePending?: number;
  expenseDate: string;
  createdAt: string;
  notes?: string;
  updatedAt?: string;
};
