import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "src/server/database/prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
