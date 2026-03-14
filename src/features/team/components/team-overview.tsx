"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  FileUp,
  Package,
  Pencil,
  PencilLine,
  Save,
  Scissors,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import { BranchLogo } from "@/features/branches/components/branch-logo";
import { branches as baseBranches } from "@/features/branches/data/mock-branches";
import {
  BRANCH_CONFIG_UPDATED_EVENT,
  loadEditableBranches,
} from "@/features/branches/lib/branch-config-storage";
import { SalesEntryWorkspace } from "@/features/sales-register/components/sales-entry-workspace";
import { Card } from "@/shared/components/ui/card";
import { useBranch } from "@/shared/context/branch-context";
import { formatCurrency } from "@/shared/lib/utils";
import type { Branch, Professional, Sale } from "@/shared/types/business";

const TEAM_DATE_RANGE_STORAGE_KEY = "salon-analyst2-team-date-range";

type TeamOverviewProps = {
  professionals: Professional[];
  sales: Sale[];
  onRegistered?: () => void;
};

type TeamDateRange = {
  from: string;
  to: string;
};

type TeamProfessionalEntry = {
  key: string;
  professional: Professional;
  branchId: Branch["id"] | null;
  branchName: string;
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

type EditableSaleState = {
  id: string;
  professionalId: string;
  professionalName: string;
  branchName: string;
  date: string;
  clientName: string;
  service: string;
  grossAmount: number;
  commissionValue: number;
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

function buildReportHtml(
  entry: TeamProfessionalEntry,
  range: TeamDateRange,
  branchConfigs: Branch[],
  selectedBranchId: Branch["id"] | "all"
) {
  const reportBranch =
    entry.branchId
      ? branchConfigs.find((branch) => branch.id === entry.branchId) ?? null
      : selectedBranchId !== "all"
      ? branchConfigs.find((branch) => branch.id === selectedBranchId) ?? null
      : branchConfigs.find((branch) => branch.id === entry.professional.primaryBranchId) ??
        branchConfigs.find((branch) => entry.professional.branchIds.includes(branch.id)) ??
        null;
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
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .logo-box {
          width: 88px;
          height: 88px;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid ${reportBranch?.primaryColor ?? "#d8dccd"}44;
          background: linear-gradient(135deg, ${reportBranch?.secondaryColor ?? "#f7f4ea"} 0%, #ffffff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .logo-box img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 10px;
        }
        .logo-fallback {
          padding: 10px;
          text-align: center;
          font-size: 12px;
          line-height: 1.3;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: ${reportBranch?.primaryColor ?? "#2f3626"};
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
        <div class="header">
          <div>
            <div class="eyebrow">SalonAnalyst2 · Informe individual</div>
            <h1>${escapeHtml(entry.professional.name)}</h1>
            <p class="subtle">
              ${escapeHtml(entry.professional.role)} · ${escapeHtml(entry.branchName || "General")}<br />
              Rango analizado: ${escapeHtml(formatDateLabel(range.from))} al ${escapeHtml(formatDateLabel(range.to))}
            </p>
          </div>
          <div class="logo-box">
            ${
              reportBranch?.logoUrl
                ? `<img src="${escapeHtml(reportBranch.logoUrl)}" alt="Logo ${escapeHtml(reportBranch.name)}" />`
                : `<div class="logo-fallback">${escapeHtml(reportBranch?.name ?? "Sucursal")}</div>`
            }
          </div>
        </div>

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

export function TeamOverview({ professionals, sales, onRegistered }: TeamOverviewProps) {
  const { branch: selectedBranch } = useBranch();
  const today = useMemo(() => getTodayChileDateString(), []);
  const [branchConfigs, setBranchConfigs] = useState<Branch[]>(baseBranches);
  const [teamDateRange, setTeamDateRange] = useState<TeamDateRange>(() =>
    getDefaultTeamDateRange(today)
  );
  const [expandedProfessionalId, setExpandedProfessionalId] = useState<string | null>(null);
  const [expandedMode, setExpandedMode] = useState<"scan" | "manual">("scan");
  const [editingSale, setEditingSale] = useState<EditableSaleState | null>(null);
  const [isSavingSale, setIsSavingSale] = useState(false);
  const [saleActionError, setSaleActionError] = useState<string | null>(null);

  useEffect(() => {
    const syncBranches = () => setBranchConfigs(loadEditableBranches());

    syncBranches();
    window.addEventListener(BRANCH_CONFIG_UPDATED_EVENT, syncBranches);

    return () => {
      window.removeEventListener(BRANCH_CONFIG_UPDATED_EVENT, syncBranches);
    };
  }, []);

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
      .flatMap((professional) => {
        const branchContexts =
          selectedBranch === "all"
            ? professional.branchIds
            : professional.branchIds.filter((branchId) => branchId === selectedBranch);

        return branchContexts.map((branchId) => {
          const professionalSales = sales
            .filter(
              (sale) =>
                sale.professionalId === professional.id &&
                sale.branchId === branchId &&
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
            key: `${professional.id}-${branchId}`,
            professional,
            branchId,
            branchName:
              branchConfigs.find((branch) => branch.id === branchId)?.name ?? branchId,
            sales: professionalSales,
            grossTotal,
            commissionTotal,
            advancesTotal,
            netToPay,
            servicesCount,
            productsCount,
            dailyHistory,
          };
        });
      })
      .filter((entry) => entry.professional.active || entry.sales.length > 0);
  }, [branchConfigs, professionals, sales, selectedBranch, teamDateRange]);

  const salesInRange = useMemo(() => {
    return sales
      .filter((sale) => isSaleInRange(sale.saleDate, teamDateRange))
      .sort((left, right) =>
        `${right.saleDate}T${right.createdAt}`.localeCompare(
          `${left.saleDate}T${left.createdAt}`
        )
      );
  }, [sales, teamDateRange]);

  function getSaleDetailLabel(sale: Sale) {
    if (sale.productName && sale.productName !== sale.service) {
      return `${sale.service} + ${sale.productName}`;
    }

    return sale.productName || sale.service;
  }

  function getSaleTypeLabel(sale: Sale) {
    if (sale.productName && sale.productName !== sale.service) {
      return "Servicio + producto";
    }

    return sale.productName ? "Producto" : "Servicio";
  }

  function handleExport(entry: TeamProfessionalEntry) {
    const reportWindow = window.open("", "_blank", "noopener,noreferrer,width=980,height=1080");

    if (!reportWindow) {
      window.alert("No pude abrir la ventana del informe. Revisa si el navegador bloqueó el popup.");
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(
      buildReportHtml(entry, teamDateRange, branchConfigs, selectedBranch)
    );
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  }

  function openEditSale(sale: Sale) {
    const professionalName =
      professionals.find((professional) => professional.id === sale.professionalId)?.name ??
      sale.professionalId;

    setSaleActionError(null);
    setEditingSale({
      id: sale.id,
      professionalId: sale.professionalId,
      professionalName,
      branchName: sale.branch,
      date: sale.saleDate,
      clientName: sale.clientName,
      service: sale.service,
      grossAmount: sale.grossAmount,
      commissionValue: sale.commissionValue,
    });
  }

  async function handleDeleteSale(sale: Sale) {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar la venta de ${sale.clientName} por ${formatCurrency(
        sale.grossAmount
      )}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsSavingSale(true);
      setSaleActionError(null);
      const response = await fetch(`/api/sales?id=${encodeURIComponent(sale.id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "No se pudo eliminar la venta.");
      }

      onRegistered?.();
    } catch (error) {
      setSaleActionError(
        error instanceof Error ? error.message : "No se pudo eliminar la venta."
      );
    } finally {
      setIsSavingSale(false);
    }
  }

  async function handleSaveSaleEdit() {
    if (!editingSale) {
      return;
    }

    try {
      setIsSavingSale(true);
      setSaleActionError(null);

      const response = await fetch("/api/sales", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingSale.id,
          date: editingSale.date,
          branch: editingSale.branchName,
          professional: editingSale.professionalName,
          professionalId: editingSale.professionalId,
          service: editingSale.service,
          total: editingSale.grossAmount,
          clientName: editingSale.clientName,
          commission: editingSale.commissionValue,
        }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "No se pudo editar la venta.");
      }

      setEditingSale(null);
      onRegistered?.();
    } catch (error) {
      setSaleActionError(
        error instanceof Error ? error.message : "No se pudo editar la venta."
      );
    } finally {
      setIsSavingSale(false);
    }
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

      <div className="grid gap-5 xl:grid-cols-2">
        {teamSalesByProfessional.map(
          (entry) => {
            const {
            key,
            professional,
            branchId,
            branchName,
            sales: professionalSales,
            grossTotal,
            commissionTotal,
            advancesTotal,
            netToPay,
            servicesCount,
            productsCount,
            dailyHistory,
            } = entry;
            const daysWithMovement = dailyHistory.length;
            const averageSales = daysWithMovement
              ? Math.round(grossTotal / daysWithMovement)
              : 0;
            const averageCommission = daysWithMovement
              ? Math.round(commissionTotal / daysWithMovement)
              : 0;

            return (
              <div
                key={key}
                className="rounded-[28px] border border-olive-950/8 bg-[#fbfaf6] p-5 shadow-[0_14px_32px_rgba(42,45,31,0.08)]"
              >
                <div className="flex flex-col gap-4 border-b border-olive-950/8 pb-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <BranchLogo
                      branch={
                        branchConfigs.find((branch) => branch.id === branchId) ??
                        branchConfigs.find(
                          (branch) =>
                            branch.id === professional.primaryBranchId ||
                            professional.branchIds.includes(branch.id)
                        ) ??
                        null
                      }
                      size="md"
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <p className="text-[1.2rem] font-semibold leading-tight text-olive-950 break-normal">
                        {professional.name}
                      </p>
                      <p className="text-[0.95rem] font-medium leading-relaxed text-muted-foreground break-normal">
                        {professional.role}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="max-w-full rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold leading-relaxed text-olive-700 whitespace-nowrap">
                          {branchName}
                        </span>
                        {professional.branchIds.length > 1 ? (
                          <span className="max-w-full rounded-full border border-olive-950/8 bg-[#f6f2ea] px-3 py-1 text-[11px] font-semibold leading-relaxed text-muted-foreground whitespace-nowrap">
                            Liquidación separada por sucursal
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedProfessionalId((current) =>
                          current === key ? null : key
                        );
                        setExpandedMode("scan");
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-olive-950/10 bg-olive-950 px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      <FileUp className="size-4" />
                      Subir boleta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedProfessionalId((current) =>
                          current === key ? null : key
                        );
                        setExpandedMode("manual");
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-olive-950/10 bg-white px-3.5 py-2 text-sm font-semibold text-olive-950 transition hover:bg-olive-950 hover:text-white"
                    >
                      <PencilLine className="size-4" />
                      Registro manual
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport(entry)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-olive-950/10 bg-white px-3.5 py-2 text-sm font-semibold text-olive-950 transition hover:bg-olive-950 hover:text-white"
                    >
                      <Download className="size-4" />
                      Exportar PDF
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 xl:grid-cols-2">
                  <div className="rounded-[20px] bg-white/90 p-4 lg:p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Ventas del rango
                    </p>
                    <p className="mt-2.5 whitespace-nowrap text-[clamp(2rem,2.4vw,2.45rem)] font-semibold leading-none text-olive-950">
                      {formatCurrency(grossTotal)}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-white/90 p-4 lg:p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Comisión acumulada
                    </p>
                    <p className="mt-2.5 whitespace-nowrap text-[clamp(2rem,2.4vw,2.45rem)] font-semibold leading-none text-olive-950">
                      {formatCurrency(commissionTotal)}
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[18px] bg-white/90 p-3.5 lg:p-4">
                    <p className="min-h-[2rem] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Adelantos
                    </p>
                    <p className="mt-2.5 whitespace-nowrap text-[clamp(1.55rem,1.7vw,1.8rem)] font-semibold leading-none text-olive-950">
                      {formatCurrency(advancesTotal)}
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-white/90 p-3.5 lg:p-4">
                    <p className="min-h-[2rem] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Neto a pagar
                    </p>
                    <div className="mt-2.5 flex min-h-[2.25rem] items-center gap-2 overflow-hidden">
                      <Wallet className="size-4 shrink-0 text-olive-700" />
                      <p className="truncate whitespace-nowrap text-[clamp(1.55rem,1.7vw,1.8rem)] font-semibold leading-none text-olive-950">
                        {formatCurrency(netToPay)}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-[18px] bg-white/90 p-3.5 lg:p-4">
                    <p className="min-h-[2rem] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Servicios
                    </p>
                    <div className="mt-2.5 flex min-h-[2.25rem] items-center gap-2">
                      <Scissors className="size-4 shrink-0 text-olive-700" />
                      <p className="whitespace-nowrap text-[clamp(1.55rem,1.7vw,1.8rem)] font-semibold leading-none text-olive-950">
                        {servicesCount}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-[18px] bg-white/90 p-3.5 lg:p-4">
                    <p className="min-h-[2rem] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Productos
                    </p>
                    <div className="mt-2.5 flex min-h-[2.25rem] items-center gap-2">
                      <Package className="size-4 shrink-0 text-olive-700" />
                      <p className="whitespace-nowrap text-[clamp(1.55rem,1.7vw,1.8rem)] font-semibold leading-none text-olive-950">
                        {productsCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 grid gap-2.5 md:grid-cols-3">
                  <div className="rounded-[18px] border border-olive-950/8 bg-white/75 p-3.5 lg:p-4">
                    <p className="min-h-[2rem] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Días con movimiento
                    </p>
                    <p className="mt-2.5 whitespace-nowrap text-[clamp(1.35rem,1.55vw,1.55rem)] font-semibold leading-none text-olive-950">
                      {daysWithMovement}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-olive-950/8 bg-white/75 p-3.5 lg:p-4">
                    <p className="min-h-[2rem] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Promedio ventas
                    </p>
                    <p className="mt-2.5 truncate whitespace-nowrap text-[clamp(1.35rem,1.55vw,1.55rem)] font-semibold leading-none text-olive-950">
                      {formatCurrency(averageSales)}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-olive-950/8 bg-white/75 p-3.5 lg:p-4">
                    <p className="min-h-[2rem] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Promedio comisión
                    </p>
                    <p className="mt-2.5 truncate whitespace-nowrap text-[clamp(1.35rem,1.55vw,1.55rem)] font-semibold leading-none text-olive-950">
                      {formatCurrency(averageCommission)}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
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
                    <div className="mt-4 space-y-3.5">
                      <div className="rounded-[20px] border border-olive-950/8 bg-white/92 p-4 lg:p-5">
                        <p className="text-sm font-semibold text-olive-950">
                          Resumen diario dentro del rango
                        </p>
                        <div className="mt-4 space-y-3">
                          {dailyHistory.map((entry) => (
                            <div
                              key={`${key}-${entry.date}`}
                              className="grid gap-3 rounded-[18px] bg-[#f7f4ea] px-3.5 py-3 text-sm lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)]"
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
                          className="rounded-[20px] border border-olive-950/8 bg-white/92 p-4 lg:p-5"
                        >
                          <div className="flex flex-col gap-3 border-b border-olive-950/8 pb-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <p className="text-[0.95rem] font-medium leading-snug text-olive-950">
                                {sale.service}
                              </p>
                              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                {sale.clientName} · {formatDateLabel(sale.saleDate)}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-olive-700">
                                {sale.createdAt}
                              </p>
                              <button
                                type="button"
                                onClick={() => openEditSale(sale)}
                                className="inline-flex items-center gap-1 rounded-full border border-olive-950/10 bg-white px-3 py-1.5 text-xs font-semibold text-olive-950 transition hover:bg-[#f7f4ea]"
                              >
                                <Pencil className="size-3.5" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteSale(sale)}
                                className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                              >
                                <Trash2 className="size-3.5" />
                                Eliminar
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
                            <div className="rounded-[16px] bg-[#f7f4ea] px-3.5 py-3 text-sm">
                              <p className="text-muted-foreground">Monto bruto</p>
                              <p className="mt-1.5 text-base font-semibold leading-tight text-olive-950">
                                {formatCurrency(sale.grossAmount)}
                              </p>
                            </div>
                            <div className="rounded-[16px] bg-[#f7f4ea] px-3.5 py-3 text-sm">
                              <p className="text-muted-foreground">Comisión</p>
                              <p className="mt-1.5 text-base font-semibold leading-tight text-olive-950">
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

                {expandedProfessionalId === key ? (
                  <div className="mt-7 border-t border-olive-950/8 pt-6">
                    <SalesEntryWorkspace
                      key={`${key}-${expandedMode}`}
                      professionals={professionals}
                      onRegistered={onRegistered}
                      embeddedProfessional={{
                        ...professional,
                        branchIds: branchId ? [branchId] : professional.branchIds,
                      }}
                      defaultMode={expandedMode}
                      layout="embedded"
                      onClose={() => setExpandedProfessionalId(null)}
                    />
                  </div>
                ) : null}
              </div>
            );
          }
        )}
      </div>

      <Card className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-olive-700">
              Ventas del período
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-olive-950">
              Listado general de ventas realizadas
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Este listado respeta el mismo rango de fechas activo del bloque “Control del equipo por rango de fechas”.
            </p>
          </div>
          <div className="rounded-[20px] bg-[#fbfaf6] px-4 py-3 text-sm">
            <p className="text-muted-foreground">Rango aplicado</p>
            <p className="mt-2 font-semibold text-olive-950">
              {formatDateLabel(teamDateRange.from)} - {formatDateLabel(teamDateRange.to)}
            </p>
          </div>
        </div>

        {salesInRange.length ? (
          <>
            <div className="hidden overflow-hidden rounded-[24px] border border-olive-950/8 xl:block">
              <div className="grid grid-cols-[0.9fr_1fr_2fr_1.1fr_1.1fr_1fr_1fr] gap-4 bg-[#f6f2ea] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <p>Fecha</p>
                <p>Profesional</p>
                <p>Detalle de la venta</p>
                <p>Venta</p>
                <p>Nombre del cliente</p>
                <p>Monto bruto</p>
                <p>Comisión</p>
              </div>
              <div className="divide-y divide-olive-950/8 bg-white">
                {salesInRange.map((sale) => (
                  <div
                    key={`sales-range-${sale.id}`}
                    className="grid grid-cols-[0.9fr_1fr_2fr_1fr_1.1fr_1fr_1fr_auto] gap-4 px-5 py-4 text-sm"
                  >
                    <p className="font-medium text-olive-950">
                      {formatDateLabel(sale.saleDate)}
                    </p>
                    <p className="text-olive-950">
                      {professionals.find((professional) => professional.id === sale.professionalId)?.name ??
                        sale.professionalId}
                    </p>
                    <p className="text-muted-foreground">
                      {getSaleDetailLabel(sale)}
                    </p>
                    <p className="text-muted-foreground">{getSaleTypeLabel(sale)}</p>
                    <p className="text-muted-foreground">{sale.clientName}</p>
                    <p className="font-semibold text-olive-950">
                      {formatCurrency(sale.grossAmount)}
                    </p>
                    <p className="font-semibold text-olive-950">
                      {formatCurrency(sale.commissionValue)}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditSale(sale)}
                        className="inline-flex items-center gap-1 rounded-full border border-olive-950/10 bg-white px-3 py-1.5 text-xs font-semibold text-olive-950 transition hover:bg-[#f7f4ea]"
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSale(sale)}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 className="size-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 xl:hidden">
              {salesInRange.map((sale) => (
                <div
                  key={`sales-range-mobile-${sale.id}`}
                  className="rounded-[22px] border border-olive-950/8 bg-white/92 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-olive-950">
                        {formatDateLabel(sale.saleDate)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {professionals.find((professional) => professional.id === sale.professionalId)?.name ??
                          sale.professionalId}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#f6f2ea] px-3 py-1 text-xs font-semibold text-olive-700">
                      {getSaleTypeLabel(sale)}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Detalle de la venta
                      </p>
                      <p className="mt-2 text-sm text-olive-950">
                        {getSaleDetailLabel(sale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Cliente
                      </p>
                      <p className="mt-2 text-sm text-olive-950">{sale.clientName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Monto bruto
                      </p>
                      <p className="mt-2 text-base font-semibold text-olive-950">
                        {formatCurrency(sale.grossAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Comisión
                      </p>
                      <p className="mt-2 text-base font-semibold text-olive-950">
                        {formatCurrency(sale.commissionValue)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditSale(sale)}
                      className="inline-flex items-center gap-1 rounded-full border border-olive-950/10 bg-white px-3 py-1.5 text-xs font-semibold text-olive-950 transition hover:bg-[#f7f4ea]"
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSale(sale)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      <Trash2 className="size-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-[22px] border border-dashed border-olive-950/12 bg-white/75 px-5 py-6 text-sm leading-relaxed text-muted-foreground">
            No hay ventas registradas dentro del rango seleccionado.
          </div>
        )}
      </Card>

      {editingSale ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 md:items-center">
          <Card className="w-full max-w-2xl border border-olive-950/10 bg-[#fcfaf5] shadow-[0_24px_60px_rgba(25,29,20,0.25)]">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-olive-700">
                    Editar venta
                  </p>
                  <h4 className="mt-2 text-2xl font-semibold text-olive-950">
                    Ajusta la venta registrada
                  </h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Puedes corregir fecha, cliente, detalle, monto bruto y comisión sin perder el historial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="rounded-full border border-olive-950/10 bg-white p-2 text-olive-950"
                >
                  <X className="size-4" />
                </button>
              </div>

              {saleActionError ? (
                <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {saleActionError}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Trabajador</span>
                  <input
                    value={editingSale.professionalName}
                    disabled
                    className="w-full rounded-2xl border border-olive-950/10 bg-[#f7f4ea] px-4 py-3 text-olive-950"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Sucursal</span>
                  <input
                    value={editingSale.branchName}
                    disabled
                    className="w-full rounded-2xl border border-olive-950/10 bg-[#f7f4ea] px-4 py-3 text-olive-950"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Fecha</span>
                  <input
                    type="date"
                    value={editingSale.date}
                    onChange={(event) =>
                      setEditingSale((current) =>
                        current
                          ? {
                              ...current,
                              date: event.target.value,
                            }
                          : current
                      )
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-olive-950"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Cliente</span>
                  <input
                    value={editingSale.clientName}
                    onChange={(event) =>
                      setEditingSale((current) =>
                        current
                          ? {
                              ...current,
                              clientName: event.target.value,
                            }
                          : current
                      )
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-olive-950"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.6fr_1fr_1fr]">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Detalle de la venta</span>
                  <input
                    value={editingSale.service}
                    onChange={(event) =>
                      setEditingSale((current) =>
                        current
                          ? {
                              ...current,
                              service: event.target.value,
                            }
                          : current
                      )
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-olive-950"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Monto bruto</span>
                  <input
                    type="number"
                    min={0}
                    value={editingSale.grossAmount}
                    onChange={(event) =>
                      setEditingSale((current) =>
                        current
                          ? {
                              ...current,
                              grossAmount: Number(event.target.value) || 0,
                            }
                          : current
                      )
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-olive-950"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-olive-950">Comisión</span>
                  <input
                    type="number"
                    min={0}
                    value={editingSale.commissionValue}
                    onChange={(event) =>
                      setEditingSale((current) =>
                        current
                          ? {
                              ...current,
                              commissionValue: Number(event.target.value) || 0,
                            }
                          : current
                      )
                    }
                    className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-olive-950"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="rounded-full border border-olive-950/10 bg-white px-4 py-2.5 text-sm font-semibold text-olive-950"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveSaleEdit()}
                  disabled={isSavingSale}
                  className="inline-flex items-center gap-2 rounded-full bg-olive-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Save className="size-4" />
                  Guardar cambios
                </button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
