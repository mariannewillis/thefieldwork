import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * The database connection.
 *
 * DATABASE_URL is required and there is deliberately no fallback. The previous
 * credential store was a JSON file, and its failure mode was the reason this
 * exists: it silently reverted Marianne's password to the temporary one on
 * every redeploy, with no error to notice. Anything that quietly carries on
 * without a database would reintroduce exactly that class of bug — so a
 * missing URL is fatal and says so.
 */
function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. The admin portal stores its credential in Postgres and cannot start without it. Locally, put it in app/.env.local; on Replit it is provided automatically by the workspace database.",
    );
  }
  return url;
}

/**
 * One client per process. Next's dev server re-evaluates modules on every
 * change, and a fresh PrismaClient each time opens a new pool until Postgres
 * refuses connections — so in development it is cached on globalThis, which
 * survives the reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: connectionString() }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
