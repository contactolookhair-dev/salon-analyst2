import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  var __salonPrisma: PrismaClient | undefined;
  var __salonPgPool: Pool | undefined;
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
  const databaseUrl = process.env.DATABASE_URL;

  if (!status.available || !databaseUrl) {
    return null;
  }

  if (!global.__salonPgPool) {
    global.__salonPgPool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
  }

  if (!global.__salonPrisma) {
    const adapter = new PrismaPg(global.__salonPgPool);

    global.__salonPrisma = new PrismaClient({
      adapter,
    });
  }

  return global.__salonPrisma;
}
