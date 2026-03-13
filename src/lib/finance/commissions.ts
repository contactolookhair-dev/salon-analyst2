import { normalizePercentage, roundCurrency } from "@/lib/finance/helpers";

export function calcularComisionPorcentaje(
  montoNeto: number,
  porcentaje: number
) {
  const porcentajeNormalizado = normalizePercentage(porcentaje);

  return roundCurrency(montoNeto * porcentajeNormalizado);
}

export function calcularComisionFija(monto: number) {
  return roundCurrency(monto);
}

