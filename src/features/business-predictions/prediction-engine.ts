import type { AiQueryContext } from "@/features/ai-analyst/types/ai-analyst.types";

type PredictionMetric = {
  label: string;
  value: string;
  detail: string;
};

type PredictionChartPoint = {
  label: string;
  amount: number;
};

export type BusinessPredictionAnalysis = {
  tomorrowSalesPrediction: number;
  weekSalesPrediction: number;
  averageDailySales: number;
  weeklyTrend: number;
  topLikelyService: {
    service: string;
    score: number;
  } | null;
  fastestGrowingBranch: {
    branch: string;
    growth: number;
  } | null;
  growingService: {
    service: string;
    growth: number;
  } | null;
  chart: PredictionChartPoint[];
  metrics: PredictionMetric[];
};

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

function getDailyBuckets(context: AiQueryContext) {
  const grouped = new Map<string, number>();

  context.sales.forEach((sale) => {
    grouped.set(sale.saleDate, (grouped.get(sale.saleDate) ?? 0) + sale.netAmount);
  });

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, amount]) => ({
      date,
      amount,
      dayOfWeek: new Intl.DateTimeFormat("es-CL", {
        weekday: "short",
        timeZone: "UTC",
      }).format(new Date(`${date}T12:00:00.000Z`)),
    }));
}

function calculateGrowth(previous: number, current: number) {
  if (previous <= 0) {
    return current > 0 ? 1 : 0;
  }

  return (current - previous) / previous;
}

function getServiceTrend(context: AiQueryContext) {
  const sortedDates = [...new Set(context.sales.map((sale) => sale.saleDate))].sort();
  const previousDate = sortedDates.at(-2);
  const currentDate = sortedDates.at(-1);

  const grouped = new Map<
    string,
    { service: string; previous: number; current: number; total: number }
  >();

  context.sales.forEach((sale) => {
    const current = grouped.get(sale.service);
    const record =
      current ??
      {
        service: sale.service,
        previous: 0,
        current: 0,
        total: 0,
      };

    record.total += sale.netAmount;

    if (sale.saleDate === previousDate) {
      record.previous += sale.netAmount;
    }

    if (sale.saleDate === currentDate) {
      record.current += sale.netAmount;
    }

    grouped.set(sale.service, record);
  });

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    growth: calculateGrowth(item.previous, item.current),
  }));
}

function getBranchTrend(context: AiQueryContext) {
  const sortedDates = [...new Set(context.sales.map((sale) => sale.saleDate))].sort();
  const previousDate = sortedDates.at(-2);
  const currentDate = sortedDates.at(-1);

  const grouped = new Map<
    string,
    { branch: string; previous: number; current: number; total: number }
  >();

  context.sales.forEach((sale) => {
    const current = grouped.get(sale.branch);
    const record =
      current ??
      {
        branch: sale.branch,
        previous: 0,
        current: 0,
        total: 0,
      };

    record.total += sale.netAmount;

    if (sale.saleDate === previousDate) {
      record.previous += sale.netAmount;
    }

    if (sale.saleDate === currentDate) {
      record.current += sale.netAmount;
    }

    grouped.set(sale.branch, record);
  });

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    growth: calculateGrowth(item.previous, item.current),
  }));
}

function getWeekdayAverages(context: AiQueryContext) {
  const grouped = new Map<string, { total: number; count: number }>();

  context.sales.forEach((sale) => {
    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(`${sale.saleDate}T12:00:00.000Z`));
    const current = grouped.get(weekday) ?? { total: 0, count: 0 };

    current.total += sale.netAmount;
    current.count += 1;
    grouped.set(weekday, current);
  });

  return grouped;
}

export function analyzeBusinessPredictions(
  context: AiQueryContext
): BusinessPredictionAnalysis {
  const dailyBuckets = getDailyBuckets(context);
  const totalNetSales = context.sales.reduce((sum, sale) => sum + sale.netAmount, 0);
  const averageDailySales =
    dailyBuckets.length > 0 ? totalNetSales / dailyBuckets.length : 0;
  const latestDay = dailyBuckets.at(-1)?.amount ?? 0;
  const previousDay = dailyBuckets.at(-2)?.amount ?? latestDay;
  const weeklyTrend = calculateGrowth(previousDay, latestDay);

  const latestDate = dailyBuckets.at(-1)?.date;
  const tomorrowWeekday = latestDate
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: "UTC",
      }).format(
        new Date(new Date(`${latestDate}T12:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000)
      )
    : null;

  const weekdayAverages = getWeekdayAverages(context);
  const tomorrowSalesPrediction = tomorrowWeekday
    ? (weekdayAverages.get(tomorrowWeekday)?.total ?? averageDailySales) /
      Math.max(weekdayAverages.get(tomorrowWeekday)?.count ?? 1, 1)
    : averageDailySales;

  const weekSalesPrediction = tomorrowSalesPrediction * 7;
  const serviceTrend = getServiceTrend(context).sort(
    (left, right) => right.growth - left.growth || right.total - left.total
  );
  const branchTrend = getBranchTrend(context).sort(
    (left, right) => right.growth - left.growth || right.total - left.total
  );

  const topLikelyService = serviceTrend[0]
    ? {
        service: serviceTrend[0].service,
        score: serviceTrend[0].growth,
      }
    : null;
  const growingService = serviceTrend[0]
    ? {
        service: serviceTrend[0].service,
        growth: serviceTrend[0].growth,
      }
    : null;
  const fastestGrowingBranch = branchTrend[0]
    ? {
        branch: branchTrend[0].branch,
        growth: branchTrend[0].growth,
      }
    : null;

  return {
    tomorrowSalesPrediction,
    weekSalesPrediction,
    averageDailySales,
    weeklyTrend,
    topLikelyService,
    fastestGrowingBranch,
    growingService,
    chart: dailyBuckets.map((item) => ({
      label: item.dayOfWeek,
      amount: item.amount,
    })),
    metrics: [
      {
        label: "Predicción de ventas para mañana",
        value: formatCurrency(tomorrowSalesPrediction),
        detail: `Promedio diario base ${formatCurrency(averageDailySales)}`,
      },
      {
        label: "Predicción de ventas para esta semana",
        value: formatCurrency(weekSalesPrediction),
        detail: `Tendencia semanal ${formatPercent(weeklyTrend)}`,
      },
      {
        label: "Servicio con mayor probabilidad de venta",
        value: topLikelyService?.service ?? "Sin datos",
        detail: topLikelyService
          ? `Crecimiento ${formatPercent(topLikelyService.score)}`
          : "No hay histórico suficiente",
      },
      {
        label: "Sucursal con mayor crecimiento",
        value: fastestGrowingBranch?.branch ?? "Sin datos",
        detail: fastestGrowingBranch
          ? `Crecimiento ${formatPercent(fastestGrowingBranch.growth)}`
          : "No hay comparación disponible",
      },
    ],
  };
}

