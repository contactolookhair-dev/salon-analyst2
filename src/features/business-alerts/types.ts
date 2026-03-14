import type { BranchFilter } from "@/shared/types/business";

export type BusinessAlertSeverity = "critical" | "warning" | "info" | "success";
export type BusinessAlertCategory =
  | "profitability"
  | "operations"
  | "team"
  | "sales"
  | "inventory"
  | "predictive";

export type BusinessAlert = {
  id: string;
  type: string;
  category: BusinessAlertCategory;
  severity: BusinessAlertSeverity;
  title: string;
  message: string;
  recommendation?: string;
  branch?: BranchFilter | string;
  professional?: string;
  amount?: number;
  percent?: number;
  isPredictive: boolean;
  shouldPush: boolean;
  pushTitle?: string;
  pushBody?: string;
  createdAt: string;
};
