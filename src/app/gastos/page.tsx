"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Coins,
  Eye,
  Paperclip,
  Pencil,
  Plus,
  Target,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import { branches as baseBranches } from "@/features/branches/data/mock-branches";
import { loadEditableBranches } from "@/features/branches/lib/branch-config-storage";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { Card } from "@/shared/components/ui/card";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { useBranch } from "@/shared/context/branch-context";
import { useBusinessSnapshot } from "@/shared/hooks/use-business-snapshot";
import { notifyBusinessSnapshotUpdated } from "@/shared/lib/business-snapshot-events";
import {
  countOperatingDaysInMonth,
  getBranchStatus,
  getDailyExpenseQuota,
} from "@/shared/lib/branch-operations";
import { getTodayChileDateString } from "@/shared/lib/safe-date";
import { formatCurrency } from "@/shared/lib/utils";
import type {
  Branch,
  BranchId,
  Expense,
  ExpenseProrationMode,
  ExpenseType,
  PaymentStatus,
} from "@/shared/types/business";

const EXPENSE_CATEGORIES = [
  "arriendo",
  "operación",
  "software",
  "marketing",
  "personal",
  "insumos",
  "atención",
  "servicios",
  "otros",
] as const;

const FIXED_NAME_SUGGESTIONS = [
  "Arriendo",
  "Luz",
  "Internet",
  "Software",
  "Publicidad fija",
  "Crédito",
];

const VARIABLE_NAME_SUGGESTIONS = [
  "Insumos",
  "Atención",
  "Compra puntual",
  "Movilización",
  "Reparación",
  "Caja chica",
];

type TypeFilter = "all" | ExpenseType;

type ExpenseFormState = {
  id?: string;
  title: string;
  amount: string;
  type: ExpenseType;
  branchId: BranchId;
  category: string;
  date: string;
  time: string;
  notes: string;
  active: boolean;
  prorationMode: ExpenseProrationMode;
  dueDate: string;
};

type PaymentFormState = {
  expenseId: string;
  title: string;
  totalAmount: number;
  paidAmount: string;
  paidDate: string;
  paymentMethod: string;
  paymentNote: string;
  paymentStatus: PaymentStatus;
  paymentProofName: string;
  paymentProofDataUrl: string;
  dueDate: string;
};

const DEFAULT_TIME = "09:00";

function getDefaultBranchId(selectedBranch: ReturnType<typeof useBranch>["branch"]) {
  return selectedBranch === "all" ? "house-of-hair" : selectedBranch;
}

function getBranchById(branchId: BranchId, branchConfigs: Branch[]) {
  return branchConfigs.find((item) => item.id === branchId) ?? baseBranches[0];
}

function buildFormState(
  selectedBranch: ReturnType<typeof useBranch>["branch"],
  branchConfigs: Branch[],
  expense?: Expense
): ExpenseFormState {
  const branchId = expense?.branchId ?? getDefaultBranchId(selectedBranch);
  const branchConfig = getBranchById(branchId, branchConfigs);

  return {
    id: expense?.id,
    title: expense?.title ?? "",
    amount: String(expense?.monthlyAmount ?? expense?.amount ?? ""),
    type: expense?.type ?? "variable",
    branchId,
    category: expense?.category?.toLowerCase() ?? "operación",
    date: expense?.expenseDate ?? getTodayChileDateString(),
    time: expense?.createdAt ?? DEFAULT_TIME,
    notes: expense?.notes ?? "",
    active: expense?.active ?? true,
    prorationMode:
      expense?.prorationMode ?? branchConfig.fixedExpenseProrationMode,
    dueDate: expense?.dueDate ?? "",
  };
}

function buildPaymentFormState(expense: Expense): PaymentFormState {
  return {
    expenseId: expense.id,
    title: expense.title,
    totalAmount: expense.monthlyAmount ?? expense.amount,
    paidAmount: String(expense.paidAmount ?? 0),
    paidDate: expense.paidDate ?? getTodayChileDateString(),
    paymentMethod: expense.paymentMethod ?? "",
    paymentNote: expense.paymentNote ?? "",
    paymentStatus: expense.paymentStatus ?? "pending",
    paymentProofName: expense.paymentProofName ?? "",
    paymentProofDataUrl: expense.paymentProofDataUrl ?? "",
    dueDate: expense.dueDate ?? "",
  };
}

