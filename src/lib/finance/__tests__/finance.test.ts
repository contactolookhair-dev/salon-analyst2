import { describe, expect, it } from "vitest";

import { expenses, sales } from "@/features/dashboard/data/mock-dashboard";
import {
  calcularComisionFija,
  calcularComisionPorcentaje,
  calcularIVA,
  calcularNeto,
  calcularUtilidadDia,
  calcularUtilidadMes,
  calcularUtilidadVenta,
  calcularVentasPorProfesional,
  calcularVentasPorSucursal,
} from "@/lib/finance";

describe("motor financiero", () => {
  it("calcula IVA y neto correctamente sobre un monto bruto", () => {
    expect(calcularIVA(119000)).toBe(19000);
    expect(calcularNeto(119000)).toBe(100000);
  });

  it("calcula comisiones por porcentaje y fijas", () => {
    expect(calcularComisionPorcentaje(100000, 0.3)).toBe(30000);
    expect(calcularComisionPorcentaje(100000, 30)).toBe(30000);
    expect(calcularComisionFija(12000)).toBe(12000);
  });

  it("calcula la utilidad base de una venta", () => {
    expect(calcularUtilidadVenta(119000, 30, 0)).toEqual({
      montoBruto: 119000,
      iva: 19000,
      montoNeto: 100000,
      comision: 30000,
      costoDirecto: 0,
      utilidad: 70000,
    });
  });

  it("resume utilidad del dia y del mes con los mocks", () => {
    expect(calcularUtilidadDia(sales, expenses)).toEqual({
      totalVentasBrutas: 519000,
      totalVentasNetas: 436135,
      totalComisiones: 154689,
      totalCostosDirectos: 89500,
      totalGastos: 75700,
      utilidad: 116246,
      cantidadVentas: 4,
    });

    expect(calcularUtilidadMes(sales, expenses)).toEqual({
      totalVentasBrutas: 519000,
      totalVentasNetas: 436135,
      totalComisiones: 154689,
      totalCostosDirectos: 89500,
      totalGastos: 75700,
      utilidad: 116246,
      cantidadVentas: 4,
    });
  });

  it("agrupa ventas por profesional", () => {
    expect(calcularVentasPorProfesional(sales)).toEqual([
      {
        professionalId: "ivanova",
        totalVentasBrutas: 212000,
        totalVentasNetas: 178152,
        totalComisiones: 64748,
        totalCostosDirectos: 31000,
        utilidad: 82404,
        cantidadVentas: 2,
      },
      {
        professionalId: "jenny",
        totalVentasBrutas: 42000,
        totalVentasNetas: 35294,
        totalComisiones: 12000,
        totalCostosDirectos: 4500,
        utilidad: 18794,
        cantidadVentas: 1,
      },
      {
        professionalId: "darling",
        totalVentasBrutas: 265000,
        totalVentasNetas: 222689,
        totalComisiones: 77941,
        totalCostosDirectos: 54000,
        utilidad: 90748,
        cantidadVentas: 1,
      },
    ]);
  });

  it("agrupa ventas por sucursal", () => {
    expect(calcularVentasPorSucursal(sales)).toEqual([
      {
        branchId: "house-of-hair",
        totalVentasBrutas: 190000,
        totalVentasNetas: 159664,
        totalComisiones: 61748,
        totalCostosDirectos: 26500,
        utilidad: 71416,
        cantidadVentas: 2,
      },
      {
        branchId: "look-hair-extensions",
        totalVentasBrutas: 329000,
        totalVentasNetas: 276471,
        totalComisiones: 92941,
        totalCostosDirectos: 63000,
        utilidad: 120530,
        cantidadVentas: 2,
      },
    ]);
  });
});
