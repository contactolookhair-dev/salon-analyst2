import "dotenv/config";

import { CommissionType } from "@prisma/client";

import { calcularNeto } from "@/lib/finance";
import { getDbClient } from "@/server/database/db-client";

async function main() {
  const db = getDbClient();

  if (!db) {
    throw new Error("DATABASE_URL no está configurada.");
  }

  await db.expense.deleteMany();
  await db.sale.deleteMany();
  await db.professional.deleteMany();
  await db.service.deleteMany();
  await db.branch.deleteMany();

  await db.branch.createMany({
    data: [
      { id: "house-of-hair", name: "House Of Hair" },
      { id: "look-hair-extensions", name: "Look Hair Extensions" },
    ],
  });

  await db.professional.createMany({
    data: [
      {
        id: "ivanova-house-of-hair",
        name: "Ivanova",
        branchId: "house-of-hair",
        role: "Colorista Senior",
      },
      {
        id: "ivanova-look-hair-extensions",
        name: "Ivanova",
        branchId: "look-hair-extensions",
        role: "Colorista Senior",
      },
      {
        id: "jenny-house-of-hair",
        name: "Jenny",
        branchId: "house-of-hair",
        role: "Especialista en Corte",
      },
      {
        id: "darling-look-hair-extensions",
        name: "Darling",
        branchId: "look-hair-extensions",
        role: "Extensionista",
      },
    ],
  });

  await db.service.createMany({
    data: [
      { id: "balayage-premium", name: "Balayage Premium", price: 148000 },
      { id: "corte-brushing", name: "Corte + Brushing", price: 42000 },
      { id: "extensiones-full-set", name: "Extensiones Full Set", price: 265000 },
      { id: "tratamiento-reparador", name: "Tratamiento Reparador", price: 64000 },
    ],
  });

  await db.sale.createMany({
    data: [
      {
        id: "sale-1",
        date: new Date("2026-03-03T09:15:00.000Z"),
        branchId: "house-of-hair",
        professionalId: "ivanova-house-of-hair",
        serviceId: "balayage-premium",
        clientName: "Camila R.",
        total: 148000,
        commission: 49748,
        profit: calcularNeto(148000) - 49748 - 22000,
        commissionType: CommissionType.PERCENTAGE,
      },
      {
        id: "sale-2",
        date: new Date("2026-03-08T11:30:00.000Z"),
        branchId: "house-of-hair",
        professionalId: "jenny-house-of-hair",
        serviceId: "corte-brushing",
        clientName: "Paula M.",
        total: 42000,
        commission: 12000,
        profit: calcularNeto(42000) - 12000 - 4500,
        commissionType: CommissionType.FIXED,
      },
      {
        id: "sale-3",
        date: new Date("2026-03-12T10:05:00.000Z"),
        branchId: "look-hair-extensions",
        professionalId: "darling-look-hair-extensions",
        serviceId: "extensiones-full-set",
        clientName: "Daniela T.",
        total: 265000,
        commission: 77941,
        profit: calcularNeto(265000) - 77941 - 54000,
        commissionType: CommissionType.PERCENTAGE,
      },
      {
        id: "sale-4",
        date: new Date("2026-03-12T13:10:00.000Z"),
        branchId: "look-hair-extensions",
        professionalId: "ivanova-look-hair-extensions",
        serviceId: "tratamiento-reparador",
        clientName: "Fernanda S.",
        total: 64000,
        commission: 15000,
        profit: calcularNeto(64000) - 15000 - 9000,
        commissionType: CommissionType.FIXED,
      },
    ],
  });

  await db.expense.createMany({
    data: [
      {
        id: "expense-1",
        date: new Date("2026-03-02T08:45:00.000Z"),
        branchId: "house-of-hair",
        category: "Insumos",
        amount: 38500,
      },
      {
        id: "expense-2",
        date: new Date("2026-03-08T12:05:00.000Z"),
        branchId: "house-of-hair",
        category: "Atención",
        amount: 9800,
      },
      {
        id: "expense-3",
        date: new Date("2026-03-11T09:35:00.000Z"),
        branchId: "look-hair-extensions",
        category: "Insumos",
        amount: 27400,
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const db = getDbClient();
    await db?.$disconnect();
  });
