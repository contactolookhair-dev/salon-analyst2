import { inventoryItems } from "@/features/inventory/data/mock-inventory";
import type { BusinessSnapshot } from "@/features/dashboard/data/mock-dashboard";
import type { BusinessAlert } from "@/features/business-alerts/types";
import type { BranchFilter } from "@/shared/types/business";

const BUSINESS_ALERT_CREATED_AT = "2026-03-14T12:00:00.000Z";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

function getLatestDate(snapshot: BusinessSnapshot) {
  const sales = Array.isArray(snapshot.sales) ? snapshot.sales : [];

  return [...new Set(sales.map((sale) => sale.saleDate))]
    .sort()
    .at(-1);
}

function createAlert(input: Omit<BusinessAlert, "createdAt">): BusinessAlert {
  return {
    ...input,
    createdAt: BUSINESS_ALERT_CREATED_AT,
  };
}

function calculateDailyProjection(snapshot: BusinessSnapshot, date: string) {
  const sales = Array.isArray(snapshot.sales) ? snapshot.sales : [];
  const todaySales = sales.filter((sale) => sale.saleDate === date);
  const gross = todaySales.reduce((sum, sale) => sum + sale.grossAmount, 0);
  const net = todaySales.reduce((sum, sale) => sum + sale.netAmount, 0);
  const commission = todaySales.reduce((sum, sale) => sum + sale.commissionValue, 0);
  const cost = todaySales.reduce((sum, sale) => sum + sale.cost, 0);
  const profit = net - commission - cost;
  const lastHour =
    todaySales
      .map((sale) => Number.parseInt(sale.createdAt.split(":")[0] ?? "20", 10))
      .sort((a, b) => b - a)[0] ?? 20;
  const elapsedHours = Math.max(lastHour - 8, 1);
  const projectionFactor = Math.max(12 / elapsedHours, 1);

  return {
    gross,
    net,
    commission,
    cost,
    profit,
    projectedGross: gross * projectionFactor,
    projectedProfit: profit * projectionFactor,
    projectedCommission: commission * projectionFactor,
  };
}

function calculateMonthlyProjection(snapshot: BusinessSnapshot) {
  const sales = Array.isArray(snapshot.sales) ? snapshot.sales : [];
  const salesByDate = [...new Set(sales.map((sale) => sale.saleDate))].sort();
  const activeDays = salesByDate.length || 1;
  const totalGross = sales.reduce((sum, sale) => sum + sale.grossAmount, 0);
  const totalNet = sales.reduce((sum, sale) => sum + sale.netAmount, 0);
  const totalCommission = sales.reduce((sum, sale) => sum + sale.commissionValue, 0);
  const totalCost = sales.reduce((sum, sale) => sum + sale.cost, 0);
  const totalProfit = totalNet - totalCommission - totalCost;

  return {
    averageGrossPerDay: totalGross / activeDays,
    averageProfitPerDay: totalProfit / activeDays,
    projectedGross: (totalGross / activeDays) * 30,
    projectedProfit: (totalProfit / activeDays) * 30,
    commissionRatio: totalNet > 0 ? totalCommission / totalNet : 0,
  };
}

function calculateWeeklyDrop(snapshot: BusinessSnapshot) {
  const sales = Array.isArray(snapshot.sales) ? snapshot.sales : [];
  const dates = [...new Set(sales.map((sale) => sale.saleDate))].sort();
  const latestSeven = dates.slice(-7);
  const previousSeven = dates.slice(-14, -7);

  if (!latestSeven.length || !previousSeven.length) {
    return null;
  }

  const latestGross = sales
    .filter((sale) => latestSeven.includes(sale.saleDate))
    .reduce((sum, sale) => sum + sale.grossAmount, 0);
  const previousGross = sales
    .filter((sale) => previousSeven.includes(sale.saleDate))
    .reduce((sum, sale) => sum + sale.grossAmount, 0);

  if (previousGross <= 0) {
    return null;
  }

  return (latestGross - previousGross) / previousGross;
}

