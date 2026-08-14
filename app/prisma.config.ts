import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

/**
 * Next reads `.env.local`; plain `dotenv/config` only reads `.env`, so the CLI
 * used to fail locally with "Connection url is empty" while the app itself ran
 * fine — the same variable, in a file only one of them looked at.
 *
 * Both are loaded here, `.env.local` first. dotenv never overwrites a variable
 * that is already set, so on Replit — where the workspace injects DATABASE_URL
 * into the real environment — neither file exists and nothing changes.
 */
loadEnv({ path: ".env.local" });
loadEnv();

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
