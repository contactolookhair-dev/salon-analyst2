"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, Package, Scissors, Wallet } from "lucide-react";

import { branches } from "@/features/branches/data/mock-branches";
import { Card } from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";
import type { Professional, Sale } from "@/shared/types/business";

const TEAM_DATE_RANGE_STORAGE_KEY = "salon-analyst2-team-date-range";

type TeamOverviewProps = {
  professionals: Professional[];
  sales: Sale[];
};

type TeamDateRange = {
  from: string;
  to: string;
};

type TeamProfessionalEntry = {
  professional: Professional;
  sales: Sale[];
  grossTotal: number;
  commissionTotal: number;
  advancesTotal: number;
  netToPay: number;
  servicesCount: number;
  productsCount: number;
  dailyHistory: Array<{
    date: string;
    grossTotal: number;
    commissionTotal: number;
    servicesCount: number;
    productsCount: number;
  }>;
};

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function getTodayChileDateString() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santiago",
  }).format(new Date());
}

function getDateDaysAgo(baseDate: string, days: number) {
  const current = new Date(`${baseDate}T12:00:00.000Z`);
  current.setUTCDate(current.getUTCDate() - days);
  return current.toISOString().slice(0, 10);
}

function getStartOfWeek(baseDate: string) {
  const current = new Date(`${baseDate}T12:00:00.000Z`);
  const day = current.getUTCDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  current.setUTCDate(current.getUTCDate() - mondayOffset);
  return current.toISOString().slice(0, 10);
}

function getStartOfMonth(baseDate: string) {
  return `${baseDate.slice(0, 8)}01`;
}

function getPreviousMonthRange(baseDate: string): TeamDateRange {
  const current = new Date(`${baseDate}T12:00:00.000Z`);
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const previousMonthLastDay = new Date(Date.UTC(year, month, 0, 12, 0, 0));
  const previousMonthFirstDay = new Date(
    Date.UTC(previousMonthLastDay.getUTCFullYear(), previousMonthLastDay.getUTCMonth(), 1, 12, 0, 0)
  );

  return {
    from: previousMonthFirstDay.toISOString().slice(0, 10),
    to: previousMonthLastDay.toISOString().slice(0, 10),
  };
}

function isSaleInRange(saleDate: string, range: TeamDateRange) {
  return saleDate >= range.from && saleDate <= range.to;
}

