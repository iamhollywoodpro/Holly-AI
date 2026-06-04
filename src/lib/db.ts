/**
 * Prisma Client Singleton
 * Prevents multiple instances in development
 *
 * Connection pool tuning for Neon PostgreSQL:
 *   - connection_limit=10: Allows up to 10 concurrent queries (Neon free tier handles this fine)
 *   - pool_timeout=20: Wait up to 20s for a connection before failing
 *   - connect_timeout=10: Connection attempt timeout
 *
 * Without these, Neon's default pool (5 connections) gets exhausted when
 * the context loader fires 28 parallel queries → cascade timeouts → 500 errors.
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Inject connection pool params into DATABASE_URL if not already present
function buildDatabaseUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;

  // Don't double-add params
  if (base.includes('connection_limit')) return base;

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}connection_limit=10&pool_timeout=20&connect_timeout=10`;
}

const databaseUrl = buildDatabaseUrl();

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
