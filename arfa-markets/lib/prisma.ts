import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton.
 *
 * In dev, Next.js hot-reloads modules and will create a new PrismaClient on
 * every change unless we cache one on globalThis. Each client opens its own
 * pool, so without this cache we'd exhaust connections within minutes.
 *
 * In production (node server) this file is imported once, so the cache is a
 * no-op — the `if (NODE_ENV !== "production")` guard makes that explicit.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
