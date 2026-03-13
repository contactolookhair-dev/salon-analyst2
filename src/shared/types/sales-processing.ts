import type { BranchId, BranchName } from "@/shared/types/business";

export type CatalogItemType = "service" | "product";
export type CommissionRuleType = "percent" | "fixed";
export type QuantityUnit = "unit" | "pair" | "sheet" | "session";
export type MatchStatus =
  | "matched"
  | "pending_review"
  | "missing_commission_rule"
  | "missing_cost"
  | "missing_professional"
  | "missing_branch"
  | "service_not_found";

export type ReceiptSource = "fresha" | "agendapro" | "unknown";

export type ParsedReceiptItem = {
  rawName: string;
  quantity: number;
  unit?: QuantityUnit;
  lineTotal: number;
  notes?: string;
};

export type ParsedReceiptDocument = {
  source: ReceiptSource;
  date: string;
  branchName: string;
  professionalName: string;
  clientName: string;
  items: ParsedReceiptItem[];
  totalDocument: number;
  observations: string[];
  rawText: string;
};

export type BusinessCatalogItem = {
  id: string;
  name: string;
  normalizedName: string;
  aliases: string[];
  type: CatalogItemType;
  price: number;
  commissionType: CommissionRuleType | null;
  commissionValue: number | null;
  unitCost: number | null;
  quantityUnit: QuantityUnit;
  branchIds?: BranchId[];
};

export type ProcessedSaleItem = {
  rawName: string;
  normalizedName: string;
  matchedCatalogId: string | null;
  matchedCatalogName: string | null;
  type: CatalogItemType | null;
  quantity: number;
  quantityUnit: QuantityUnit;
  gross: number;
  net: number;
  vat: number;
  commissionType: CommissionRuleType | null;
  commissionValue: number | null;
  commissionAmount: number;
  unitCost: number | null;
  totalCost: number;
  profit: number;
  status: MatchStatus;
  warnings: string[];
};

export type ProcessedSale = {
  id: string;
  source: ReceiptSource;
  branchId: BranchId | null;
  branchName: BranchName | null;
  date: string;
  professionalId: string | null;
  professionalName: string | null;
  clientName: string;
  items: ProcessedSaleItem[];
  totals: {
    gross: number;
    net: number;
    vat: number;
    commission: number;
    cost: number;
    profit: number;
  };
  reviewRequired: boolean;
  warnings: string[];
  materials: {
    name: string;
    quantity: number;
    cost: number;
  }[];
};