function calculateInventoryAlerts(snapshot: BusinessSnapshot, branch: BranchFilter) {
  const sales = Array.isArray(snapshot.sales) ? snapshot.sales : [];

  return inventoryItems
    .filter((item) => branch === "all" || item.branchId === branch)
    .map((item) => {
      const last30DaysSales = sales.filter(
        (sale) =>
          sale.branchId === item.branchId &&
          (sale.productName === item.name || sale.service === item.name)
      );

      const dailyRate = last30DaysSales.length / 30;

      if (dailyRate <= 0) {
        return null;
      }

      const daysUntilEmpty = item.currentStock / dailyRate;

      if (daysUntilEmpty > 7) {
        return null;
      }

      return createAlert({
        id: `inventory-${item.id}`,
        type: "inventory_stockout_projection",
        category: "inventory",
        severity: daysUntilEmpty <= 4 ? "critical" : "warning",
        title: `Stock proyectado bajo para ${item.name}`,
        message: `${item.name} podría agotarse en ${Math.ceil(daysUntilEmpty)} días al ritmo actual.`,
        recommendation:
          "Revisa reposición, punto de pedido y velocidad real de salida antes de que se produzca quiebre.",
        branch: item.branchId,
        amount: item.currentStock,
        isPredictive: true,
        shouldPush: true,
        pushTitle: "Alerta de stock proyectado",
        pushBody: `${item.name} podría agotarse en ${Math.ceil(daysUntilEmpty)} días.`,
      });
    })
    .filter((item): item is BusinessAlert => Boolean(item));
}

