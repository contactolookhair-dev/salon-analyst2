import type { BranchName } from "@/shared/types/business";

export type ReceiptProvider = "fresha" | "agendapro";

export type ParsedReceiptSale = {
  date: string;
  branch: BranchName;
  professional: string;
  client: string;
  service: string;
  price: number;
  total: number;
};

export type ParsedReceiptResult = {
  provider: ReceiptProvider;
  sale: ParsedReceiptSale;
  rawText: string;
};

