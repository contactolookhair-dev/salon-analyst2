import {
  calcularComisionFija,
  calcularComisionPorcentaje,
} from "@/lib/finance/commissions";
import { roundCurrency } from "@/lib/finance/helpers";
import { calcularIVA, calcularNeto } from "@/lib/finance/tax";
import type {
  FinanceExpense,
  FinanceSale,
  PeriodProfitSummary,
  VentaUtilityBreakdown,
} from "@/lib/finance/types";

function resolveNetAmount(sale: FinanceSale) {
  return sale.netAmount ?? calcularNeto(sale.grossAmount);
}

export function calcularComisionVenta(sale: FinanceSale) {
  const montoNeto = resolveNetAmount(sale);

  if (sale.commissionType === "fixed") {
    return calcularComisionFija(sale.commissionValue);
  }

  return calcularComisionPorcentaje(montoNeto, sale.commissionValue);
}

export function calcularUtilidadVenta(
  montoBruto: number,
  porcentajeComision: number,
  costoDirecto: number
): VentaUtilityBreakdown {
  const montoNeto = calcularNeto(montoBruto);
  const iva = calcularIVA(montoBruto);
  const comision = calcularComisionPorcentaje(montoNeto, porcentajeComision);
  const utilidad = roundCurrency(montoNeto - comision - costoDirecto);

  return {
    montoBruto: roundCurrency(montoBruto),
    iva,
    montoNeto,
    comision,
    costoDirecto: roundCurrency(costoDirecto),
    utilidad,
  };
}

export function resumirUtilidadPeriodo(
  ventas: FinanceSale[],
  gastos: FinanceExpense[]
): PeriodProfitSummary {
  const totalVentasBrutas = ventas.reduce((sum, sale) => sum + sale.grossAmount, 0);
  const totalVentasNetas = ventas.reduce((sum, sale) => sum + resolveNetAmount(sale), 0);
  const totalComisiones = ventas.reduce(
    (sum, sale) => sum + calcularComisionVenta(sale),
    0
  );
  const totalCostosDirectos = ventas.reduce((sum, sale) => sum + sale.cost, 0);
  const totalGastos = gastos.reduce((sum, expense) => sum + expense.amount, 0);
  const utilidad = roundCurrency(
    totalVentasNetas - totalComisiones - totalCostosDirectos - totalGastos
  );

  return {
    totalVentasBrutas: roundCurrency(totalVentasBrutas),
    totalVentasNetas: roundCurrency(totalVentasNetas),
    totalComisiones: roundCurrency(totalComisiones),
    totalCostosDirectos: roundCurrency(totalCostosDirectos),
    totalGastos: roundCurrency(totalGastos),
    utilidad,
    cantidadVentas: ventas.length,
  };
}

export function calcularUtilidadDia(
  ventasDelDia: FinanceSale[],
  gastosDelDia: FinanceExpense[]
) {
  return resumirUtilidadPeriodo(ventasDelDia, gastosDelDia);
}

export function calcularUtilidadMes(
  ventasMes: FinanceSale[],
  gastosMes: FinanceExpense[]
) {
  return resumirUtilidadPeriodo(ventasMes, gastosMes);
}

