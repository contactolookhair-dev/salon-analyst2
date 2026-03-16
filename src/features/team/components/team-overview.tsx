"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { branches } from "@/features/branches/data/mock-branches";
import { Card } from "@/shared/components/ui/card";
import { useBranch } from "@/shared/context/branch-context";
import {
  countOperatingDaysInMonth,
  getBranchById,
  isBranchOpenOnDate,
} from "@/shared/lib/branch-operations";
import {
  notifySaleMutation,
  subscribeSaleMutation,
} from "@/shared/lib/business-snapshot-events";
import { formatCurrency } from "@/shared/lib/utils";
import type { Advance, Professional, Sale } from "@/shared/types/business";

const TEAM_DATE_RANGE_STORAGE_KEY = "salon-analyst2-team-date-range";

type TeamOverviewProps = {
  professionals: Professional[];
  sales: Sale[];
  advances?: Advance[];
  onRegistered?: () => void;
  initialRangeMode?: "persisted" | "latest-sales-month";
};

type TeamDateRange = {
  from: string;
  to: string;
};

type SalesDateSortOrder = "date_desc" | "date_asc";

type TeamProfessionalEntry = {
  key: string;
  professional: Professional;
  sales: Sale[];
  grossTotal: number;
  netTotal: number;
  commissionTotal: number;
  advancesTotal: number;
  accruedSalary: number;
  netPayTotal: number;
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

type AdvanceFormState = {
  personId: string;
  amount: number;
  date: string;
  branchId: string;
  type: Advance["type"];
  note: string;
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

function getMonthRange(baseDate: string): TeamDateRange {
  const current = new Date(`${baseDate}T12:00:00.000Z`);
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0, 12, 0, 0));

  return {
    from: `${baseDate.slice(0, 8)}01`,
    to: lastDay.toISOString().slice(0, 10),
  };
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

function isDateInRange(dateValue: string, range: TeamDateRange) {
  return dateValue >= range.from && dateValue <= range.to;
}

function getDefaultTeamDateRange(today: string): TeamDateRange {
  return {
    from: getStartOfMonth(today),
    to: today,
  };
}

export function TeamOverview({
  professionals,
  sales,
  advances = [],
  onRegistered,
  initialRangeMode = "persisted",
}: TeamOverviewProps) {
  const { branch: selectedBranch } = useBranch();
  const today = useMemo(() => getTodayChileDateString(), []);
  const [teamDateRange, setTeamDateRange] = useState<TeamDateRange>(() =>
    getDefaultTeamDateRange(today)
  );
  const [editingSale, setEditingSale] = useState<EditableSaleState | null>(null);
  const [isSavingSale, setIsSavingSale] = useState(false);
  const [saleActionError, setSaleActionError] = useState<string | null>(null);
  const [salesProfessionalFilter, setSalesProfessionalFilter] = useState<"all" | string>("all");
  const [salesDateSortOrder, setSalesDateSortOrder] =
    useState<SalesDateSortOrder>("date_desc");
  const [advanceForm, setAdvanceForm] = useState<AdvanceFormState>({
    personId: "",
    amount: 0,
    date: today,
    branchId: selectedBranch === "all" ? "" : selectedBranch,
    type: "advance",
    note: "",
  });
  const [isSavingAdvance, setIsSavingAdvance] = useState(false);
  const [advanceActionError, setAdvanceActionError] = useState<string | null>(null);

  const selectedAdvanceProfessional = useMemo(
    () => professionals.find((professional) => professional.id === advanceForm.personId) ?? null,
    [professionals, advanceForm.personId]
  );

  const latestRelevantSaleDate = useMemo(() => {
    const relevantSales = sales.filter((sale) =>
      selectedBranch === "all" ? true : sale.branchId === selectedBranch
    );

    if (relevantSales.length === 0) {
      return null;
    }

    return [...relevantSales]
      .sort((left, right) =>
        `${right.saleDate}T${right.createdAt}`.localeCompare(
          `${left.saleDate}T${left.createdAt}`
        )
      )[0]?.saleDate ?? null;
  }, [sales, selectedBranch]);

  useEffect(() => {
    if (initialRangeMode === "latest-sales-month") {
      if (latestRelevantSaleDate) {
        setTeamDateRange((current) => {
          const nextRange = getMonthRange(latestRelevantSaleDate);
          return current.from === nextRange.from && current.to === nextRange.to
            ? current
            : nextRange;
        });
      }
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(TEAM_DATE_RANGE_STORAGE_KEY);

      if (!storedValue) {
        return;
      }

      const parsedValue = JSON.parse(storedValue) as Partial<TeamDateRange>;

      if (parsedValue.from && parsedValue.to) {
        const nextRange = {
          from: parsedValue.from,
          to: parsedValue.to,
        };
        setTeamDateRange(nextRange);
      }
    } catch {
      // Ignore malformed stored ranges and keep the in-memory default.
    }
  }, [initialRangeMode, latestRelevantSaleDate, sales, selectedBranch]);

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

  useEffect(() => {
    setAdvanceForm((current) => ({
      ...current,
      branchId: selectedBranch === "all" ? current.branchId : selectedBranch,
    }));
  }, [selectedBranch]);

  useEffect(() => {
    if (!selectedAdvanceProfessional) {
      return;
    }

    setAdvanceForm((current) => {
      const nextBranchId =
        current.branchId ||
        (selectedBranch === "all"
          ? selectedAdvanceProfessional.primaryBranchId ?? current.branchId
          : current.branchId);

      if (selectedAdvanceProfessional.paymentMode === "partner_draw") {
        if (
          current.type === "partner_withdrawal" &&
          current.branchId === nextBranchId
        ) {
          return current;
        }

        return {
          ...current,
          type: "partner_withdrawal",
          branchId: nextBranchId,
        };
      }

      if (current.type !== "partner_withdrawal" && current.branchId === nextBranchId) {
        return current;
      }

      return {
        ...current,
        type: current.type === "partner_withdrawal" ? "advance" : current.type,
        branchId: nextBranchId,
      };
    });
  }, [selectedAdvanceProfessional, selectedBranch]);

  useEffect(() => {
    return subscribeSaleMutation((payload) => {
      if ((payload.action === "created" || payload.action === "updated") && payload.saleDate) {
        setTeamDateRange(getMonthRange(payload.saleDate));
      }
    });
  }, []);

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
          const netTotal = professionalSales.reduce((total, sale) => total + sale.netAmount, 0);
          const baseCommissionTotal = professionalSales.reduce(
            (total, sale) => total + sale.commissionValue,
            0
          );
          const commissionTotal =
            professional.commissionsEnabled === false ? 0 : baseCommissionTotal;
          const advancesTotal = advances
            .filter(
              (advance) =>
                advance.personId === professional.id &&
                advance.branchId === branchId &&
                isDateInRange(advance.date, teamDateRange)
            )
            .reduce((total, advance) => total + advance.amount, 0);

          let accruedSalary = 0;
          const monthlySalary =
            professional.paymentMode === "fixed_salary" || professional.paymentMode === "mixed"
              ? professional.monthlySalary ?? 0
              : 0;
          const branch = getBranchById(branchId, branches);

          if (branch && monthlySalary > 0) {
            let cursor = new Date(`${teamDateRange.from}T12:00:00.000Z`);
            const end = new Date(`${teamDateRange.to}T12:00:00.000Z`);

            while (cursor.getTime() <= end.getTime()) {
              if (isBranchOpenOnDate(branch, cursor)) {
                const operatingDays = countOperatingDaysInMonth(branch, cursor);

                if (operatingDays > 0) {
                  accruedSalary += monthlySalary / operatingDays;
                }
              }

              cursor.setUTCDate(cursor.getUTCDate() + 1);
            }
          }

          let netPayTotal = commissionTotal - advancesTotal;

          if (professional.paymentMode === "fixed_salary") {
            netPayTotal = accruedSalary - advancesTotal;
          } else if (professional.paymentMode === "mixed") {
            netPayTotal = accruedSalary + commissionTotal - advancesTotal;
          } else if (professional.paymentMode === "partner_draw") {
            netPayTotal = -advancesTotal;
          }

          return {
            key: `${professional.id}-${branchId}`,
            professional,
            sales: professionalSales,
            grossTotal,
            netTotal,
            commissionTotal,
            advancesTotal,
            accruedSalary: Math.round(accruedSalary),
            netPayTotal: Math.round(netPayTotal),
          };
        });
      })
      .filter((entry) => entry.professional.active || entry.sales.length > 0);
  }, [advances, professionals, sales, selectedBranch, teamDateRange]);

  const salesInRange = useMemo(() => {
    return sales
      .filter((sale) => isSaleInRange(sale.saleDate, teamDateRange))
      .sort((left, right) =>
        `${right.saleDate}T${right.createdAt}`.localeCompare(
          `${left.saleDate}T${left.createdAt}`
        )
      );
  }, [sales, teamDateRange]);

  const salesProfessionalsInRange = useMemo(() => {
    return Array.from(
      salesInRange.reduce((map, sale) => {
        const professional =
          professionals.find((candidate) => candidate.id === sale.professionalId) ?? null;
        const name = professional?.name ?? sale.professionalId;

        if (!map.has(sale.professionalId)) {
          map.set(sale.professionalId, {
            id: sale.professionalId,
            name,
          });
        }

        return map;
      }, new Map<string, { id: string; name: string }>())
    )
      .map(([, value]) => value)
      .sort((left, right) => left.name.localeCompare(right.name, "es"));
  }, [professionals, salesInRange]);

  const visibleSalesInRange = useMemo(() => {
    const filteredSales =
      salesProfessionalFilter === "all"
        ? salesInRange
        : salesInRange.filter((sale) => sale.professionalId === salesProfessionalFilter);

    return [...filteredSales].sort((left, right) => {
      const leftValue = `${left.saleDate}T${left.createdAt}`;
      const rightValue = `${right.saleDate}T${right.createdAt}`;

      return salesDateSortOrder === "date_asc"
        ? leftValue.localeCompare(rightValue)
        : rightValue.localeCompare(leftValue);
    });
  }, [salesDateSortOrder, salesInRange, salesProfessionalFilter]);

  const visibleSalesTotals = useMemo(() => {
    return visibleSalesInRange.reduce(
      (totals, sale) => {
        totals.count += 1;
        totals.gross += sale.grossAmount;
        totals.commission += sale.commissionValue;
        return totals;
      },
      {
        count: 0,
        gross: 0,
        commission: 0,
      }
    );
  }, [visibleSalesInRange]);

  const visibleAdvances = useMemo(() => {
    return advances
      .filter(
        (advance) =>
          isDateInRange(advance.date, teamDateRange) &&
          (selectedBranch === "all" || advance.branchId === selectedBranch)
      )
      .sort((left, right) => right.date.localeCompare(left.date));
  }, [advances, selectedBranch, teamDateRange]);

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

      notifySaleMutation({
        action: "deleted",
        professionalName:
          professionals.find((professional) => professional.id === sale.professionalId)?.name ??
          sale.professionalId,
        clientName: sale.clientName,
        grossAmount: sale.grossAmount,
      });
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

      notifySaleMutation({
        action: "updated",
        professionalName: editingSale.professionalName,
        clientName: editingSale.clientName,
        grossAmount: editingSale.grossAmount,
        saleDate: editingSale.date,
      });
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

  async function handleCreateAdvance() {
    if (!advanceForm.personId || !advanceForm.branchId || advanceForm.amount <= 0) {
      setAdvanceActionError("Completa persona, sucursal y monto para registrar el movimiento.");
      return;
    }

    try {
      setIsSavingAdvance(true);
      setAdvanceActionError(null);
      const response = await fetch("/api/advances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(advanceForm),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "No se pudo registrar el movimiento.");
      }

      setAdvanceForm({
        personId: "",
        amount: 0,
        date: today,
        branchId: selectedBranch === "all" ? "" : selectedBranch,
        type: "advance",
        note: "",
      });
      onRegistered?.();
    } catch (error) {
      setAdvanceActionError(
        error instanceof Error ? error.message : "No se pudo registrar el movimiento."
      );
    } finally {
      setIsSavingAdvance(false);
    }
  }

  async function handleDeleteAdvance(advance: Advance) {
    const confirmed = window.confirm("¿Eliminar este movimiento?");

    if (!confirmed) {
      return;
    }

    try {
      setIsSavingAdvance(true);
      setAdvanceActionError(null);
      const response = await fetch(`/api/advances?id=${encodeURIComponent(advance.id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "No se pudo eliminar el movimiento.");
      }

      onRegistered?.();
    } catch (error) {
      setAdvanceActionError(
        error instanceof Error ? error.message : "No se pudo eliminar el movimiento."
      );
    } finally {
      setIsSavingAdvance(false);
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
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-olive-700/80">
              Este bloque es editable: cambia “Fecha desde” y “Fecha hasta” para ver el período que quieras.
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
              grossTotal,
              netTotal,
              commissionTotal,
              advancesTotal,
              accruedSalary,
              netPayTotal,
            } = entry;

            return (
              <div
                key={key}
                className="rounded-[28px] border border-olive-950/8 bg-[#fbfaf6] p-5 shadow-[0_14px_32px_rgba(42,45,31,0.08)]"
              >
                <div>
                  <p className="text-[1.35rem] font-semibold leading-tight text-olive-950">
                    {professional.name}
                  </p>
                  <p className="mt-2 text-[0.95rem] font-medium text-muted-foreground">
                    {professional.role}
                  </p>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[20px] bg-white/92 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Venta bruta total
                    </p>
                    <p className="mt-3 whitespace-nowrap text-[clamp(1.55rem,1.9vw,1.95rem)] font-semibold leading-none text-olive-950">
                      {formatCurrency(grossTotal)}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-white/92 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Venta neta total
                    </p>
                    <p className="mt-3 whitespace-nowrap text-[clamp(1.55rem,1.9vw,1.95rem)] font-semibold leading-none text-olive-950">
                      {formatCurrency(netTotal)}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-white/92 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Comisión total
                    </p>
                    <p className="mt-3 whitespace-nowrap text-[clamp(1.55rem,1.9vw,1.95rem)] font-semibold leading-none text-olive-950">
                      {formatCurrency(commissionTotal)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[20px] bg-white/92 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Sueldo proporcional
                    </p>
                    <p className="mt-3 whitespace-nowrap text-[clamp(1.2rem,1.5vw,1.55rem)] font-semibold leading-none text-olive-950">
                      {formatCurrency(accruedSalary)}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-white/92 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Adelantos
                    </p>
                    <p className="mt-3 whitespace-nowrap text-[clamp(1.2rem,1.5vw,1.55rem)] font-semibold leading-none text-olive-950">
                      {formatCurrency(advancesTotal)}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-white/92 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Neto a pagar
                    </p>
                    <p className="mt-3 whitespace-nowrap text-[clamp(1.2rem,1.5vw,1.55rem)] font-semibold leading-none text-olive-950">
                      {formatCurrency(netPayTotal)}
                    </p>
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>

      <Card className="space-y-5">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-olive-700">
            Movimientos
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-olive-950">
            Adelantos y retiros
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Registra adelantos, retiros de socio u otros descuentos para cualquier persona del equipo.
          </p>
        </div>

        {advanceActionError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {advanceActionError}
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.9fr_1fr]">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-olive-950">Persona</span>
            <select
              value={advanceForm.personId}
              onChange={(event) =>
                setAdvanceForm((current) => ({ ...current, personId: event.target.value }))
              }
              className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-olive-950"
            >
              <option value="">Selecciona persona</option>
              {professionals.map((professional) => (
                <option key={`advance-person-${professional.id}`} value={professional.id}>
                  {professional.name}
                  {professional.paymentMode === "partner_draw" ? " · Socio" : ""}
                </option>
              ))}
            </select>
            {selectedAdvanceProfessional?.paymentMode === "partner_draw" ? (
              <p className="text-xs text-muted-foreground">
                Este movimiento se registrará como retiro de socio.
              </p>
            ) : null}
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-olive-950">Monto</span>
            <input
              type="number"
              min={0}
              value={advanceForm.amount || ""}
              onChange={(event) =>
                setAdvanceForm((current) => ({
                  ...current,
                  amount: Number(event.target.value) || 0,
                }))
              }
              className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-olive-950">Fecha</span>
            <input
              type="date"
              value={advanceForm.date}
              onChange={(event) =>
                setAdvanceForm((current) => ({ ...current, date: event.target.value }))
              }
              className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-olive-950">Sucursal</span>
            <select
              value={advanceForm.branchId}
              onChange={(event) =>
                setAdvanceForm((current) => ({ ...current, branchId: event.target.value }))
              }
              className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-olive-950"
            >
              <option value="">Selecciona sucursal</option>
              {branches.map((branch) => (
                <option key={`advance-branch-${branch.id}`} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 xl:grid-cols-[0.9fr_1.4fr_auto]">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-olive-950">Tipo</span>
            <select
              value={advanceForm.type}
              onChange={(event) =>
                setAdvanceForm((current) => ({
                  ...current,
                  type: event.target.value as Advance["type"],
                }))
              }
              className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-olive-950"
            >
              <option value="advance">Adelanto</option>
              <option value="partner_withdrawal">Retiro de socio</option>
              <option value="other_discount">Otro descuento</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-olive-950">Nota</span>
            <input
              value={advanceForm.note}
              onChange={(event) =>
                setAdvanceForm((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="Observación opcional"
              className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void handleCreateAdvance()}
              disabled={isSavingAdvance}
              className="inline-flex items-center gap-2 rounded-full bg-olive-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Plus className="size-4" />
              {isSavingAdvance ? "Guardando..." : "Registrar movimiento"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {visibleAdvances.length ? (
            visibleAdvances.map((advance) => {
              const professional =
                professionals.find((item) => item.id === advance.personId) ?? null;

              return (
                <div
                  key={advance.id}
                  className="flex flex-col gap-3 rounded-[20px] border border-olive-950/8 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-olive-950">
                      {professional?.name ?? advance.personId}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateLabel(advance.date)} · {advance.branch}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {advance.type} {advance.note ? `· ${advance.note}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-semibold text-olive-950">
                      {formatCurrency(advance.amount)}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAdvance(advance)}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700"
                    >
                      <Trash2 className="size-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[20px] border border-dashed border-olive-950/10 bg-[#fbfaf6] px-4 py-5 text-sm text-muted-foreground">
              Aún no hay adelantos ni retiros registrados en el rango seleccionado.
            </div>
          )}
        </div>
      </Card>

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
            <p className="mt-2 text-xs text-muted-foreground">
              Este rango proviene del bloque superior “Control del equipo por rango de fechas”.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)_minmax(0,240px)]">
          <div className="rounded-[18px] border border-olive-950/8 bg-[#fbfaf6] px-4 py-3 text-sm text-muted-foreground">
            Este listado respeta el mismo rango activo y ahora puedes filtrarlo por estilista y ordenarlo por fecha.
          </div>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-olive-950">Filtrar por estilista</span>
            <select
              value={salesProfessionalFilter}
              onChange={(event) => setSalesProfessionalFilter(event.target.value)}
              className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-olive-950"
            >
              <option value="all">Todos los estilistas</option>
              {salesProfessionalsInRange.map((professional) => (
                <option key={`sales-filter-${professional.id}`} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-olive-950">Ordenar por fecha</span>
            <select
              value={salesDateSortOrder}
              onChange={(event) =>
                setSalesDateSortOrder(event.target.value as SalesDateSortOrder)
              }
              className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-olive-950"
            >
              <option value="date_desc">Más reciente primero</option>
              <option value="date_asc">Más antigua primero</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] border border-olive-950/8 bg-white/85 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Ventas visibles
            </p>
            <p className="mt-2 text-2xl font-semibold text-olive-950">
              {visibleSalesTotals.count}
            </p>
          </div>
          <div className="rounded-[18px] border border-olive-950/8 bg-white/85 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Monto bruto total
            </p>
            <p className="mt-2 text-2xl font-semibold text-olive-950">
              {formatCurrency(visibleSalesTotals.gross)}
            </p>
          </div>
          <div className="rounded-[18px] border border-olive-950/8 bg-white/85 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Comisión total
            </p>
            <p className="mt-2 text-2xl font-semibold text-olive-950">
              {formatCurrency(visibleSalesTotals.commission)}
            </p>
          </div>
        </div>

        {visibleSalesInRange.length ? (
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
                {visibleSalesInRange.map((sale) => (
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
              {visibleSalesInRange.map((sale) => (
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
            No hay ventas registradas con los filtros seleccionados dentro del rango activo.
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
