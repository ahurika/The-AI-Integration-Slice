/**
 * lib/db/prisma.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single shared Prisma Client instance.
 *
 * WHY A SINGLETON?
 * Next.js hot-reloads modules in development, which would create a new
 * PrismaClient on every file change and exhaust the PostgreSQL connection
 * pool. The global singleton pattern prevents this by reusing an existing
 * client if one has already been instantiated in this process.
 *
 * In production, Next.js does not hot-reload, so `global.prisma` is never
 * set and a fresh client is created once per cold start.
 *
 * USAGE
 * ─────
 * import { prisma } from '@/lib/db/prisma';
 * const user = await prisma.user.findUnique({ where: { email } });
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from '@prisma/client';

// Extend the Node.js global type to hold the optional Prisma instance.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * The shared PrismaClient instance.
 * In development, it is attached to `global` to survive hot-reloads.
 * In production, a single instance is created per process.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
