import type {
  CommissionType as PrismaCommissionType,
  Expense as PrismaExpense,
  ExpenseProrationMode as PrismaExpenseProrationMode,
  ExpenseType as PrismaExpenseType,
  PaymentStatus as PrismaPaymentStatus,
  ProfessionalCommissionMode as PrismaProfessionalCommissionMode,
  Professional as PrismaProfessional,
  Sale as PrismaSale,
  Service as PrismaService,
  Branch as PrismaBranch,
} from "@prisma/client";

import { branches as branchCatalog } from "@/features/branches/data/mock-branches";
import {
  expenses as mockExpenses,
  getDashboardDataFromSnapshot,
  professionals as mockProfessionals,
  sales as mockSales,
} from "@/features/dashboard/data/mock-dashboard";
import { calcularNeto } from "@/lib/finance";
import { getDbClient } from "@/server/database/db-client";
import { getBranchName } from "@/shared/lib/branch";
import { parseSafeDateTime, parseSafeSaleDate } from "@/shared/lib/safe-date";
import type {
  BranchFilter,
  BranchId,
  Expense,
  ExpenseProrationMode,
  ExpenseType,
  PaymentStatus,
  Professional,
  ProfessionalCommissionMode,
  Sale,
} from "@/shared/types/business";

type SaleRecord = PrismaSale & {
  branch: PrismaBranch;
  professional: PrismaProfessional;
  service: PrismaService;
};

type ExpenseRecord = PrismaExpense & {
  branch: PrismaBranch;
};

function normalizeNameId(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveBranchByName(inputBranch: string) {
  const normalizedInputBranch = normalizeText(inputBranch);

  const exactMatch = branchCatalog.find(
    (item) => normalizeText(item.name) === normalizedInputBranch
  );

  if (exactMatch) {
    return exactMatch;
  }

  const containsMatch = branchCatalog.find((item) =>
    normalizeText(item.name).includes(normalizedInputBranch)
  );

  if (containsMatch) {
    return containsMatch;
  }

  const includedByInputMatch = branchCatalog.find((item) =>
    normalizedInputBranch.includes(normalizeText(item.name))
  );

  if (includedByInputMatch) {
    return includedByInputMatch;
  }

  return null;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
}

function getCalendarDaysForDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function mapCommissionType(value: PrismaCommissionType): "percentage" | "fixed" {
  return value === "PERCENTAGE" ? "percentage" : "fixed";
}

function mapSale(record: SaleRecord): Sale {
  const netAmount = calcularNeto(record.total);
  const cost = Math.max(netAmount - record.commission - record.profit, 0);
  const professionalId = normalizeNameId(record.professional.name);

  return {
    id: record.id,
    branchId: record.branchId as BranchId,
    branch: record.branch.name as Sale["branch"],
    professionalId,
    clientName: record.clientName ?? "Cliente no registrado",
    service: record.service.name,
    productName: record.service.name,
    grossAmount: record.total,
    netAmount,
    commissionType: mapCommissionType(record.commissionType),
    commissionValue: record.commission,
    cost,
    saleDate: formatDate(record.date),
    createdAt: formatTime(record.date),
  };
}

function mapExpenseType(value: PrismaExpenseType): ExpenseType {
  return value === "FIXED" ? "fixed" : "variable";
}

function mapExpenseProrationMode(
  value: PrismaExpenseProrationMode | null
): ExpenseProrationMode | undefined {
  if (value === "CALENDAR_DAYS") {
    return "calendar_days";
  }

  if (value === "OPERATING_DAYS") {
    return "operating_days";
  }

  return undefined;
}

function mapPaymentStatus(value: PrismaPaymentStatus): PaymentStatus {
  if (value === "PAID") {
    return "paid";
  }

  if (value === "PARTIAL") {
    return "partial";
  }

  return "pending";
}

function mapProfessionalCommissionMode(
  value: PrismaProfessionalCommissionMode
): ProfessionalCommissionMode {
  if (value === "PERCENTAGE") {
    return "percentage";
  }

  if (value === "FIXED") {
    return "fixed";
  }

  if (value === "MIXED") {
    return "mixed";
  }

  if (value === "NONE") {
    return "none";
  }

  return "system_rules";
}

function serializeBranchIds(branchIds: BranchId[]) {
  return JSON.stringify(Array.from(new Set(branchIds)));
}

function parseBranchIds(value: string, fallbackBranchId?: string | null): BranchId[] {
  try {
    const parsed = JSON.parse(value) as string[];

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((item): item is BranchId =>
        item === "house-of-hair" || item === "look-hair-extensions"
      );
    }
  } catch {
    // Ignore malformed JSON and fallback below.
  }

  if (
    fallbackBranchId === "house-of-hair" ||
    fallbackBranchId === "look-hair-extensions"
  ) {
    return [fallbackBranchId];
  }

  return [];
}

