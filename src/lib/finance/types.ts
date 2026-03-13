import type { BranchId, CommissionType } from "@/shared/types/business";

export type FinanceExpense = {
  amount: number;
};

export type FinanceSale = {
  id: string;
  branchId: BranchId;
  professionalId: string;
  grossAmount: number;
  netAmount?: number;
  commissionType: CommissionType;
  commissionValue: number;
  cost: number;
};

export type VentaUtilityBreakdown = {
  montoBruto: number;
  iva: number;
  montoNeto: number;
  comision: number;
  costoDirecto: number;
  utilidad: number;
};

export type PeriodProfitSummary = {
  totalVentasBrutas: number;
  totalVentasNetas: number;
  totalComisiones: number;
  totalCostosDirectos: number;
  totalGastos: number;
  utilidad: number;
  cantidadVentas: number;
};

export type SalesByProfessional = {
  professionalId: string;
  totalVentasBrutas: number;
  totalVentasNetas: number;
  totalComisiones: number;
  totalCostosDirectos: number;
  utilidad: number;
  cantidadVentas: number;
};

export type SalesByBranch = {
  branchId: BranchId;
  totalVentasBrutas: number;
  totalVentasNetas: number;
  totalComisiones: number;
  totalCostosDirectos: number;
  utilidad: number;
  cantidadVentas: number;
};

