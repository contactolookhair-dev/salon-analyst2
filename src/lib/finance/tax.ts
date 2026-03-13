import { IVA_CHILE } from "@/lib/finance/constants";
import { roundCurrency } from "@/lib/finance/helpers";

export function calcularNeto(montoBruto: number) {
  return roundCurrency(montoBruto / (1 + IVA_CHILE));
}

export function calcularIVA(montoBruto: number) {
  const montoNeto = calcularNeto(montoBruto);

  return roundCurrency(montoBruto - montoNeto);
}

