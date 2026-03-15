import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseProvider = (process.env.DATABASE_PROVIDER ?? "sqlite").toLowerCase();
const schema =
  databaseProvider === "postgresql"
    ? "src/server/database/prisma/schema.postgres.prisma"
    : "src/server/database/prisma/schema.prisma";

export default defineConfig({
  schema,
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
