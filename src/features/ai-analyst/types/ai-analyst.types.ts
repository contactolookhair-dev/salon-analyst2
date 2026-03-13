import type { BranchId, Expense, Professional, Sale } from "@/shared/types/business";

export type InsightKind =
  | "servicio-mas-rentable"
  | "producto-mas-vendido"
  | "profesional-top"
  | "sucursal-mas-rentable"
  | "gasto-mas-alto"
  | "dia-mas-ventas"
  | "servicio-mejor-margen"
  | "servicio-menor-utilidad";

export type AiInsightCardData = {
  id: InsightKind;
  title: string;
  value: string;
  detail: string;
  badge: string;
};

export type AiStructuredInsights = {
  cards: AiInsightCardData[];
  topProfitableService: {
    service: string;
    utility: number;
    margin: number;
    branchId: BranchId;
  } | null;
  topSellingProduct: {
    productName: string;
    units: number;
    revenue: number;
  } | null;
  topProfessional: {
    professionalId: string;
    totalNetSales: number;
    utility: number;
  } | null;
  mostProfitableBranch: {
    branchId: BranchId;
    utility: number;
  } | null;
  highestExpense: Expense | null;
  topSalesDay: {
    date: string;
    totalNetSales: number;
    totalGrossSales: number;
    salesCount: number;
  } | null;
  bestMarginService: {
    service: string;
    margin: number;
    utility: number;
  } | null;
  lowestUtilityService: {
    service: string;
    utility: number;
    margin: number;
  } | null;
};

export type AiQueryContext = {
  sales: Sale[];
  expenses: Expense[];
  professionals: Professional[];
};

export type AiQueryResult = {
  question: string;
  answer: string;
  matchedRule: string;
  source?: "openai" | "local";
  model?: string | null;
};
