import { PrismaClient } from "@prisma/client";

declare global {
  var __salonPrisma: PrismaClient | undefined;
}

type DbStatus = {
  available: boolean;
  persistent: boolean;
  reason?: string;
};

export function getDbStatus(): DbStatus {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return {
      available: false,
      persistent: false,
      reason: "No hay DATABASE_URL configurada.",
    };
  }

  if (
    !databaseUrl.startsWith("postgresql://") &&
    !databaseUrl.startsWith("postgres://")
  ) {
    return {
      available: false,
      persistent: false,
      reason:
        "La DATABASE_URL no apunta a PostgreSQL. Debes usar una URL de Neon/Postgres que comience con postgresql:// o postgres://.",
    };
  }

  return {
    available: true,
    persistent: true,
  };
}

export function getDbClient() {
  const status = getDbStatus();

  if (!status.available) {
    return null;
  }

  if (!global.__salonPrisma) {
    global.__salonPrisma = new PrismaClient();
  }

  return global.__salonPrisma;
}
