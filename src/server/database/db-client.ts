import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

declare global {
  var __salonPrisma: PrismaClient | undefined;
  var __salonPrismaAdapter: PrismaBetterSqlite3 | undefined;
}

type DbStatus = {
  available: boolean;
  persistent: boolean;
  reason?: string;
};

export function getDbStatus(): DbStatus {
  const databaseUrl = process.env.DATABASE_URL;
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  if (!databaseUrl) {
    return {
      available: false,
      persistent: false,
      reason: "No hay DATABASE_URL configurada.",
    };
  }

  const usesLocalSqlite = databaseUrl.startsWith("file:");

  if (isProduction && usesLocalSqlite) {
    return {
      available: false,
      persistent: false,
      reason:
        "La versión online está usando SQLite local, que no persiste en Vercel. Debes conectar una base de datos persistente para compartir datos entre navegador, celular y despliegues.",
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

  const databaseUrl = process.env.DATABASE_URL as string;

  if (!global.__salonPrismaAdapter) {
    global.__salonPrismaAdapter = new PrismaBetterSqlite3({
      url: databaseUrl,
    });
  }

  if (!global.__salonPrisma) {
    global.__salonPrisma = new PrismaClient({
      adapter: global.__salonPrismaAdapter,
    });
  }

  return global.__salonPrisma;
}
