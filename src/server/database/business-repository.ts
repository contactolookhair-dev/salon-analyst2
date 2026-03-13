import type {
  CommissionType as PrismaCommissionType,
  Expense as PrismaExpense,
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
import type {
  BranchFilter,
  BranchId,
  Expense,
  Professional,
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

function mapExpense(record: ExpenseRecord): Expense {
  return {
    id: record.id,
    branchId: record.branchId as BranchId,
    branch: record.branch.name as Expense["branch"],
    title: record.category,
    category: record.category,
    amount: record.amount,
    expenseDate: formatDate(record.date),
    createdAt: formatTime(record.date),
  };
}

function aggregateProfessionals(records: PrismaProfessional[]): Professional[] {
  const grouped = new Map<string, Professional>();

  records.forEach((record) => {
    const id = normalizeNameId(record.name);
    const existing = grouped.get(id);

    if (existing) {
      if (!existing.branchIds.includes(record.branchId as BranchId)) {
        existing.branchIds.push(record.branchId as BranchId);
      }
      return;
    }

    grouped.set(id, {
      id,
      name: record.name,
      branchIds: [record.branchId as BranchId],
      role: record.role ?? "Profesional",
    });
  });

  return Array.from(grouped.values());
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
      where:
        branch === "all"
          ? {}
          : {
              branchId: branch,
            },
      orderBy: { name: "asc" },
    }),
  ]);

  if (saleRecords.length === 0 && expenseRecords.length === 0) {
    return null;
  }

  return {
    branch,
    sales: saleRecords.map(mapSale),
    expenses: expenseRecords.map(mapExpense),
    professionals: aggregateProfessionals(professionalRecords),
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
  date: string;
  branch: string;
  professional: string;
  service: string;
  total: number;
  clientName?: string;
};

export async function createSaleInStorage(input: CreateSaleInput) {
  const db = getDbClient();

  if (!db) {
    return {
      stored: false,
      fallback: true,
    };
  }

  const branch = branchCatalog.find((item) => item.name === input.branch);

  if (!branch) {
    throw new Error("No encontré la sucursal para registrar la venta.");
  }

  const professionalId = `${normalizeNameId(input.professional)}-${branch.id}`;
  const serviceId = normalizeNameId(input.service);
  const netAmount = calcularNeto(input.total);

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
      name: input.professional,
      branchId: branch.id,
    },
    update: {
      name: input.professional,
      branchId: branch.id,
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
      date: new Date(`${input.date}T12:00:00.000Z`),
      branchId: branch.id,
      professionalId,
      serviceId,
      clientName: input.clientName ?? "Cliente boleta",
      total: input.total,
      commission: 0,
      profit: netAmount,
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
  };
}

export async function createExpenseInStorage(input: {
  date: string;
  branchId: BranchId;
  category: string;
  amount: number;
}) {
  const db = getDbClient();

  if (!db) {
    return {
      stored: false,
      fallback: true,
    };
  }

  const expense = await db.expense.create({
    data: {
      id: `expense-${Date.now()}`,
      date: new Date(`${input.date}T12:00:00.000Z`),
      branchId: input.branchId,
      category: input.category,
      amount: input.amount,
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
    })),
  });

  return true;
}
