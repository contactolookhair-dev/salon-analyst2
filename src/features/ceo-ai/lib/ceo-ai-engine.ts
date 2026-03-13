import { branches } from "@/features/branches/data/mock-branches";
import type { AiQueryContext } from "@/features/ai-analyst/types/ai-analyst.types";
import {
  calcularComisionVenta,
  calcularUtilidadDia,
  calcularVentasPorProfesional,
  calcularVentasPorSucursal,
} from "@/lib/finance";
import type { BranchFilter } from "@/shared/types/business";

type ExecutiveMetric = {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning";
};

type ExecutiveAlert = {
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
};

type ExecutiveOpportunity = {
  title: string;
  description: string;
  metric: string;
};

type CeoAiSummary = {
  title: string;
  subtitle: string;
  metrics: ExecutiveMetric[];
};

export type CeoAiAnalysis = {
  summary: CeoAiSummary;
  alerts: ExecutiveAlert[];
  opportunities: ExecutiveOpportunity[];
  recommendation: {
    title: string;
    description: string;
  };
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

function getBranchDisplayName(branch: BranchFilter) {
  if (branch === "all") {
    return "todas las sucursales";
  }

  return branches.find((item) => item.id === branch)?.name ?? "la sucursal";
}

function getProfessionalName(context: AiQueryContext, professionalId: string) {
  return (
    context.professionals.find((professional) => professional.id === professionalId)
      ?.name ?? professionalId
  );
}

function getLatestDates(context: AiQueryContext) {
  const dates = [...new Set(context.sales.map((sale) => sale.saleDate))].sort();
  const currentDate = dates.at(-1) ?? null;
  const previousDate = dates.at(-2) ?? null;

  return {
    currentDate,
    previousDate,
  };
}

function getDayScope(context: AiQueryContext, date: string | null) {
  const sales = date ? context.sales.filter((sale) => sale.saleDate === date) : [];
  const expenses = date
    ? context.expenses.filter((expense) => expense.expenseDate === date)
    : [];

  return {
    sales,
    expenses,
    profit: calcularUtilidadDia(sales, expenses),
  };
}

function buildServicePerformance(context: AiQueryContext) {
  const grouped = new Map<
    string,
    {
      service: string;
      branch: string;
      utility: number;
      netSales: number;
      grossSales: number;
      count: number;
    }
  >();

  context.sales.forEach((sale) => {
    const key = `${sale.branchId}:${sale.service}`;
    const utility = sale.netAmount - calcularComisionVenta(sale) - sale.cost;
    const current = grouped.get(key);

    if (current) {
      current.utility += utility;
      current.netSales += sale.netAmount;
      current.grossSales += sale.grossAmount;
      current.count += 1;
      return;
    }

    grouped.set(key, {
      service: sale.service,
      branch: sale.branch,
      utility,
      netSales: sale.netAmount,
      grossSales: sale.grossAmount,
      count: 1,
    });
  });

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    margin: item.netSales > 0 ? item.utility / item.netSales : 0,
  }));
}

function buildDaySummary(context: AiQueryContext, branch: BranchFilter): CeoAiSummary {
  const { currentDate } = getLatestDates(context);
  const currentDay = getDayScope(context, currentDate);
  const topProfessional =
    calcularVentasPorProfesional(currentDay.sales).sort(
      (a, b) => b.utilidad - a.utilidad
    )[0] ?? null;
  const topBranch =
    calcularVentasPorSucursal(currentDay.sales).sort((a, b) => b.utilidad - a.utilidad)[0] ??
    null;

  return {
    title: "Resumen del día",
    subtitle: currentDate
      ? `Lectura ejecutiva para ${getBranchDisplayName(branch)} con corte ${currentDate}.`
      : "Aún no hay ventas suficientes para construir un resumen diario.",
    metrics: [
      {
        label: "Ventas del día",
        value: formatCurrency(currentDay.profit.totalVentasNetas),
      },
      {
        label: "Utilidad estimada",
        value: formatCurrency(currentDay.profit.utilidad),
        tone: currentDay.profit.utilidad >= 0 ? "positive" : "warning",
      },
      {
        label: "Mejor profesional",
        value: topProfessional
          ? `${getProfessionalName(context, topProfessional.professionalId)}`
          : "Sin datos",
      },
      {
        label: "Sucursal top del día",
        value: topBranch
          ? branches.find((item) => item.id === topBranch.branchId)?.name ?? topBranch.branchId
          : getBranchDisplayName(branch),
      },
    ],
  };
}

