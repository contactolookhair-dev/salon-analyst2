import type { CatalogItem } from "@/features/configuration/data/business-rules";
import type { BranchId, BranchName, Professional } from "@/shared/types/business";
import type { ReceiptSource } from "@/shared/types/sales-processing";

export type ReceiptDetectedItem = {
  id: string;
  name: string;
  type: "service" | "product" | "unknown";
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  warnings: string[];
  confidence: number;
};

export type ReceiptExtraction = {
  source: ReceiptSource;
  extractedBy: "text" | "ai" | "hybrid" | "manual";
  clientName: string | null;
  professionalName: string | null;
  branchName: string | null;
  receiptNumber: string | null;
  date: string | null;
  paymentMethod: string | null;
  subtotal: number | null;
  tax: number | null;
  grossTotal: number | null;
  netTotal: number | null;
  totalPaid: number | null;
  currency: string | null;
  items: ReceiptDetectedItem[];
  warnings: string[];
  confidence: number;
  rawText: string;
};

export type SaleLineDraftStatus = "ready" | "requires_review";
export type CatalogMatchType = "exact" | "normalized" | "suggested" | "unmatched";

export type SaleLineDraft = {
  id: string;
  inputName: string;
  normalizedName: string;
  matchedCatalogId: string | null;
  matchedCatalogName: string | null;
  itemType: "service" | "product" | "unknown";
  quantity: number;
  unitLabel: string;
  unitPrice: number;
  grossLineTotal: number;
  netLineTotal: number;
  vatAmount: number;
  commissionType: CatalogItem["commission_type"];
  commissionValue: number;
  commissionBase: CatalogItem["commission_base"] | "net";
  commissionAmount: number;
  unitCost: number;
  totalCost: number;
  profit: number;
  warnings: string[];
  status: SaleLineDraftStatus;
  catalogItem: CatalogItem | null;
  matchType: CatalogMatchType;
};

export type SaleDraft = {
  sourceMode: "scan" | "manual";
  sourceProvider: ReceiptSource;
  extractedBy: ReceiptExtraction["extractedBy"];
  clientName: string;
  professionalName: string;
  branchName: string;
  branchId: BranchId | null;
  receiptNumber: string;
  date: string;
  paymentMethod: string;
  currency: string;
  subtotal: number;
  tax: number;
  grossTotal: number;
  netTotal: number;
  totalPaid: number;
  items: SaleLineDraft[];
  warnings: string[];
  confidence: number;
  reviewRequired: boolean;
};

export type SaleDraftTotals = Pick<
  SaleDraft,
  "subtotal" | "tax" | "grossTotal" | "netTotal" | "totalPaid"
> & {
  commissionTotal: number;
  costTotal: number;
  profitTotal: number;
};

export type ParseReceiptApiSuccess = {
  success: true;
  data: {
    extraction: ReceiptExtraction;
    draft: SaleDraft;
    totals: SaleDraftTotals;
    context?: {
      preferredProfessionalApplied?: boolean;
      originalDetectedProfessionalName?: string | null;
      preferredBranchId?: BranchId | null;
      preferredBranchName?: string | null;
      originalDetectedBranchName?: string | null;
    };
  };
  warnings: string[];
};

export type ParseReceiptApiFailure = {
  success: false;
  error: string;
  warnings: string[];
  partial: {
    fileName?: string;
    source: ReceiptSource;
    extractedTextPreview: string;
    extraction: ReceiptExtraction | null;
  };
};

export type ParseReceiptApiResponse =
  | ParseReceiptApiSuccess
  | ParseReceiptApiFailure;

export type PersistedSalePayload = {
  date: string;
  branchName: BranchName | string;
  professionalName: string;
  professionalId?: string;
  clientName: string;
  serviceLabel: string;
  grossTotal: number;
  commissionTotal: number;
  profitTotal: number;
  receiptNumber?: string;
  confirmDuplicate?: boolean;
};

export type PreferredProfessionalContext = Pick<
  Professional,
  "id" | "name" | "branchIds" | "role" | "active"
>;

export type DuplicateSaleWarning = {
  severity: "high" | "medium";
  allowOverride: boolean;
  message: string;
  existingSale: {
    date: string;
    total: number;
    professional: string;
    clientName: string;
    service: string;
  };
};

export type SaveSaleApiResponse =
  | {
      success: true;
      message: string;
      sale?: unknown;
    }
  | {
      success: false;
      error: string;
      duplicate?: DuplicateSaleWarning;
    };
