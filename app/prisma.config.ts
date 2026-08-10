import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma's own config — used by the CLI for migrations only. The running app
 * never reads this; it connects through the adapter in src/lib/db.ts.
 *
 * DATABASE_URL comes from the environment in both places: locally from
 * .env.local, and in production from the value Replit injects for its own
 * Postgres. Nothing about the database lives outside Replit.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI-only. The running app never uses this — it connects through the
    // adapter in src/lib/db.ts. Same variable in both places: a local Postgres
    // when developing, Replit's own database in production.
    url: process.env.DATABASE_URL ?? "",
  },
});