function buildAlerts(context: AiQueryContext, branch: BranchFilter) {
  const { currentDate, previousDate } = getLatestDates(context);
  const currentDay = getDayScope(context, currentDate);
  const previousDay = getDayScope(context, previousDate);
  const currentMargin =
    currentDay.profit.totalVentasNetas > 0
      ? currentDay.profit.utilidad / currentDay.profit.totalVentasNetas
      : 0;
  const fixedCommissionShare =
    currentDay.profit.totalComisiones > 0
      ? currentDay.sales
          .filter((sale) => sale.commissionType === "fixed")
          .reduce((sum, sale) => sum + calcularComisionVenta(sale), 0) /
        currentDay.profit.totalComisiones
      : 0;

  const alerts: ExecutiveAlert[] = [];

  if (
    previousDate &&
    currentDay.profit.utilidad < previousDay.profit.utilidad &&
    previousDay.profit.utilidad > 0
  ) {
    alerts.push({
      title: "Utilidad por debajo del día anterior",
      description: `La utilidad cayó de ${formatCurrency(previousDay.profit.utilidad)} a ${formatCurrency(currentDay.profit.utilidad)} entre ${previousDate} y ${currentDate}.`,
      severity: "high",
    });
  }

  if (
    previousDate &&
    currentDay.profit.totalGastos > previousDay.profit.totalGastos * 1.25 &&
    currentDay.profit.totalGastos > 0
  ) {
    alerts.push({
      title: "Gasto diario subió con fuerza",
      description: `El gasto pasó de ${formatCurrency(previousDay.profit.totalGastos)} a ${formatCurrency(currentDay.profit.totalGastos)} en el último corte disponible.`,
      severity: "medium",
    });
  }

  if (currentMargin > 0 && currentMargin < 0.32) {
    alerts.push({
      title: "Margen operativo bajo",
      description: `${getBranchDisplayName(branch)} está operando con un margen estimado de ${formatPercent(currentMargin)}, por debajo del rango saludable definido para esta base.`,
      severity: "medium",
    });
  }

  if (fixedCommissionShare > 0.45) {
    alerts.push({
      title: "Comisiones fijas demasiado pesadas",
      description: `Las comisiones fijas representan ${formatPercent(fixedCommissionShare)} del total comisionado del día, señal de posibles adelantos o estructuras poco eficientes.`,
      severity: "medium",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "Sin alertas críticas hoy",
      description:
        "No aparecen desviaciones fuertes en utilidad, gasto, margen ni peso de comisiones fijas dentro del dataset actual.",
      severity: "low",
    });
  }

  return alerts;
}

function buildOpportunities(context: AiQueryContext) {
  const { currentDate } = getLatestDates(context);
  const currentDay = getDayScope(context, currentDate);
  const servicePerformance = buildServicePerformance(context);
  const topService =
    servicePerformance.sort((a, b) => b.utility - a.utility)[0] ?? null;
  const topMarginService =
    [...servicePerformance].sort((a, b) => b.margin - a.margin)[0] ?? null;
  const topProfessional =
    calcularVentasPorProfesional(context.sales).sort((a, b) => b.utilidad - a.utilidad)[0] ??
    null;
  const topBranch =
    calcularVentasPorSucursal(context.sales).sort(
      (a, b) => b.utilidad / Math.max(b.totalVentasNetas, 1) - a.utilidad / Math.max(a.totalVentasNetas, 1)
    )[0] ?? null;

  return [
    {
      title: "Servicio más rentable",
      description: topService
        ? `${topService.service} lidera la utilidad del período en ${topService.branch}.`
        : "No hay suficiente información de servicios todavía.",
      metric: topService ? formatCurrency(topService.utility) : "Sin datos",
    },
    {
      title: "Profesional con mejor rendimiento",
      description: topProfessional
        ? `${getProfessionalName(context, topProfessional.professionalId)} está generando el mayor retorno neto.`
        : "No hay profesionales comparables todavía.",
      metric: topProfessional ? formatCurrency(topProfessional.utilidad) : "Sin datos",
    },
    {
      title: "Sucursal con mejor margen",
      description: topBranch
        ? `${branches.find((item) => item.id === topBranch.branchId)?.name ?? topBranch.branchId} está cuidando mejor el margen operacional.`
        : "No hay sucursales comparables todavía.",
      metric: topBranch
        ? formatPercent(topBranch.utilidad / Math.max(topBranch.totalVentasNetas, 1))
        : "Sin datos",
    },
    {
      title: "Servicio para empujar",
      description: topMarginService
        ? `${topMarginService.service} combina buen margen con espacio claro para activarlo más en agenda.`
        : "No hay un servicio destacado para empujar todavía.",
      metric: topMarginService ? formatPercent(topMarginService.margin) : "Sin datos",
    },
    {
      title: "Lectura del corte más reciente",
      description: currentDay.sales.length
        ? `El último día con movimiento deja una base suficiente para empujar los bloques que ya están convirtiendo.`
        : "Aún no existe un corte reciente que analizar.",
      metric: currentDay.sales.length
        ? `${currentDay.sales.length} ventas`
        : "Sin datos",
    },
  ];
}

function buildRecommendation(
  context: AiQueryContext,
  alerts: ExecutiveAlert[],
  opportunities: ExecutiveOpportunity[]
) {
  const criticalAlert = alerts.find((alert) => alert.severity === "high");
  const topOpportunity = opportunities[0];
  const topProfessional =
    calcularVentasPorProfesional(context.sales).sort((a, b) => b.utilidad - a.utilidad)[0] ??
    null;

  if (criticalAlert) {
    return {
      title: "Recomendación del día",
      description: `Prioriza una revisión operativa inmediata sobre utilidad y estructura de costos. Después, protege agenda y ticket medio con ${topProfessional ? getProfessionalName(context, topProfessional.professionalId) : "el profesional con mejor retorno"} para recuperar margen rápido.`,
    };
  }

  return {
    title: "Recomendación del día",
    description: topOpportunity
      ? `Empuja activamente ${topOpportunity.title.toLowerCase()} en el discurso comercial de hoy y replica la práctica del equipo que mejor está rentabilizando el día. La oportunidad más clara ahora mismo es: ${topOpportunity.description}`
      : "Consolida el ritmo actual y sigue monitoreando utilidad, gasto y margen por sucursal.",
  };
}

export function analyzeCeoAI(
  context: AiQueryContext,
  branch: BranchFilter
): CeoAiAnalysis {
  const summary = buildDaySummary(context, branch);
  const alerts = buildAlerts(context, branch);
  const opportunities = buildOpportunities(context);
  const recommendation = buildRecommendation(context, alerts, opportunities);

  return {
    summary,
    alerts,
    opportunities,
    recommendation,
  };
}
