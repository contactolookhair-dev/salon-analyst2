import { branches } from "@/features/branches/data/mock-branches";
import type {
  AiInsightCardData,
  AiQueryContext,
  AiQueryResult,
  AiStructuredInsights,
} from "@/features/ai-analyst/types/ai-analyst.types";
import {
  calcularComisionVenta,
  calcularVentasPorProfesional,
  calcularVentasPorSucursal,
} from "@/lib/finance";
import { getBranchName } from "@/shared/lib/branch";
import { formatCurrency, formatPercent } from "@/shared/lib/utils";

type ServiceAggregate = {
  service: string;
  branchId: (typeof branches)[number]["id"];
  totalNetSales: number;
  totalUtility: number;
  totalCommission: number;
  totalCost: number;
  count: number;
};

function buildServiceAggregates(context: AiQueryContext) {
  const grouped = new Map<string, ServiceAggregate>();

  context.sales.forEach((sale) => {
    const key = `${sale.branchId}:${sale.service}`;
    const commission = calcularComisionVenta(sale);
    const utility = sale.netAmount - commission - sale.cost;
    const current = grouped.get(key);

    if (current) {
      current.totalNetSales += sale.netAmount;
      current.totalUtility += utility;
      current.totalCommission += commission;
      current.totalCost += sale.cost;
      current.count += 1;
      return;
    }

    grouped.set(key, {
      service: sale.service,
      branchId: sale.branchId,
      totalNetSales: sale.netAmount,
      totalUtility: utility,
      totalCommission: commission,
      totalCost: sale.cost,
      count: 1,
    });
  });

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    margin: item.totalNetSales > 0 ? item.totalUtility / item.totalNetSales : 0,
  }));
}

function buildProductAggregates(context: AiQueryContext) {
  const grouped = new Map<string, { productName: string; units: number; revenue: number }>();

  context.sales.forEach((sale) => {
    const productName = sale.productName ?? sale.service;
    const current = grouped.get(productName);

    if (current) {
      current.units += 1;
      current.revenue += sale.grossAmount;
      return;
    }

    grouped.set(productName, {
      productName,
      units: 1,
      revenue: sale.grossAmount,
    });
  });

  return Array.from(grouped.values());
}

function buildDailySales(context: AiQueryContext) {
  const grouped = new Map<
    string,
    { date: string; totalNetSales: number; totalGrossSales: number; salesCount: number }
  >();

  context.sales.forEach((sale) => {
    const current = grouped.get(sale.saleDate);

    if (current) {
      current.totalNetSales += sale.netAmount;
      current.totalGrossSales += sale.grossAmount;
      current.salesCount += 1;
      return;
    }

    grouped.set(sale.saleDate, {
      date: sale.saleDate,
      totalNetSales: sale.netAmount,
      totalGrossSales: sale.grossAmount,
      salesCount: 1,
    });
  });

  return Array.from(grouped.values());
}

function buildCards(insights: AiStructuredInsights): AiInsightCardData[] {
  return [
    {
      id: "servicio-mas-rentable",
      title: "Servicio más rentable del mes",
      value: insights.topProfitableService?.service ?? "Sin datos",
      detail: insights.topProfitableService
        ? `${formatCurrency(insights.topProfitableService.utility)} en ${getBranchName(insights.topProfitableService.branchId)}`
        : "No hay ventas registradas.",
      badge: "Utilidad",
    },
    {
      id: "producto-mas-vendido",
      title: "Producto más vendido",
      value: insights.topSellingProduct?.productName ?? "Sin datos",
      detail: insights.topSellingProduct
        ? `${insights.topSellingProduct.units} ventas · ${formatCurrency(insights.topSellingProduct.revenue)} brutos`
        : "No hay productos asociados.",
      badge: "Ventas",
    },
    {
      id: "profesional-top",
      title: "Profesional que más vendió",
      value:
        contextProfessionalName(insights.topProfessional?.professionalId) ?? "Sin datos",
      detail: insights.topProfessional
        ? `${formatCurrency(insights.topProfessional.totalNetSales)} netos`
        : "No hay ventas registradas.",
      badge: "Equipo",
    },
    {
      id: "sucursal-mas-rentable",
      title: "Sucursal más rentable",
      value: insights.mostProfitableBranch
        ? getBranchName(insights.mostProfitableBranch.branchId)
        : "Sin datos",
      detail: insights.mostProfitableBranch
        ? `${formatCurrency(insights.mostProfitableBranch.utility)} de utilidad`
        : "No hay resultados para comparar.",
      badge: "Sucursal",
    },
    {
      id: "gasto-mas-alto",
      title: "Gasto más alto del mes",
      value: insights.highestExpense?.title ?? "Sin datos",
      detail: insights.highestExpense
        ? `${formatCurrency(insights.highestExpense.amount)} · ${insights.highestExpense.category}`
        : "No hay gastos registrados.",
      badge: "Gastos",
    },
    {
      id: "dia-mas-ventas",
      title: "Día con más ventas",
      value: insights.topSalesDay?.date ?? "Sin datos",
      detail: insights.topSalesDay
        ? `${formatCurrency(insights.topSalesDay.totalNetSales)} netos en ${insights.topSalesDay.salesCount} ventas`
        : "No hay días para evaluar.",
      badge: "Pico",
    },
    {
      id: "servicio-mejor-margen",
      title: "Servicio con mejor margen",
      value: insights.bestMarginService?.service ?? "Sin datos",
      detail: insights.bestMarginService
        ? `${formatPercent(insights.bestMarginService.margin)} de margen`
        : "No hay margen disponible.",
      badge: "Margen",
    },
    {
      id: "servicio-menor-utilidad",
      title: "Servicio con menor utilidad",
      value: insights.lowestUtilityService?.service ?? "Sin datos",
      detail: insights.lowestUtilityService
        ? `${formatCurrency(insights.lowestUtilityService.utility)} de utilidad`
        : "No hay resultados para comparar.",
      badge: "Riesgo",
    },
  ];
}