export function analyzeBusinessAlerts(
  snapshot: BusinessSnapshot,
  branch: BranchFilter
) {
  const safeSnapshot = {
    ...snapshot,
    sales: Array.isArray(snapshot.sales) ? snapshot.sales : [],
    expenses: Array.isArray(snapshot.expenses) ? snapshot.expenses : [],
    professionals: Array.isArray(snapshot.professionals) ? snapshot.professionals : [],
  };
  const latestDate = getLatestDate(safeSnapshot);

  if (!latestDate) {
    return {
      current: [] as BusinessAlert[],
      predictive: [] as BusinessAlert[],
    };
  }

  const currentDaySales = safeSnapshot.sales.filter((sale) => sale.saleDate === latestDate);
  const knownProfessionalIds = new Set(
    safeSnapshot.professionals.map((professional) => professional.id)
  );
  const currentAlerts: BusinessAlert[] = [];

  if (currentDaySales.some((sale) => !knownProfessionalIds.has(sale.professionalId))) {
    currentAlerts.push(
      createAlert({
        id: "operations-sale-missing-professional",
        type: "sale_missing_professional",
        category: "operations",
        severity: "critical",
        title: "Venta sin profesional válido",
        message:
          "Hay ventas recientes con profesional faltante o no reconocido en la base actual.",
        recommendation:
          "Revisa el registro de ventas y reasigna el profesional antes de cerrar comisiones.",
        isPredictive: false,
        shouldPush: true,
        pushTitle: "Alerta crítica de ventas",
        pushBody: "Hay ventas sin profesional válido en el sistema.",
      })
    );
  }

  if (currentDaySales.some((sale) => sale.cost <= 0)) {
    currentAlerts.push(
      createAlert({
        id: "operations-product-missing-cost",
        type: "product_missing_cost",
        category: "operations",
        severity: "critical",
        title: "Producto o servicio sin costo configurado",
        message:
          "Se detectaron ventas con costo cero o faltante, lo que puede distorsionar la utilidad real.",
        recommendation:
          "Completa costos en el catálogo antes de consolidar el análisis del negocio.",
        isPredictive: false,
        shouldPush: true,
        pushTitle: "Costo faltante detectado",
        pushBody: "Hay ventas con costo faltante o igual a cero.",
      })
    );
  }

  const dailyProjection = calculateDailyProjection(safeSnapshot, latestDate);
  const monthlyProjection = calculateMonthlyProjection(safeSnapshot);
  const weeklyDrop = calculateWeeklyDrop(safeSnapshot);
  const predictiveAlerts: BusinessAlert[] = [];
  const projectedProfitMargin =
    dailyProjection.projectedGross > 0
      ? dailyProjection.projectedProfit / (dailyProjection.projectedGross / 1.19)
      : 0;

  if (projectedProfitMargin > 0 && projectedProfitMargin < 0.12) {
    predictiveAlerts.push(
      createAlert({
        id: "predictive-daily-profitability-low",
        type: "daily_profitability_projection_low",
        category: "predictive",
        severity: "warning",
        title: "Utilidad proyectada del día bajo el mínimo esperado",
        message: `Si mantienes este ritmo, la utilidad de hoy cerrará cerca de ${formatPercent(projectedProfitMargin)}.`,
        recommendation:
          "Protege ticket medio, revisa descuentos y evita costos extra en la segunda mitad del día.",
        amount: dailyProjection.projectedProfit,
        percent: projectedProfitMargin,
        isPredictive: true,
        shouldPush: true,
        pushTitle: "Utilidad proyectada baja",
        pushBody: `La utilidad proyectada del día cerraría cerca de ${formatPercent(projectedProfitMargin)}.`,
      })
    );
  }

  if (monthlyProjection.projectedProfit < 2500000) {
    predictiveAlerts.push(
      createAlert({
        id: "predictive-monthly-profitability-low",
        type: "monthly_profitability_projection_low",
        category: "profitability",
        severity: "warning",
        title: "Utilidad proyectada mensual menor al objetivo",
        message: `La tendencia actual proyecta una utilidad mensual cercana a ${formatCurrency(monthlyProjection.projectedProfit)}.`,
        recommendation:
          "Revisa margen de servicios principales y gasto variable para recuperar cierre mensual.",
        amount: monthlyProjection.projectedProfit,
        isPredictive: true,
        shouldPush: true,
        pushTitle: "Utilidad mensual proyectada baja",
        pushBody: `La utilidad mensual proyectada se ubica en ${formatCurrency(monthlyProjection.projectedProfit)}.`,
      })
    );
  }

  if (monthlyProjection.commissionRatio >= 0.45) {
    predictiveAlerts.push(
      createAlert({
        id: "predictive-commission-critical",
        type: "commission_projection_critical",
        category: "team",
        severity: "critical",
        title: "Comisiones proyectadas sobre el 45%",
        message: `La tendencia actual proyecta comisiones cercanas a ${formatPercent(monthlyProjection.commissionRatio)} del neto.`,
        recommendation:
          "Revisa reglas excepcionales, adelantos y estructura de pago antes de que afecte el margen mensual.",
        percent: monthlyProjection.commissionRatio,
        isPredictive: true,
        shouldPush: true,
        pushTitle: "Comisiones proyectadas fuera de rango",
        pushBody: `Las comisiones proyectadas ya superan ${formatPercent(monthlyProjection.commissionRatio)} del neto.`,
      })
    );
  } else if (monthlyProjection.commissionRatio >= 0.4) {
    predictiveAlerts.push(
      createAlert({
        id: "predictive-commission-warning",
        type: "commission_projection_warning",
        category: "team",
        severity: "warning",
        title: "Comisiones proyectadas sobre el 40%",
        message: `La proyección actual deja las comisiones en ${formatPercent(monthlyProjection.commissionRatio)} del neto.`,
        recommendation:
          "Monitorea adelantos y reglas especiales antes de que la semana cierre fuera de rango.",
        percent: monthlyProjection.commissionRatio,
        isPredictive: true,
        shouldPush: true,
        pushTitle: "Comisiones proyectadas altas",
        pushBody: `Las comisiones proyectadas están en ${formatPercent(monthlyProjection.commissionRatio)} del neto.`,
      })
    );
  }

  if (weeklyDrop !== null && weeklyDrop <= -0.15) {
    predictiveAlerts.push(
      createAlert({
        id: "predictive-sales-drop",
        type: "sales_drop_projection",
        category: "sales",
        severity: "warning",
        title: "Caída proyectada de ventas",
        message: `${branch === "all" ? "El negocio" : "La sucursal seleccionada"} podría cerrar el período con una caída de ${formatPercent(Math.abs(weeklyDrop))}.`,
        recommendation:
          "Refuerza agenda, ticket medio y campañas de reactivación antes de consolidar la caída semanal.",
        percent: weeklyDrop,
        branch,
        isPredictive: true,
        shouldPush: true,
        pushTitle: "Caída proyectada de ventas",
        pushBody: `La tendencia apunta a una caída de ${formatPercent(Math.abs(weeklyDrop))}.`,
      })
    );
  }

  predictiveAlerts.push(...calculateInventoryAlerts(safeSnapshot, branch));

  return {
    current: currentAlerts,
    predictive: predictiveAlerts,
  };
}