function getFixedDailyQuota(expense: Expense, branchConfigs: Branch[], currentDate: Date) {
  const branchConfig = branchConfigs.find((item) => item.id === expense.branchId);

  if (!branchConfig) {
    return 0;
  }

  return getDailyExpenseQuota(
    {
      amount: expense.amount,
      monthlyAmount: expense.monthlyAmount ?? expense.amount,
      prorationMode: expense.prorationMode,
      type: "fixed",
      active: expense.active,
    },
    branchConfig,
    currentDate
  );
}

function getContributionMarginRatio(snapshot: ReturnType<typeof useBusinessSnapshot>["snapshot"]) {
  const totalNet = snapshot.sales.reduce((sum, sale) => sum + sale.netAmount, 0);

  if (totalNet <= 0) {
    return 1;
  }

  const totalContribution = snapshot.sales.reduce((sum, sale) => {
    const commission =
      sale.commissionType === "percentage"
        ? Math.round(sale.netAmount * sale.commissionValue)
        : sale.commissionValue;

    return sum + (sale.netAmount - commission - sale.cost);
  }, 0);

  return totalContribution > 0 ? totalContribution / totalNet : 1;
}

export default function GastosPage() {
  const { branch } = useBranch();
  const { snapshot, refresh, isLoading } = useBusinessSnapshot(branch);
  const [branchConfigs, setBranchConfigs] = useState<Branch[]>(baseBranches);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [form, setForm] = useState<ExpenseFormState>(() =>
    buildFormState(branch, baseBranches)
  );
  const [paymentForm, setPaymentForm] = useState<PaymentFormState | null>(null);
  const [formError, setFormError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setBranchConfigs(loadEditableBranches());
  }, []);

  const today = getTodayChileDateString();
  const currentDate = useMemo(() => new Date(`${today}T12:00:00.000Z`), [today]);

  const fixedExpenses = useMemo(() => {
    return snapshot.expenses
      .filter((expense) => expense.type === "fixed")
      .map((expense) => ({
        ...expense,
        dailyAmount: getFixedDailyQuota(expense, branchConfigs, currentDate),
      }))
      .sort((left, right) => left.title.localeCompare(right.title));
  }, [branchConfigs, currentDate, snapshot.expenses]);

  const variableExpensesToday = useMemo(() => {
    return snapshot.expenses
      .filter(
        (expense) =>
          expense.type === "variable" &&
          expense.expenseDate === today &&
          expense.active
      )
      .sort((left, right) =>
        `${right.expenseDate}T${right.createdAt}`.localeCompare(
          `${left.expenseDate}T${left.createdAt}`
        )
      );
  }, [snapshot.expenses, today]);

  const filteredFixedExpenses =
    typeFilter === "variable" ? [] : fixedExpenses;
  const filteredVariableExpenses =
    typeFilter === "fixed" ? [] : variableExpensesToday;

  const monthlyFixedTotal = filteredFixedExpenses
    .filter((expense) => expense.active)
    .reduce((sum, expense) => sum + (expense.monthlyAmount ?? expense.amount), 0);
  const fixedDailyQuota = filteredFixedExpenses
    .filter((expense) => expense.active)
    .reduce((sum, expense) => sum + (expense.dailyAmount ?? 0), 0);
  const variableDailyTotal = filteredVariableExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const totalDailyExpenses = fixedDailyQuota + variableDailyTotal;
  const contributionMarginRatio = getContributionMarginRatio(snapshot);
  const breakEvenDailyNet = Math.round(totalDailyExpenses / contributionMarginRatio);
  const monthlyPendingTotal = filteredFixedExpenses.reduce(
    (sum, expense) => sum + Math.max(expense.balancePending ?? 0, 0),
    0
  );

  const selectedBranchConfig =
    branch === "all" ? null : branchConfigs.find((item) => item.id === branch) ?? null;
  const isClosedToday =
    selectedBranchConfig &&
    getBranchStatus(selectedBranchConfig, currentDate) === "closed";

  function openCreateModal(expenseType: ExpenseType = "variable") {
    const nextState = buildFormState(branch, branchConfigs);
    const defaultBranch = getBranchById(nextState.branchId, branchConfigs);

    setForm({
      ...nextState,
      type: expenseType,
      prorationMode: defaultBranch.fixedExpenseProrationMode,
    });
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(expense: Expense) {
    setForm(buildFormState(branch, branchConfigs, expense));
    setFormError("");
    setIsModalOpen(true);
  }

  function openPaymentModal(expense: Expense) {
    setPaymentForm(buildPaymentFormState(expense));
    setPaymentError("");
    setIsPaymentModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setFormError("");
  }

  function closePaymentModal() {
    if (isSaving) {
      return;
    }

    setIsPaymentModalOpen(false);
    setPaymentForm(null);
    setPaymentError("");
  }

  async function persistExpense(method: "POST" | "PATCH") {
    setIsSaving(true);
    setFormError("");

    try {
      const response = await fetch("/api/expenses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          title: form.title,
          amount: Number(form.amount),
          type: form.type,
          branchId: form.branchId,
          category: form.category,
          date: form.date,
          time: form.time,
          notes: form.notes,
          active: form.active,
          prorationMode: form.prorationMode,
          dueDate: form.dueDate,
        }),
      });

      const payload = (await response.json()) as { success: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No pude guardar el gasto.");
      }

      notifyBusinessSnapshotUpdated();
      await refresh();
      setIsModalOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "No pude guardar el gasto."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!form.id) {
      return;
    }

    if (!window.confirm("¿Seguro que deseas eliminar este gasto?")) {
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const response = await fetch("/api/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.id }),
      });

      const payload = (await response.json()) as { success: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No pude eliminar el gasto.");
      }

      notifyBusinessSnapshotUpdated();
      await refresh();
      setIsModalOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "No pude eliminar el gasto."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePaymentSave() {
    if (!paymentForm) {
      return;
    }

    const expense = snapshot.expenses.find((item) => item.id === paymentForm.expenseId);

    if (!expense) {
      setPaymentError("No pude encontrar el gasto a pagar.");
      return;
    }

    setIsSaving(true);
    setPaymentError("");

    try {
      const response = await fetch("/api/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: expense.id,
          title: expense.title,
          amount: expense.monthlyAmount ?? expense.amount,
          type: expense.type,
          branchId: expense.branchId,
          category: expense.category,
          date: expense.expenseDate,
          time: expense.createdAt,
          notes: expense.notes ?? "",
          active: expense.active,
          prorationMode: expense.prorationMode,
          dueDate: paymentForm.dueDate,
          paymentStatus: paymentForm.paymentStatus,
          paidAmount: Number(paymentForm.paidAmount || 0),
          paidDate: paymentForm.paidDate,
          paymentMethod: paymentForm.paymentMethod,
          paymentNote: paymentForm.paymentNote,
          paymentProofName: paymentForm.paymentProofName,
          paymentProofDataUrl: paymentForm.paymentProofDataUrl,
        }),
      });

      const payload = (await response.json()) as { success: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No pude guardar el pago.");
      }

      notifyBusinessSnapshotUpdated();
      await refresh();
      closePaymentModal();
    } catch (error) {
      setPaymentError(
        error instanceof Error ? error.message : "No pude guardar el pago."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const dailyQuotaPreview =
    form.type === "fixed" && form.amount
      ? getDailyExpenseQuota(
          {
            amount: Number(form.amount),
            monthlyAmount: Number(form.amount),
            prorationMode: form.prorationMode,
            type: "fixed",
            active: form.active,
          },
          getBranchById(form.branchId, branchConfigs),
          new Date(`${form.date || today}T12:00:00.000Z`)
        )
      : 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionHeading
          eyebrow="Gastos"
          title="Gastos filtrados por sucursal"
          description="Panel administrativo para controlar gastos fijos, variables y el peso diario real del negocio."
        />
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex rounded-full border border-olive-950/10 bg-white/70 p-1">
            {(["all", "fixed", "variable"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTypeFilter(item)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  typeFilter === item
                    ? "bg-olive-950 text-white"
                    : "text-olive-700 hover:bg-[#f3f1e8]"
                }`}
              >
                {item === "all"
                  ? "Todos"
                  : item === "fixed"
                    ? "Fijos"
                    : "Variables"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openCreateModal("variable")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-olive-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-olive-900"
          >
            <Plus className="size-4" />
            Nuevo gasto
          </button>
        </div>
      </div>

      {selectedBranchConfig ? (
        <Card className="bg-[#fbfaf6]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-olive-700">
                Estado operativo
              </p>
              <h3 className="mt-2 text-xl font-semibold text-olive-950">
                {selectedBranchConfig.name}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {isClosedToday
                  ? "Sucursal cerrada hoy. Meta comercial no exigible, pero el gasto fijo del día sigue aplicando."
                  : "Sucursal operativa hoy. El punto de equilibrio se evalúa con cuota fija y gastos variables vigentes."}
              </p>
            </div>
            <div className="rounded-[24px] border border-olive-950/8 bg-white px-5 py-4">
              <p className="text-sm font-semibold text-olive-950">
                {isClosedToday ? "Cerrado hoy" : "Operativa hoy"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {countOperatingDaysInMonth(selectedBranchConfig, currentDate)} días operativos este mes
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Gastos fijos mensuales"
          value={formatCurrency(monthlyFixedTotal)}
          helper="Suma activa de compromisos mensuales registrados."
          icon={<Wallet className="size-5" />}
        />
        <MetricCard
          label="Cuota diaria gastos fijos"
          value={formatCurrency(fixedDailyQuota)}
          helper="Prorrateada por calendario u operación según cada gasto."
          icon={<CalendarDays className="size-5" />}
        />
        <MetricCard
          label="Gastos variables de hoy"
          value={formatCurrency(variableDailyTotal)}
          helper="Solo movimientos variables registrados para hoy."
          icon={<Coins className="size-5" />}
        />
        <MetricCard
          label="Total gastos del día"
          value={formatCurrency(totalDailyExpenses)}
          helper="Cuota fija del día más variables del día."
          icon={<BarChart3 className="size-5" />}
        />
        <MetricCard
          label="Punto de equilibrio diario"
          value={formatCurrency(breakEvenDailyNet)}
          helper="Venta neta estimada necesaria para cubrir el gasto del día."
          icon={<Target className="size-5" />}
        />
        <MetricCard
          label="Saldo pendiente del mes"
          value={formatCurrency(monthlyPendingTotal)}
          helper="Caja aún pendiente por pagar en gastos fijos activos."
          icon={<Coins className="size-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {typeFilter !== "variable" ? (
          <Card className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gestión de gastos fijos</p>
                <h3 className="mt-1 text-xl font-semibold text-olive-950">
                  Compromisos mensuales
                </h3>
              </div>
              <button
                type="button"
                onClick={() => openCreateModal("fixed")}
                className="rounded-full border border-olive-950/10 px-4 py-2 text-sm font-semibold text-olive-950 transition hover:bg-[#f5f3eb]"
              >
                Agregar fijo
              </button>
            </div>

            <div className="space-y-3">
              {filteredFixedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="grid gap-4 rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] p-4 xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr_auto]"
                >
                  <div>
                    <p className="font-semibold text-olive-950">{expense.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {expense.branch} · {expense.category}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {expense.paymentStatus === "paid"
                        ? `Pagado el ${expense.paidDate ?? "-"}`
                        : expense.paymentStatus === "partial"
                          ? `Pago parcial · saldo ${formatCurrency(expense.balancePending ?? 0)}`
                          : `Pendiente · saldo ${formatCurrency(expense.balancePending ?? 0)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-olive-700">
                      Monto mensual
                    </p>
                    <p className="mt-2 font-semibold text-olive-950">
                      {formatCurrency(expense.monthlyAmount ?? expense.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-olive-700">
                      Prorrateo
                    </p>
                    <p className="mt-2 text-sm font-medium text-olive-950">
                      {expense.prorationMode === "operating_days"
                        ? "Días operativos"
                        : "Días calendario"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-olive-700">
                      Cuota diaria
                    </p>
                    <p className="mt-2 font-semibold text-olive-950">
                      {formatCurrency(expense.dailyAmount ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-olive-700">
                      Estado de pago
                    </p>
                    <p
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        expense.paymentStatus === "paid"
                          ? "bg-[#e8f0e5] text-[#46653d]"
                          : expense.paymentStatus === "partial"
                            ? "bg-[#fff1db] text-[#9a6b20]"
                            : "bg-[#f3ede5] text-[#8a6b45]"
                      }`}
                    >
                      {expense.paymentStatus === "paid"
                        ? "Pagado"
                        : expense.paymentStatus === "partial"
                          ? "Parcial"
                          : "Pendiente"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-olive-700">
                      Saldo pendiente
                    </p>
                    <p className="mt-2 font-semibold text-olive-950">
                      {formatCurrency(expense.balancePending ?? 0)}
                    </p>
                  </div>
                  <div className="flex items-start justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openPaymentModal(expense)}
                      className="rounded-full border border-olive-950/10 p-2 text-olive-700 transition hover:bg-white"
                      aria-label={`Marcar como pagado ${expense.title}`}
                    >
                      <Wallet className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(expense)}
                      className="rounded-full border border-olive-950/10 p-2 text-olive-700 transition hover:bg-white"
                      aria-label={`Editar ${expense.title}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                  </div>
                </div>
              ))}

              {!filteredFixedExpenses.length ? (
                <div className="rounded-[24px] border border-dashed border-olive-950/12 bg-[#fbfaf6] p-5">
                  <p className="font-semibold text-olive-950">No hay gastos fijos</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Registra arriendo, internet, software u otros compromisos mensuales para calcular su peso diario.
                  </p>
                </div>
              ) : null}
            </div>
          </Card>
        ) : (
          <div />
        )}

        {typeFilter !== "fixed" ? (
          <Card className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gastos variables del día</p>
                <h3 className="mt-1 text-xl font-semibold text-olive-950">
                  Movimientos de hoy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => openCreateModal("variable")}
                className="rounded-full border border-olive-950/10 px-4 py-2 text-sm font-semibold text-olive-950 transition hover:bg-[#f5f3eb]"
              >
                Agregar variable
              </button>
            </div>

            <div className="space-y-3">
              {filteredVariableExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-olive-950">{expense.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {expense.branch} · {expense.category} · {expense.createdAt}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <p className="font-semibold text-olive-950">
                        {formatCurrency(expense.amount)}
                      </p>
                      <button
                        type="button"
                        onClick={() => openPaymentModal(expense)}
                        className="rounded-full border border-olive-950/10 p-2 text-olive-700 transition hover:bg-white"
                        aria-label={`Registrar pago de ${expense.title}`}
                      >
                        <Wallet className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(expense)}
                        className="rounded-full border border-olive-950/10 p-2 text-olive-700 transition hover:bg-white"
                        aria-label={`Editar ${expense.title}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                    </div>
                  </div>
                  {expense.notes ? (
                    <p className="mt-3 text-sm text-muted-foreground">{expense.notes}</p>
                  ) : null}
                </div>
              ))}

              {!filteredVariableExpenses.length ? (
                <div className="rounded-[24px] border border-dashed border-olive-950/12 bg-[#fbfaf6] p-5">
                  <p className="font-semibold text-olive-950">No hay gastos variables hoy</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Registra insumos, atención o compras puntuales y aparecerán aquí al instante.
                  </p>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[32px] border border-white/60 bg-[#fcfbf7] p-6 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-olive-700">
                  {form.id ? "Editar gasto" : "Nuevo gasto"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-olive-950">
                  {form.id ? "Actualizar gasto" : "Registrar gasto"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-olive-950/10 p-2 text-olive-700 transition hover:bg-[#f5f3eb]"
                aria-label="Cerrar formulario"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-olive-950">Nombre del gasto</span>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  list={form.type === "fixed" ? "fixed-expense-suggestions" : "variable-expense-suggestions"}
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                />
                <datalist id="fixed-expense-suggestions">
                  {FIXED_NAME_SUGGESTIONS.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <datalist id="variable-expense-suggestions">
                  {VARIABLE_NAME_SUGGESTIONS.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-950">Tipo de gasto</span>
                <select
                  value={form.type}
                  onChange={(event) => {
                    const nextType = event.target.value as ExpenseType;
                    const branchConfig = getBranchById(form.branchId, branchConfigs);
                    setForm((current) => ({
                      ...current,
                      type: nextType,
                      prorationMode: branchConfig.fixedExpenseProrationMode,
                    }));
                  }}
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                >
                  <option value="fixed">Fijo</option>
                  <option value="variable">Variable</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-950">
                  {form.type === "fixed" ? "Monto mensual" : "Monto"}
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                />
                {form.type === "fixed" ? (
                  <p className="text-xs text-muted-foreground">
                    Cuota diaria estimada: {formatCurrency(dailyQuotaPreview)}
                  </p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-950">Categoría</span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                >
                  {EXPENSE_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-950">Sucursal</span>
                <select
                  value={form.branchId}
                  onChange={(event) => {
                    const branchId = event.target.value as BranchId;
                    const branchConfig = getBranchById(branchId, branchConfigs);
                    setForm((current) => ({
                      ...current,
                      branchId,
                      prorationMode:
                        current.type === "fixed"
                          ? branchConfig.fixedExpenseProrationMode
                          : current.prorationMode,
                    }));
                  }}
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                >
                  {branchConfigs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-950">Fecha</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, date: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-950">Vencimiento</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dueDate: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-950">Hora</span>
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, time: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                />
              </label>

              {form.type === "fixed" ? (
                <>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-olive-950">Periodicidad</span>
                    <input
                      value="Mensual"
                      disabled
                      className="w-full rounded-2xl border border-olive-950/10 bg-[#f5f3eb] px-4 py-3 text-sm text-olive-950"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-olive-950">Modo de prorrateo</span>
                    <select
                      value={form.prorationMode}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          prorationMode: event.target.value as ExpenseProrationMode,
                        }))
                      }
                      className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                    >
                      <option value="calendar_days">Días calendario</option>
                      <option value="operating_days">Días operativos de la sucursal</option>
                    </select>
                  </label>
                </>
              ) : null}

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-950">Estado</span>
                <select
                  value={form.active ? "active" : "inactive"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      active: event.target.value === "active",
                    }))
                  }
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-olive-950">Notas</span>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="min-h-28 w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                />
              </label>
            </div>

            {formError ? (
              <div className="mt-4 rounded-2xl border border-[#d9b88f] bg-[#fff6ea] px-4 py-3 text-sm text-[#8a5a1f]">
                {formError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {form.id ? (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-full border border-[#d5b3b3] px-4 py-2.5 text-sm font-semibold text-[#8c3a3a] transition hover:bg-[#fff3f3] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="size-4" />
                    Eliminar gasto
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-full border border-olive-950/10 px-5 py-3 text-sm font-semibold text-olive-950 transition hover:bg-[#f5f3eb] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void persistExpense(form.id ? "PATCH" : "POST")}
                  disabled={isSaving || isLoading}
                  className="rounded-full bg-olive-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-olive-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? "Guardando..."
                    : form.id
                      ? "Guardar cambios"
                      : "Guardar gasto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isPaymentModalOpen && paymentForm ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/60 bg-[#fcfbf7] p-6 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-olive-700">
                  Pago de gasto
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-olive-950">
                  Marcar como pagado
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{paymentForm.title}</p>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
                className="rounded-full border border-olive-950/10 p-2 text-olive-700 transition hover:bg-[#f5f3eb]"
                aria-label="Cerrar pago"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-950">Monto pagado</span>
                <input
                  type="number"
                  min="0"
                  value={paymentForm.paidAmount}
                  onChange={(event) =>
                    setPaymentForm((current) =>
                      current
                        ? {
                            ...current,
                            paidAmount: event.target.value,
                          }
                        : current
                    )
                  }
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-950">Fecha de pago</span>
                <input
                  type="date"
                  value={paymentForm.paidDate}
                  onChange={(event) =>
                    setPaymentForm((current) =>
                      current ? { ...current, paidDate: event.target.value } : current
                    )
                  }
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-950">Estado</span>
                <select
                  value={paymentForm.paymentStatus}
                  onChange={(event) =>
                    setPaymentForm((current) =>
                      current
                        ? {
                            ...current,
                            paymentStatus: event.target.value as PaymentStatus,
                          }
                        : current
                    )
                  }
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                >
                  <option value="pending">Pendiente</option>
                  <option value="partial">Parcial</option>
                  <option value="paid">Pagado</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-olive-950">Método de pago</span>
                <input
                  value={paymentForm.paymentMethod}
                  onChange={(event) =>
                    setPaymentForm((current) =>
                      current
                        ? { ...current, paymentMethod: event.target.value }
                        : current
                    )
                  }
                  className="w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                  placeholder="Transferencia, débito, efectivo..."
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-olive-950">Observación</span>
                <textarea
                  value={paymentForm.paymentNote}
                  onChange={(event) =>
                    setPaymentForm((current) =>
                      current
                        ? { ...current, paymentNote: event.target.value }
                        : current
                    )
                  }
                  className="min-h-24 w-full rounded-2xl border border-olive-950/10 bg-white px-4 py-3 text-sm text-olive-950 outline-none transition focus:border-olive-950/30"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-olive-950">
                  Ticket / comprobante
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (!file) {
                      return;
                    }

                    const reader = new FileReader();
                    reader.onload = () => {
                      const result =
                        typeof reader.result === "string" ? reader.result : "";

                      setPaymentForm((current) =>
                        current
                          ? {
                              ...current,
                              paymentProofName: file.name,
                              paymentProofDataUrl: result,
                            }
                          : current
                      );
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="block w-full text-sm text-muted-foreground"
                />
                <div className="flex flex-wrap items-center gap-3">
                  {paymentForm.paymentProofName ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#f2f0e7] px-3 py-2 text-xs font-semibold text-olive-700">
                      <Paperclip className="size-3.5" />
                      {paymentForm.paymentProofName}
                    </span>
                  ) : null}
                  {paymentForm.paymentProofDataUrl ? (
                    <a
                      href={paymentForm.paymentProofDataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-olive-950/10 px-3 py-2 text-xs font-semibold text-olive-950 transition hover:bg-[#f5f3eb]"
                    >
                      <Eye className="size-3.5" />
                      Ver ticket
                    </a>
                  ) : null}
                  {paymentForm.paymentProofDataUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentForm((current) =>
                          current
                            ? {
                                ...current,
                                paymentProofName: "",
                                paymentProofDataUrl: "",
                              }
                            : current
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-[#d5b3b3] px-3 py-2 text-xs font-semibold text-[#8c3a3a] transition hover:bg-[#fff3f3]"
                    >
                      <Trash2 className="size-3.5" />
                      Eliminar ticket
                    </button>
                  ) : null}
                </div>
              </label>
            </div>

            <div className="mt-4 rounded-[24px] border border-olive-950/8 bg-[#fbfaf6] p-4">
              <p className="text-sm font-semibold text-olive-950">Resumen de pago</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-olive-700">Monto del gasto</p>
                  <p className="mt-2 font-semibold text-olive-950">
                    {formatCurrency(paymentForm.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-olive-700">Pagado</p>
                  <p className="mt-2 font-semibold text-olive-950">
                    {formatCurrency(Number(paymentForm.paidAmount || 0))}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-olive-700">
                    Saldo pendiente
                  </p>
                  <p className="mt-2 font-semibold text-olive-950">
                    {formatCurrency(
                      Math.max(
                        paymentForm.totalAmount - Number(paymentForm.paidAmount || 0),
                        0
                      )
                    )}
                  </p>
                </div>
              </div>
            </div>

            {paymentError ? (
              <div className="mt-4 rounded-2xl border border-[#d9b88f] bg-[#fff6ea] px-4 py-3 text-sm text-[#8a5a1f]">
                {paymentError}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closePaymentModal}
                disabled={isSaving}
                className="rounded-full border border-olive-950/10 px-5 py-3 text-sm font-semibold text-olive-950 transition hover:bg-[#f5f3eb] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handlePaymentSave()}
                disabled={isSaving}
                className="rounded-full bg-olive-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-olive-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Guardando..." : "Guardar pago"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