let professionalIndex = new Map<string, string>();

function contextProfessionalName(professionalId?: string) {
  if (!professionalId) {
    return null;
  }

  return professionalIndex.get(professionalId) ?? professionalId;
}

export function analizarNegocio(context: AiQueryContext): AiStructuredInsights {
  professionalIndex = new Map(
    context.professionals.map((professional) => [professional.id, professional.name])
  );

  const serviceAggregates = buildServiceAggregates(context);
  const topProfitableService =
    serviceAggregates.sort((a, b) => b.totalUtility - a.totalUtility)[0] ?? null;
  const lowestUtilityService =
    [...serviceAggregates].sort((a, b) => a.totalUtility - b.totalUtility)[0] ?? null;
  const bestMarginService =
    [...serviceAggregates].sort((a, b) => b.margin - a.margin)[0] ?? null;

  const topSellingProduct =
    buildProductAggregates(context).sort((a, b) => b.units - a.units || b.revenue - a.revenue)[0] ??
    null;

  const topProfessional =
    calcularVentasPorProfesional(context.sales)
      .sort((a, b) => b.totalVentasNetas - a.totalVentasNetas)[0] ?? null;

  const mostProfitableBranch =
    calcularVentasPorSucursal(context.sales).sort((a, b) => b.utilidad - a.utilidad)[0] ??
    null;

  const highestExpense =
    [...context.expenses].sort((a, b) => b.amount - a.amount)[0] ?? null;

  const topSalesDay =
    buildDailySales(context).sort((a, b) => b.totalNetSales - a.totalNetSales)[0] ?? null;

  const insights: AiStructuredInsights = {
    cards: [],
    topProfitableService: topProfitableService
      ? {
          service: topProfitableService.service,
          utility: Math.round(topProfitableService.totalUtility),
          margin: topProfitableService.margin,
          branchId: topProfitableService.branchId,
        }
      : null,
    topSellingProduct: topSellingProduct
      ? {
          productName: topSellingProduct.productName,
          units: topSellingProduct.units,
          revenue: Math.round(topSellingProduct.revenue),
        }
      : null,
    topProfessional: topProfessional
      ? {
          professionalId: topProfessional.professionalId,
          totalNetSales: topProfessional.totalVentasNetas,
          utility: topProfessional.utilidad,
        }
      : null,
    mostProfitableBranch: mostProfitableBranch
      ? {
          branchId: mostProfitableBranch.branchId,
          utility: mostProfitableBranch.utilidad,
        }
      : null,
    highestExpense,
    topSalesDay: topSalesDay
      ? {
          date: topSalesDay.date,
          totalNetSales: Math.round(topSalesDay.totalNetSales),
          totalGrossSales: Math.round(topSalesDay.totalGrossSales),
          salesCount: topSalesDay.salesCount,
        }
      : null,
    bestMarginService: bestMarginService
      ? {
          service: bestMarginService.service,
          margin: bestMarginService.margin,
          utility: Math.round(bestMarginService.totalUtility),
        }
      : null,
    lowestUtilityService: lowestUtilityService
      ? {
          service: lowestUtilityService.service,
          utility: Math.round(lowestUtilityService.totalUtility),
          margin: lowestUtilityService.margin,
        }
      : null,
  };

  insights.cards = buildCards(insights);

  return insights;
}

