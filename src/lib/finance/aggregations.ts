import { roundCurrency } from "@/lib/finance/helpers";
import { calcularComisionVenta } from "@/lib/finance/profit";
import { calcularNeto } from "@/lib/finance/tax";
import type {
  FinanceSale,
  SalesByBranch,
  SalesByProfessional,
} from "@/lib/finance/types";

function resolveNetAmount(sale: FinanceSale) {
  return sale.netAmount ?? calcularNeto(sale.grossAmount);
}

export function calcularVentasPorProfesional(
  ventas: FinanceSale[]
): SalesByProfessional[] {
  const grouped = new Map<string, SalesByProfessional>();

  ventas.forEach((sale) => {
    const existing = grouped.get(sale.professionalId);
    const netAmount = resolveNetAmount(sale);
    const commission = calcularComisionVenta(sale);
    const utility = roundCurrency(netAmount - commission - sale.cost);

    if (existing) {
      existing.totalVentasBrutas = roundCurrency(
        existing.totalVentasBrutas + sale.grossAmount
      );
      existing.totalVentasNetas = roundCurrency(existing.totalVentasNetas + netAmount);
      existing.totalComisiones = roundCurrency(
        existing.totalComisiones + commission
      );
      existing.totalCostosDirectos = roundCurrency(
        existing.totalCostosDirectos + sale.cost
      );
      existing.utilidad = roundCurrency(existing.utilidad + utility);
      existing.cantidadVentas += 1;
      return;
    }

    grouped.set(sale.professionalId, {
      professionalId: sale.professionalId,
      totalVentasBrutas: roundCurrency(sale.grossAmount),
      totalVentasNetas: roundCurrency(netAmount),
      totalComisiones: roundCurrency(commission),
      totalCostosDirectos: roundCurrency(sale.cost),
      utilidad: roundCurrency(utility),
      cantidadVentas: 1,
    });
  });

  return Array.from(grouped.values());
}

export function calcularVentasPorSucursal(ventas: FinanceSale[]): SalesByBranch[] {
  const grouped = new Map<string, SalesByBranch>();

  ventas.forEach((sale) => {
    const existing = grouped.get(sale.branchId);
    const netAmount = resolveNetAmount(sale);
    const commission = calcularComisionVenta(sale);
    const utility = roundCurrency(netAmount - commission - sale.cost);

    if (existing) {
      existing.totalVentasBrutas = roundCurrency(
        existing.totalVentasBrutas + sale.grossAmount
      );
      existing.totalVentasNetas = roundCurrency(existing.totalVentasNetas + netAmount);
      existing.totalComisiones = roundCurrency(
        existing.totalComisiones + commission
      );
      existing.totalCostosDirectos = roundCurrency(
        existing.totalCostosDirectos + sale.cost
      );
      existing.utilidad = roundCurrency(existing.utilidad + utility);
      existing.cantidadVentas += 1;
      return;
    }

    grouped.set(sale.branchId, {
      branchId: sale.branchId,
      totalVentasBrutas: roundCurrency(sale.grossAmount),
      totalVentasNetas: roundCurrency(netAmount),
      totalComisiones: roundCurrency(commission),
      totalCostosDirectos: roundCurrency(sale.cost),
      utilidad: roundCurrency(utility),
      cantidadVentas: 1,
    });
  });

  return Array.from(grouped.values());
}

