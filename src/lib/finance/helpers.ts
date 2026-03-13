export function roundCurrency(value: number) {
  return Math.round(value);
}

export function normalizePercentage(value: number) {
  if (value < 0) {
    throw new Error("El porcentaje no puede ser negativo.");
  }

  if (value <= 1) {
    return value;
  }

  return value / 100;
}