function detectBranchId(question: string) {
  const normalizedQuestion = question.toLowerCase();

  return branches.find((branch) =>
    normalizedQuestion.includes(branch.name.toLowerCase())
  )?.id;
}

export function responderPreguntaAiLocal(
  question: string,
  context: AiQueryContext
): AiQueryResult {
  const normalizedQuestion = question.toLowerCase();
  const insights = analizarNegocio(context);
  const branchId = detectBranchId(question);

  if (
    normalizedQuestion.includes("más ganancia") ||
    normalizedQuestion.includes("más rentable")
  ) {
    if (normalizedQuestion.includes("servicio")) {
      const item = insights.topProfitableService;
      return {
        question,
        matchedRule: "servicio-mas-rentable",
        source: "local",
        model: null,
        answer: item
          ? `${item.service} fue el servicio más rentable con ${formatCurrency(item.utility)} de utilidad en ${getBranchName(item.branchId)}.`
          : "No encontré ventas para calcular el servicio más rentable.",
      };
    }
  }

  if (
    normalizedQuestion.includes("más vendido") ||
    normalizedQuestion.includes("producto")
  ) {
    const item = insights.topSellingProduct;
    return {
      question,
      matchedRule: "producto-mas-vendido",
      source: "local",
      model: null,
      answer: item
        ? `${item.productName} fue el producto más vendido con ${item.units} ventas y ${formatCurrency(item.revenue)} brutos.`
        : "No encontré productos asociados para responder esa pregunta.",
    };
  }

  if (
    normalizedQuestion.includes("profesional") ||
    normalizedQuestion.includes("vendió más")
  ) {
    const grouped = calcularVentasPorProfesional(
      branchId
        ? context.sales.filter((sale) => sale.branchId === branchId)
        : context.sales
    ).sort((a, b) => b.totalVentasNetas - a.totalVentasNetas);
    const professional = grouped[0];
    const professionalName = contextProfessionalName(professional?.professionalId);

    return {
      question,
      matchedRule: "profesional-top",
      source: "local",
      model: null,
      answer: professional && professionalName
        ? `${professionalName} fue quien más vendió${branchId ? ` en ${getBranchName(branchId)}` : ""} con ${formatCurrency(professional.totalVentasNetas)} netos.`
        : "No encontré ventas por profesional para esa consulta.",
    };
  }

  if (
    normalizedQuestion.includes("sucursal") ||
    normalizedQuestion.includes("rentable")
  ) {
    const item = insights.mostProfitableBranch;
    return {
      question,
      matchedRule: "sucursal-mas-rentable",
      source: "local",
      model: null,
      answer: item
        ? `${getBranchName(item.branchId)} fue la sucursal más rentable con ${formatCurrency(item.utility)} de utilidad.`
        : "No encontré información suficiente para comparar sucursales.",
    };
  }

  if (normalizedQuestion.includes("gast") || normalizedQuestion.includes("gasto")) {
    const totalExpenses = context.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    return {
      question,
      matchedRule: "gastos-mes",
      source: "local",
      model: null,
      answer: `El gasto total del período es ${formatCurrency(totalExpenses)}.`,
    };
  }

  if (normalizedQuestion.includes("margen")) {
    const item = insights.bestMarginService;
    return {
      question,
      matchedRule: "servicio-mejor-margen",
      source: "local",
      model: null,
      answer: item
        ? `${item.service} deja el mejor margen con ${formatPercent(item.margin)} y ${formatCurrency(item.utility)} de utilidad.`
        : "No pude calcular márgenes con los datos disponibles.",
    };
  }

  return {
    question,
    matchedRule: "fallback",
    source: "local",
    model: null,
    answer:
      "Puedo responder sobre servicio más rentable, producto más vendido, profesional top, sucursal más rentable, gastos y márgenes.",
  };
}

export async function responderPreguntaAi(
  question: string,
  context: AiQueryContext
): Promise<AiQueryResult> {
  try {
    const response = await fetch("/api/ai-analyst/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error("No pude consultar al analista IA.");
    }

    return (await response.json()) as AiQueryResult;
  } catch {
    return responderPreguntaAiLocal(question, context);
  }
}