function normalizePaymentStatus(
  paymentStatus: PaymentStatus | undefined,
  paidAmount: number,
  totalAmount: number
): PaymentStatus {
  if (paidAmount >= totalAmount && totalAmount > 0) {
    return "paid";
  }

  if (paidAmount > 0) {
    return "partial";
  }

  return paymentStatus ?? "pending";
}

function mapExpense(record: ExpenseRecord): Expense {
  const type = mapExpenseType(record.type);
  const monthlyAmount =
    record.monthlyAmount ?? (type === "fixed" ? record.amount : undefined);
  const dailyAmount =
    type === "fixed" && monthlyAmount
      ? Math.round(monthlyAmount / getCalendarDaysForDate(record.date))
      : undefined;
  const baseAmount = monthlyAmount ?? record.amount;
  const balancePending = Math.max(baseAmount - record.paidAmount, 0);

  return {
    id: record.id,
    branchId: record.branchId as BranchId,
    branch: record.branch.name as Expense["branch"],
    title: record.title,
    type,
    category: record.category,
    amount: record.amount,
    monthlyAmount,
    dailyAmount,
    active: record.active,
    prorationMode: mapExpenseProrationMode(record.prorationMode),
    paymentStatus: mapPaymentStatus(record.paymentStatus),
    paidAmount: record.paidAmount,
    paidDate: record.paidDate ? formatDate(record.paidDate) : undefined,
    paymentMethod: record.paymentMethod ?? undefined,
    paymentNote: record.paymentNote ?? undefined,
    paymentProofName: record.paymentProofName ?? undefined,
    paymentProofDataUrl: record.paymentProofDataUrl ?? undefined,
    dueDate: record.dueDate ? formatDate(record.dueDate) : undefined,
    balancePending,
    expenseDate: formatDate(record.date),
    createdAt: formatTime(record.date),
    notes: record.notes ?? undefined,
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapProfessional(record: PrismaProfessional): Professional {
  return {
    id: record.id,
    name: record.name,
    branchIds: parseBranchIds(record.branchIdsJson, record.primaryBranchId),
    role: record.role ?? "Profesional",
    primaryBranchId:
      record.primaryBranchId === "house-of-hair" ||
      record.primaryBranchId === "look-hair-extensions"
        ? (record.primaryBranchId as BranchId)
        : null,
    active: record.active,
    commissionMode: mapProfessionalCommissionMode(record.commissionMode),
    commissionValue: record.commissionValue ?? undefined,
    phone: record.phone ?? undefined,
    emergencyPhone: record.emergencyPhone ?? undefined,
    email: record.email ?? undefined,
    documentId: record.documentId ?? undefined,
    notes: record.notes ?? undefined,
    avatarColor: record.avatarColor ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function loadSnapshotFromDatabase(branch: BranchFilter) {
  const db = getDbClient();

  if (!db) {
    return null;
  }

  const where = branch === "all" ? {} : { branchId: branch };

  const [saleRecords, expenseRecords, professionalRecords] = await Promise.all([
    db.sale.findMany({
      where,
      include: {
        branch: true,
        professional: true,
        service: true,
      },
      orderBy: { date: "asc" },
    }),
    db.expense.findMany({
      where,
      include: {
        branch: true,
      },
      orderBy: { date: "asc" },
    }),
    db.professional.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  const mappedProfessionals = professionalRecords
    .map(mapProfessional)
    .filter((professional) =>
      branch === "all" ? true : professional.branchIds.includes(branch)
    );

  return {
    branch,
    sales: saleRecords.map(mapSale),
    expenses: expenseRecords.map(mapExpense),
    professionals:
      mappedProfessionals.length > 0
        ? mappedProfessionals
        : branch === "all"
          ? mockProfessionals
          : mockProfessionals.filter((professional) =>
              professional.branchIds.includes(branch)
            ),
  };
}

export async function getBusinessSnapshotFromStorage(branch: BranchFilter) {
  const dbSnapshot = await loadSnapshotFromDatabase(branch);

  if (dbSnapshot) {
    return dbSnapshot;
  }

  return {
    branch,
    sales:
      branch === "all"
        ? mockSales
        : mockSales.filter((sale) => sale.branchId === branch),
    expenses:
      branch === "all"
        ? mockExpenses
        : mockExpenses.filter((expense) => expense.branchId === branch),
    professionals:
      branch === "all"
        ? mockProfessionals
        : mockProfessionals.filter((professional) =>
          professional.branchIds.includes(branch)
        ),
  };
}

export async function getDashboardDataFromStorage(branch: BranchFilter) {
  const snapshot = await getBusinessSnapshotFromStorage(branch);

  return getDashboardDataFromSnapshot(snapshot, branch);
}

type CreateSaleInput = {
  date: string | Date | null | undefined;
  branch: string;
  professional: string;
  professionalId?: string;
  service: string;
  total: number;
  clientName?: string;
  commission?: number;
  profit?: number;
  receiptNumber?: string;
  confirmDuplicate?: boolean;
};

type DuplicateDetectionResult = {
  severity: "high" | "medium";
  allowOverride: boolean;
  message: string;
  existingSale: {
    date: string;
    total: number;
    professional: string;
    clientName: string;
    service: string;
  };
};

function getDayRange(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  return {
    start: new Date(Date.UTC(year, month, day, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, day + 1, 0, 0, 0)),
  };
}

async function detectDuplicateSale(
  saleDate: Date,
  branchId: BranchId,
  professionalId: string,
  serviceId: string,
  total: number,
  clientName: string | undefined,
  db: NonNullable<ReturnType<typeof getDbClient>>
): Promise<DuplicateDetectionResult | null> {
  const { start, end } = getDayRange(saleDate);
  const normalizedClientName = normalizeNameId(clientName ?? "");

  const similarSales = await db.sale.findMany({
    where: {
      branchId,
      professionalId,
      total,
      date: {
        gte: start,
        lt: end,
      },
    },
    include: {
      professional: true,
      service: true,
    },
    orderBy: { date: "desc" },
    take: 5,
  });

  const exactMatch = similarSales.find((sale) => {
    const existingClientName = normalizeNameId(sale.clientName ?? "");

    return (
      sale.serviceId === serviceId &&
      (existingClientName === normalizedClientName ||
        !existingClientName ||
        !normalizedClientName)
    );
  });

  if (exactMatch) {
    return {
      severity: "high",
      allowOverride: false,
      message: "Esta boleta ya fue registrada anteriormente.",
      existingSale: {
        date: formatDate(exactMatch.date),
        total: exactMatch.total,
        professional: exactMatch.professional.name,
        clientName: exactMatch.clientName ?? "Cliente no registrado",
        service: exactMatch.service.name,
      },
    };
  }

  const partialMatch = similarSales[0];

  if (partialMatch) {
    return {
      severity: "medium",
      allowOverride: true,
      message:
        "Advertencia: ya existe una venta similar para este profesional y monto.",
      existingSale: {
        date: formatDate(partialMatch.date),
        total: partialMatch.total,
        professional: partialMatch.professional.name,
        clientName: partialMatch.clientName ?? "Cliente no registrado",
        service: partialMatch.service.name,
      },
    };
  }

  return null;
}

export async function createSaleInStorage(input: CreateSaleInput) {
  const db = getDbClient();

  if (!db) {
    return {
      stored: false,
      fallback: true,
    };
  }

  const branch = resolveBranchByName(input.branch);

  if (!branch) {
    console.error("BRANCH_NOT_FOUND", {
      received: input.branch,
      available: branchCatalog.map((b) => b.name),
    });

    throw new Error("No encontré la sucursal para registrar la venta.");
  }

  const professionalName = input.professional || "Profesional pendiente";
  const serviceId = normalizeNameId(input.service);
  const netAmount = calcularNeto(input.total);
  const parsedDate = parseSafeSaleDate(input.date);
  const existingProfessional =
    input.professionalId?.trim()
      ? await db.professional.findUnique({
          where: { id: input.professionalId.trim() },
        })
      : null;
  const professionalId = existingProfessional?.id ?? normalizeNameId(professionalName);
  const professionalBranchIds = existingProfessional
    ? parseBranchIds(existingProfessional.branchIdsJson, existingProfessional.primaryBranchId)
    : [branch.id];

  const duplicate = await detectDuplicateSale(
    parsedDate.value,
    branch.id,
    professionalId,
    serviceId,
    input.total,
    input.clientName,
    db
  );

  if (duplicate && !input.confirmDuplicate) {
    return {
      stored: false,
      fallback: false,
      duplicate,
    };
  }

  await db.branch.upsert({
    where: { id: branch.id },
    create: {
      id: branch.id,
      name: branch.name,
    },
    update: {
      name: branch.name,
    },
  });

  await db.professional.upsert({
    where: { id: professionalId },
    create: {
      id: professionalId,
      name: professionalName,
      role: existingProfessional?.role ?? "Profesional",
      primaryBranchId: existingProfessional?.primaryBranchId ?? branch.id,
      branchIdsJson: serializeBranchIds(
        professionalBranchIds.includes(branch.id)
          ? professionalBranchIds
          : [...professionalBranchIds, branch.id]
      ),
      active: existingProfessional?.active ?? true,
      commissionMode: existingProfessional?.commissionMode ?? "SYSTEM_RULES",
      commissionValue: existingProfessional?.commissionValue ?? null,
      phone: existingProfessional?.phone ?? null,
      email: existingProfessional?.email ?? null,
      notes: existingProfessional?.notes ?? null,
      avatarColor: existingProfessional?.avatarColor ?? null,
    },
    update: {
      name: professionalName,
      primaryBranchId: existingProfessional?.primaryBranchId ?? branch.id,
      branchIdsJson: serializeBranchIds(
        professionalBranchIds.includes(branch.id)
          ? professionalBranchIds
          : [...professionalBranchIds, branch.id]
      ),
    },
  });

  await db.service.upsert({
    where: { id: serviceId },
    create: {
      id: serviceId,
      name: input.service,
      price: input.total,
    },
    update: {
      name: input.service,
      price: input.total,
    },
  });

  const sale = await db.sale.create({
    data: {
      id: `sale-${Date.now()}`,
      date: parsedDate.value,
      branchId: branch.id,
      professionalId,
      serviceId,
      clientName: input.clientName ?? "Cliente boleta",
      total: input.total,
      commission: input.commission ?? 0,
      profit: input.profit ?? netAmount - (input.commission ?? 0),
      commissionType: "FIXED",
    },
    include: {
      branch: true,
      professional: true,
      service: true,
    },
  });

  return {
    stored: true,
    fallback: false,
    sale: mapSale(sale),
    usedFallbackDate: parsedDate.usedFallback,
    normalizedDate: parsedDate.isoDate,
  };
}

export async function createExpenseInStorage(input: {
  title: string;
  type: ExpenseType;
  date: string;
  time?: string;
  branchId: BranchId;
  category: string;
  amount: number;
  active?: boolean;
  prorationMode?: ExpenseProrationMode;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  paidDate?: string;
  paymentMethod?: string;
  paymentNote?: string;
  paymentProofName?: string;
  paymentProofDataUrl?: string;
  dueDate?: string;
  notes?: string;
}) {
  const db = getDbClient();

  if (!db) {
    return {
      stored: false,
      fallback: true,
    };
  }

  const parsedDate = parseSafeDateTime(input.date, input.time);
  const baseAmount = input.type === "fixed" ? input.amount : input.amount;
  const paidAmount = Math.max(input.paidAmount ?? 0, 0);
  const paymentStatus = normalizePaymentStatus(
    input.paymentStatus,
    paidAmount,
    baseAmount
  );
  const parsedPaidDate = input.paidDate
    ? parseSafeDateTime(input.paidDate, "12:00").value
    : null;
  const parsedDueDate = input.dueDate
    ? parseSafeDateTime(input.dueDate, "12:00").value
    : null;
  const expense = await db.expense.create({
    data: {
      id: `expense-${Date.now()}`,
      title: input.title,
      type: input.type === "fixed" ? "FIXED" : "VARIABLE",
      date: parsedDate.value,
      branchId: input.branchId,
      category: input.category,
      amount: input.amount,
      monthlyAmount: input.type === "fixed" ? input.amount : null,
      active: input.active ?? true,
      prorationMode:
        input.type === "fixed"
          ? input.prorationMode === "operating_days"
            ? "OPERATING_DAYS"
            : "CALENDAR_DAYS"
          : null,
      paymentStatus:
        paymentStatus === "paid"
          ? "PAID"
          : paymentStatus === "partial"
            ? "PARTIAL"
            : "PENDING",
      paidAmount,
      paidDate: parsedPaidDate,
      paymentMethod: input.paymentMethod?.trim() || null,
      paymentNote: input.paymentNote?.trim() || null,
      paymentProofName: input.paymentProofName?.trim() || null,
      paymentProofDataUrl: input.paymentProofDataUrl?.trim() || null,
      dueDate: parsedDueDate,
      notes: input.notes?.trim() || null,
    },
    include: {
      branch: true,
    },
  });

  return {
    stored: true,
    fallback: false,
    expense: mapExpense(expense),
  };
}

export async function updateExpenseInStorage(input: {
  id: string;
  title: string;
  type: ExpenseType;
  date: string;
  time?: string;
  branchId: BranchId;
  category: string;
  amount: number;
  active?: boolean;
  prorationMode?: ExpenseProrationMode;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  paidDate?: string;
  paymentMethod?: string;
  paymentNote?: string;
  paymentProofName?: string;
  paymentProofDataUrl?: string;
  dueDate?: string;
  notes?: string;
}) {
  const db = getDbClient();

  if (!db) {
    return {
      stored: false,
      fallback: true,
    };
  }

  const parsedDate = parseSafeDateTime(input.date, input.time);
  const baseAmount = input.type === "fixed" ? input.amount : input.amount;
  const paidAmount = Math.max(input.paidAmount ?? 0, 0);
  const paymentStatus = normalizePaymentStatus(
    input.paymentStatus,
    paidAmount,
    baseAmount
  );
  const parsedPaidDate = input.paidDate
    ? parseSafeDateTime(input.paidDate, "12:00").value
    : null;
  const parsedDueDate = input.dueDate
    ? parseSafeDateTime(input.dueDate, "12:00").value
    : null;
  const expense = await db.expense.update({
    where: { id: input.id },
    data: {
      title: input.title,
      type: input.type === "fixed" ? "FIXED" : "VARIABLE",
      date: parsedDate.value,
      branchId: input.branchId,
      category: input.category,
      amount: input.amount,
      monthlyAmount: input.type === "fixed" ? input.amount : null,
      active: input.active ?? true,
      prorationMode:
        input.type === "fixed"
          ? input.prorationMode === "operating_days"
            ? "OPERATING_DAYS"
            : "CALENDAR_DAYS"
          : null,
      paymentStatus:
        paymentStatus === "paid"
          ? "PAID"
          : paymentStatus === "partial"
            ? "PARTIAL"
            : "PENDING",
      paidAmount,
      paidDate: parsedPaidDate,
      paymentMethod: input.paymentMethod?.trim() || null,
      paymentNote: input.paymentNote?.trim() || null,
      paymentProofName: input.paymentProofName?.trim() || null,
      paymentProofDataUrl: input.paymentProofDataUrl?.trim() || null,
      dueDate: parsedDueDate,
      notes: input.notes?.trim() || null,
    },
    include: {
      branch: true,
    },
  });

  return {
    stored: true,
    fallback: false,
    expense: mapExpense(expense),
  };
}

export async function deleteExpenseInStorage(input: { id: string }) {
  const db = getDbClient();

  if (!db) {
    return {
      stored: false,
      fallback: true,
    };
  }

  await db.expense.delete({
    where: { id: input.id },
  });

  return {
    stored: true,
    fallback: false,
  };
}

function getCurrentMonthUtcRange(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();

  return {
    start: new Date(Date.UTC(year, month, 1, 0, 0, 0)),
    end: new Date(Date.UTC(year, month + 1, 1, 0, 0, 0)),
  };
}

async function cleanupOrphanServices(
  tx: Pick<
    NonNullable<ReturnType<typeof getDbClient>>,
    "service"
  >
) {
  const orphanServices = await tx.service.findMany({
    where: {
      sales: {
        none: {},
      },
    },
    select: { id: true },
  });

  if (!orphanServices.length) {
    return 0;
  }

  await tx.service.deleteMany({
    where: {
      id: {
        in: orphanServices.map((service) => service.id),
      },
    },
  });

  return orphanServices.length;
}

export async function clearCurrentMonthSalesInStorage(referenceDate = new Date()) {
  const db = getDbClient();

  if (!db) {
    return {
      stored: false,
      fallback: true,
      deletedSales: 0,
      deletedOrphanServices: 0,
    };
  }

  const { start, end } = getCurrentMonthUtcRange(referenceDate);

  return db.$transaction(async (tx) => {
    const deletedSalesResult = await tx.sale.deleteMany({
      where: {
        date: {
          gte: start,
          lt: end,
        },
      },
    });

    const deletedOrphanServices = await cleanupOrphanServices(tx);

    return {
      stored: true,
      fallback: false,
      deletedSales: deletedSalesResult.count,
      deletedOrphanServices,
    };
  });
}

export async function clearAllExpensesInStorage() {
  const db = getDbClient();

  if (!db) {
    return {
      stored: false,
      fallback: true,
      deletedExpenses: 0,
    };
  }

  const deletedExpenses = await db.expense.deleteMany({});

  return {
    stored: true,
    fallback: false,
    deletedExpenses: deletedExpenses.count,
  };
}

export async function resetTestDataInStorage() {
  const db = getDbClient();

  if (!db) {
    return {
      stored: false,
      fallback: true,
      deletedSales: 0,
      deletedExpenses: 0,
      deletedAlerts: 0,
      deletedOrphanServices: 0,
    };
  }

  return db.$transaction(async (tx) => {
    const [deletedSales, deletedExpenses, deletedAlerts] = await Promise.all([
      tx.sale.deleteMany({}),
      tx.expense.deleteMany({}),
      tx.alertDispatch.deleteMany({}),
    ]);

    const deletedOrphanServices = await cleanupOrphanServices(tx);

    return {
      stored: true,
      fallback: false,
      deletedSales: deletedSales.count,
      deletedExpenses: deletedExpenses.count,
      deletedAlerts: deletedAlerts.count,
      deletedOrphanServices,
    };
  });
}

export async function getProfessionalsFromStorage() {
  const db = getDbClient();

  if (!db) {
    return mockProfessionals;
  }

  const records = await db.professional.findMany({
    orderBy: { name: "asc" },
  });

  if (records.length === 0) {
    return mockProfessionals;
  }

  return records.map(mapProfessional);
}

type SaveProfessionalInput = {
  id?: string;
  name: string;
  role: string;
  branchIds: BranchId[];
  primaryBranchId?: BranchId | null;
  active: boolean;
  commissionMode: ProfessionalCommissionMode;
  commissionValue?: number;
  phone?: string;
  emergencyPhone?: string;
  email?: string;
  documentId?: string;
  notes?: string;
  avatarColor?: string;
};

export async function createProfessionalInStorage(input: SaveProfessionalInput) {
  const db = getDbClient();

  if (!db) {
    return {
      stored: false,
      fallback: true,
    };
  }

  const professional = await db.professional.create({
    data: {
      id: input.id?.trim() || normalizeNameId(input.name),
      name: input.name.trim(),
      role: input.role.trim() || "Profesional",
      primaryBranchId: input.primaryBranchId ?? input.branchIds[0] ?? null,
      branchIdsJson: serializeBranchIds(input.branchIds),
      active: input.active,
      commissionMode:
        input.commissionMode === "percentage"
          ? "PERCENTAGE"
          : input.commissionMode === "fixed"
            ? "FIXED"
            : input.commissionMode === "mixed"
              ? "MIXED"
              : input.commissionMode === "none"
                ? "NONE"
                : "SYSTEM_RULES",
      commissionValue: input.commissionValue ?? null,
      phone: input.phone?.trim() || null,
      emergencyPhone: input.emergencyPhone?.trim() || null,
      email: input.email?.trim() || null,
      documentId: input.documentId?.trim() || null,
      notes: input.notes?.trim() || null,
      avatarColor: input.avatarColor?.trim() || null,
    },
  });

  return {
    stored: true,
    fallback: false,
    professional: mapProfessional(professional),
  };
}

export async function updateProfessionalInStorage(input: SaveProfessionalInput & { id: string }) {
  const db = getDbClient();

  if (!db) {
    return {
      stored: false,
      fallback: true,
    };
  }

  const professional = await db.professional.update({
    where: { id: input.id },
    data: {
      name: input.name.trim(),
      role: input.role.trim() || "Profesional",
      primaryBranchId: input.primaryBranchId ?? input.branchIds[0] ?? null,
      branchIdsJson: serializeBranchIds(input.branchIds),
      active: input.active,
      commissionMode:
        input.commissionMode === "percentage"
          ? "PERCENTAGE"
          : input.commissionMode === "fixed"
            ? "FIXED"
            : input.commissionMode === "mixed"
              ? "MIXED"
              : input.commissionMode === "none"
                ? "NONE"
                : "SYSTEM_RULES",
      commissionValue: input.commissionValue ?? null,
      phone: input.phone?.trim() || null,
      emergencyPhone: input.emergencyPhone?.trim() || null,
      email: input.email?.trim() || null,
      documentId: input.documentId?.trim() || null,
      notes: input.notes?.trim() || null,
      avatarColor: input.avatarColor?.trim() || null,
    },
  });

  return {
    stored: true,
    fallback: false,
    professional: mapProfessional(professional),
  };
}

export async function deleteProfessionalInStorage(input: { id: string }) {
  const db = getDbClient();

  if (!db) {
    return {
      stored: false,
      fallback: true,
    };
  }

  const professional = await db.professional.update({
    where: { id: input.id },
    data: { active: false },
  });

  return {
    stored: true,
    fallback: false,
    deleted: false,
    deactivated: true,
    professional: mapProfessional(professional),
  };
}

export async function ensureBranchesSeeded() {
  const db = getDbClient();

  if (!db) {
    return false;
  }

  const count = await db.branch.count();

  if (count > 0) {
    return true;
  }

  await db.branch.createMany({
    data: branchCatalog.map((branch) => ({
      id: branch.id,
      name: getBranchName(branch.id),
      logoUrl: branch.logoUrl || null,
      primaryColor: branch.primaryColor,
      secondaryColor: branch.secondaryColor,
    })),
  });

  return true;
}