function getDefaultTeamDateRange(today: string): TeamDateRange {
  return {
    from: getStartOfMonth(today),
    to: today,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildReportHtml(entry: TeamProfessionalEntry, range: TeamDateRange) {
  const branchLabels = entry.professional.branchIds
    .map((branchId) => branches.find((branch) => branch.id === branchId)?.name ?? branchId)
    .join(" · ");
  const activeDays = entry.dailyHistory.length || 1;
  const averageSales = Math.round(entry.grossTotal / activeDays);
  const averageCommission = Math.round(entry.commissionTotal / activeDays);
  const generatedAt = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(new Date());

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>Informe ${escapeHtml(entry.professional.name)}</title>
      <style>
        :root {
          color-scheme: light;
          --ink: #2f3626;
          --muted: #6e7563;
          --line: #d8dccd;
          --paper: #f7f4ea;
          --panel: #ffffff;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 32px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: var(--ink);
          background: linear-gradient(180deg, #fcfbf6 0%, #f5f0e4 100%);
        }
        .report {
          max-width: 920px;
          margin: 0 auto;
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 28px;
          padding: 32px;
        }
        .eyebrow {
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--muted);
        }
        h1 {
          margin: 8px 0 4px;
          font-size: 30px;
          line-height: 1.1;
        }
        .subtle {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
        }
        .summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 28px;
        }
        .metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }
        .card {
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 16px 18px;
          background: var(--paper);
        }
        .label {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .value {
          margin-top: 8px;
          font-size: 24px;
          font-weight: 700;
        }
        .small-value {
          margin-top: 8px;
          font-size: 19px;
          font-weight: 700;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 18px;
        }
        th, td {
          padding: 12px 10px;
          border-bottom: 1px solid var(--line);
          text-align: left;
          vertical-align: top;
          font-size: 14px;
        }
        th {
          color: var(--muted);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--line);
          color: var(--muted);
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <article class="report">
        <div class="eyebrow">SalonAnalyst2 · Informe individual</div>
        <h1>${escapeHtml(entry.professional.name)}</h1>
        <p class="subtle">
          ${escapeHtml(entry.professional.role)} · ${escapeHtml(branchLabels || "General")}<br />
          Rango analizado: ${escapeHtml(formatDateLabel(range.from))} al ${escapeHtml(formatDateLabel(range.to))}
        </p>

        <section class="summary">
          <div class="card">
            <div class="label">Ventas del rango</div>
            <div class="value">${escapeHtml(formatCurrency(entry.grossTotal))}</div>
          </div>
          <div class="card">
            <div class="label">Comisión acumulada</div>
            <div class="value">${escapeHtml(formatCurrency(entry.commissionTotal))}</div>
          </div>
        </section>

        <section class="metrics">
          <div class="card">
            <div class="label">Adelantos</div>
            <div class="small-value">${escapeHtml(formatCurrency(entry.advancesTotal))}</div>
          </div>
          <div class="card">
            <div class="label">Neto a pagar</div>
            <div class="small-value">${escapeHtml(formatCurrency(entry.netToPay))}</div>
          </div>
          <div class="card">
            <div class="label">Servicios</div>
            <div class="small-value">${entry.servicesCount}</div>
          </div>
          <div class="card">
            <div class="label">Productos</div>
            <div class="small-value">${entry.productsCount}</div>
          </div>
        </section>

        <section class="metrics">
          <div class="card">
            <div class="label">Días con movimiento</div>
            <div class="small-value">${entry.dailyHistory.length}</div>
          </div>
          <div class="card">
            <div class="label">Promedio ventas diario</div>
            <div class="small-value">${escapeHtml(formatCurrency(averageSales))}</div>
          </div>
          <div class="card">
            <div class="label">Promedio comisión diaria</div>
            <div class="small-value">${escapeHtml(formatCurrency(averageCommission))}</div>
          </div>
          <div class="card">
            <div class="label">Observación</div>
            <div class="small-value" style="font-size:14px;font-weight:600">Adelantos conectables cuando exista ese módulo.</div>
          </div>
        </section>

        <section style="margin-top: 26px">
          <div class="eyebrow">Detalle diario</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Servicios</th>
                <th>Productos</th>
                <th>Total vendido</th>
                <th>Comisión del día</th>
              </tr>
            </thead>
            <tbody>
              ${entry.dailyHistory
                .map(
                  (day) => `<tr>
                    <td>${escapeHtml(formatDateLabel(day.date))}</td>
                    <td>${day.servicesCount}</td>
                    <td>${day.productsCount}</td>
                    <td>${escapeHtml(formatCurrency(day.grossTotal))}</td>
                    <td>${escapeHtml(formatCurrency(day.commissionTotal))}</td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </section>

        <div class="footer">
          Generado: ${escapeHtml(generatedAt)} · SalonAnalyst2
        </div>
      </article>
    </body>
  </html>`;
}

export function TeamOverview({ professionals, sales }: TeamOverviewProps) {
  const today = useMemo(() => getTodayChileDateString(), []);
  const [teamDateRange, setTeamDateRange] = useState<TeamDateRange>(() =>
    getDefaultTeamDateRange(today)
  );

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(TEAM_DATE_RANGE_STORAGE_KEY);

      if (!storedValue) {
        return;
      }

      const parsedValue = JSON.parse(storedValue) as Partial<TeamDateRange>;

      if (parsedValue.from && parsedValue.to) {
        setTeamDateRange({
          from: parsedValue.from,
          to: parsedValue.to,
        });
      }
    } catch {
      // Ignore local storage parse issues and keep default range.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        TEAM_DATE_RANGE_STORAGE_KEY,
        JSON.stringify(teamDateRange)
      );
    } catch {
      // Ignore local storage write issues and keep in-memory range.
    }
  }, [teamDateRange]);

  const teamSalesByProfessional = useMemo<TeamProfessionalEntry[]>(() => {
    return professionals
      .map((professional) => {
      const professionalSales = sales
        .filter(
          (sale) =>
            sale.professionalId === professional.id &&
            isSaleInRange(sale.saleDate, teamDateRange)
        )
        .sort((left, right) =>
          `${right.saleDate}T${right.createdAt}`.localeCompare(
            `${left.saleDate}T${left.createdAt}`
          )
        );

      const grossTotal = professionalSales.reduce(
        (total, sale) => total + sale.grossAmount,
        0
      );
      const commissionTotal = professionalSales.reduce(
        (total, sale) => total + sale.commissionValue,
        0
      );
      const servicesCount = professionalSales.length;
      const productsCount = professionalSales.filter((sale) => sale.productName).length;
      const advancesTotal = 0;
      const netToPay = Math.max(commissionTotal - advancesTotal, 0);
      const dailyHistory = Array.from(
        professionalSales.reduce(
          (map, sale) => {
            const current = map.get(sale.saleDate) ?? {
              date: sale.saleDate,
              grossTotal: 0,
              commissionTotal: 0,
              servicesCount: 0,
              productsCount: 0,
            };

            current.grossTotal += sale.grossAmount;
            current.commissionTotal += sale.commissionValue;
            current.servicesCount += 1;
            current.productsCount += sale.productName ? 1 : 0;

            map.set(sale.saleDate, current);
            return map;
          },
          new Map<
            string,
            {
              date: string;
              grossTotal: number;
              commissionTotal: number;
              servicesCount: number;
              productsCount: number;
            }
          >()
        ).values()
      ).sort((left, right) => right.date.localeCompare(left.date));

        return {
          professional,
          sales: professionalSales,
          grossTotal,
          commissionTotal,
          advancesTotal,
          netToPay,
          servicesCount,
          productsCount,
          dailyHistory,
        };
      })
      .filter((entry) => entry.professional.active || entry.sales.length > 0);
  }, [professionals, sales, teamDateRange]);

  function handleExport(entry: TeamProfessionalEntry) {
    const reportWindow = window.open("", "_blank", "noopener,noreferrer,width=980,height=1080");

    if (!reportWindow) {
      window.alert("No pude abrir la ventana del informe. Revisa si el navegador bloqueó el popup.");
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(buildReportHtml(entry, teamDateRange));
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  }

  return (
    <section className="space-y-6">
      <Card className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-olive-700">
              Equipo
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-olive-950">
              Control del equipo por rango de fechas
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Elige exactamente desde qué fecha hasta qué fecha quieres revisar ventas, comisiones, adelantos y neto a pagar por profesional.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setTeamDateRange({
                  from: today,
                  to: today,
                })
              }
              className="rounded-full border border-olive-950/10 px-4 py-2 text-sm font-semibold text-olive-950 transition hover:bg-white"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() =>
                setTeamDateRange({
                  from: getDateDaysAgo(today, 1),
                  to: getDateDaysAgo(today, 1),
                })
              }
              className="rounded-full border border-olive-950/10 px-4 py-2 text-sm font-semibold text-olive-950 transition hover:bg-white"
            >
              Ayer
            </button>
            <button
              type="button"
              onClick={() =>
                setTeamDateRange({
                  from: getStartOfWeek(today),
                  to: today,
                })
              }
              className="rounded-full border border-olive-950/10 px-4 py-2 text-sm font-semibold text-olive-950 transition hover:bg-white"
            >
              Esta semana
            </button>
            <button
              type="button"
              onClick={() =>
                setTeamDateRange({
                  from: getStartOfMonth(today),
                  to: today,
                })
              }
              className="rounded-full border border-olive-950/10 px-4 py-2 text-sm font-semibold text-olive-950 transition hover:bg-white"
            >
              Este mes
            </button>
            <button
              type="button"
              onClick={() => setTeamDateRange(getPreviousMonthRange(today))}
              className="rounded-full border border-olive-950/10 px-4 py-2 text-sm font-semibold text-olive-950 transition hover:bg-white"
            >
              Mes pasado
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-olive-950">Fecha desde</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-olive-700" />
              <input
                type="date"
                value={teamDateRange.from}
                max={teamDateRange.to}
                onChange={(event) =>
                  setTeamDateRange((current) => ({
                    ...current,
                    from: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-olive-950/10 bg-white py-3 pl-11 pr-4"
              />
            </div>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-olive-950">Fecha hasta</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-olive-700" />
              <input
                type="date"
                value={teamDateRange.to}
                min={teamDateRange.from}
                onChange={(event) =>
                  setTeamDateRange((current) => ({
                    ...current,
                    to: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-olive-950/10 bg-white py-3 pl-11 pr-4"
              />
            </div>
          </label>
          <div className="rounded-[20px] bg-[#fbfaf6] px-4 py-3 text-sm">
            <p className="text-muted-foreground">Rango activo</p>
            <p className="mt-2 font-semibold text-olive-950">
              {formatDateLabel(teamDateRange.from)} - {formatDateLabel(teamDateRange.to)}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
        {teamSalesByProfessional.map(
          (entry) => {
            const {
            professional,
            sales: professionalSales,
            grossTotal,
            commissionTotal,
            advancesTotal,
            netToPay,
            servicesCount,
            productsCount,
            dailyHistory,
            } = entry;
            const professionalBranchLabels = professional.branchIds
              .map(
                (branchId) =>
                  branches.find((branch) => branch.id === branchId)?.name ?? branchId
              )
              .join(" · ");
            const daysWithMovement = dailyHistory.length;
            const averageSales = daysWithMovement
              ? Math.round(grossTotal / daysWithMovement)
              : 0;
            const averageCommission = daysWithMovement
              ? Math.round(commissionTotal / daysWithMovement)
              : 0;

            return (
              <div
                key={professional.id}
                className="rounded-[30px] border border-olive-950/8 bg-[#fbfaf6] p-7 shadow-[0_18px_40px_rgba(42,45,31,0.08)]"
              >
                <div className="flex flex-col gap-5 border-b border-olive-950/8 pb-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <p className="text-[1.35rem] font-semibold leading-tight text-olive-950 break-words">
                      {professional.name}
                    </p>
                    <p className="text-sm font-medium leading-relaxed text-muted-foreground break-words">
                      {professional.role}
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {professional.branchIds.map((branchId) => {
                        const branchLabel =
                          branches.find((branch) => branch.id === branchId)?.name ?? branchId;

                        return (
                          <span
                            key={`${professional.id}-${branchId}`}
                            className="max-w-full rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold leading-relaxed text-olive-700"
                          >
                            {branchLabel}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExport(entry)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border border-olive-950/10 bg-white px-4 py-2.5 text-sm font-semibold text-olive-950 transition hover:bg-olive-950 hover:text-white"
                  >
                    <Download className="size-4" />
                    Exportar PDF
                  </button>
                </div>

                <div className="mt-7 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-[22px] bg-white/90 p-5 lg:p-6">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Ventas del rango
                    </p>
                    <p className="mt-3 text-3xl font-semibold leading-tight text-olive-950 break-words">
                      {formatCurrency(grossTotal)}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white/90 p-5 lg:p-6">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Comisión acumulada
                    </p>
                    <p className="mt-3 text-3xl font-semibold leading-tight text-olive-950 break-words">
                      {formatCurrency(commissionTotal)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[22px] bg-white/90 p-4 lg:p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Adelantos
                    </p>
                    <p className="mt-3 text-2xl font-semibold leading-tight text-olive-950 break-words">
                      {formatCurrency(advancesTotal)}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white/90 p-4 lg:p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Neto a pagar
                    </p>
                    <p className="mt-3 flex min-h-12 items-start gap-2 text-2xl font-semibold leading-tight text-olive-950">
                      <Wallet className="size-4 shrink-0 text-olive-700" />
                      <span className="break-words">{formatCurrency(netToPay)}</span>
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white/90 p-4 lg:p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Servicios
                    </p>
                    <p className="mt-3 flex min-h-12 items-start gap-2 text-2xl font-semibold leading-tight text-olive-950">
                      <Scissors className="size-4 shrink-0 text-olive-700" />
                      {servicesCount}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white/90 p-4 lg:p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Productos
                    </p>
                    <p className="mt-3 flex min-h-12 items-start gap-2 text-2xl font-semibold leading-tight text-olive-950">
                      <Package className="size-4 shrink-0 text-olive-700" />
                      {productsCount}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_1.4fr]">
                  <div className="rounded-[22px] border border-olive-950/8 bg-white/75 p-4 lg:p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Días con movimiento
                    </p>
                    <p className="mt-3 text-xl font-semibold leading-tight text-olive-950">
                      {daysWithMovement}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-olive-950/8 bg-white/75 p-4 lg:p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Promedio ventas
                      </p>
                      <p className="mt-3 text-lg font-semibold leading-tight text-olive-950 break-words">
                        {formatCurrency(averageSales)}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-olive-950/8 bg-white/75 p-4 lg:p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Promedio comisión
                      </p>
                      <p className="mt-3 text-lg font-semibold leading-tight text-olive-950 break-words">
                        {formatCurrency(averageCommission)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-7">
                  <div className="flex flex-col gap-3 border-b border-olive-950/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-base font-semibold text-olive-950">
                        Historial del rango
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Resumen diario y detalle de movimientos dentro del período seleccionado.
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {formatDateLabel(teamDateRange.from)} - {formatDateLabel(teamDateRange.to)}
                    </p>
                  </div>

                  {professionalSales.length ? (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-[22px] border border-olive-950/8 bg-white/92 p-5 lg:p-6">
                        <p className="text-sm font-semibold text-olive-950">
                          Resumen diario dentro del rango
                        </p>
                        <div className="mt-4 space-y-3">
                          {dailyHistory.map((entry) => (
                            <div
                              key={`${professional.id}-${entry.date}`}
                              className="grid gap-4 rounded-[20px] bg-[#f7f4ea] px-4 py-4 text-sm lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)]"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-olive-950">
                                  {formatDateLabel(entry.date)}
                                </p>
                                <p className="mt-1 leading-relaxed text-muted-foreground">
                                  {entry.servicesCount} servicios · {entry.productsCount} productos
                                </p>
                              </div>
                              <div className="grid gap-2 lg:justify-items-end">
                                <p className="font-semibold text-olive-950">
                                  {formatCurrency(entry.grossTotal)}
                                </p>
                                <p className="leading-relaxed text-muted-foreground">
                                  Comisión {formatCurrency(entry.commissionTotal)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {professionalSales.map((sale) => (
                        <div
                          key={sale.id}
                          className="rounded-[22px] border border-olive-950/8 bg-white/92 p-5 lg:p-6"
                        >
                          <div className="flex flex-col gap-3 border-b border-olive-950/8 pb-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <p className="text-base font-medium leading-snug text-olive-950">
                                {sale.service}
                              </p>
                              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                {sale.clientName} · {formatDateLabel(sale.saleDate)}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-olive-700">
                              {sale.createdAt}
                            </p>
                          </div>
                          <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            <div className="rounded-[18px] bg-[#f7f4ea] px-4 py-3.5 text-sm">
                              <p className="text-muted-foreground">Monto bruto</p>
                              <p className="mt-2 text-lg font-semibold leading-tight text-olive-950">
                                {formatCurrency(sale.grossAmount)}
                              </p>
                            </div>
                            <div className="rounded-[18px] bg-[#f7f4ea] px-4 py-3.5 text-sm">
                              <p className="text-muted-foreground">Comisión</p>
                              <p className="mt-2 text-lg font-semibold leading-tight text-olive-950">
                                {formatCurrency(sale.commissionValue)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[22px] border border-dashed border-olive-950/12 bg-white/75 px-5 py-6 text-sm leading-relaxed text-muted-foreground">
                      No hay movimientos registrados para este profesional dentro del rango seleccionado.
                    </div>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}
