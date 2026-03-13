import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

declare global {
  var __salonPrisma: PrismaClient | undefined;
  var __salonPrismaAdapter: PrismaBetterSqlite3 | undefined;
}

export function getDbClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return null;
  }

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
