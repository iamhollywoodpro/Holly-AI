/**
 * Database Health Monitor
 * Phase 8.7.2 — Automatic DB connection health checks and data integrity
 */

import { prisma } from '@/lib/db';

export interface DBHealthReport {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  checks: {
    connection: { ok: boolean; latencyMs: number; error?: string };
    tables: { ok: boolean; tableCount: number; error?: string };
    migrations: { ok: boolean; pending: number; error?: string };
    integrity: { ok: boolean; issues: string[]; error?: string };
  };
  stats: {
    users: number;
    conversations: number;
    messages: number;
    memories: number;
  };
  recommendations: string[];
}

/**
 * Run a comprehensive database health check
 */
export async function runDBHealthCheck(): Promise<DBHealthReport> {
  const report: DBHealthReport = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      connection: { ok: false, latencyMs: 0 },
      tables: { ok: false, tableCount: 0 },
      migrations: { ok: false, pending: 0 },
      integrity: { ok: false, issues: [] },
    },
    stats: { users: 0, conversations: 0, messages: 0, memories: 0 },
    recommendations: [],
  };

  // 1. Connection check
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    report.checks.connection = { ok: true, latencyMs: Date.now() - start };

    if (report.checks.connection.latencyMs > 1000) {
      report.recommendations.push('Database latency is high (>1s). Consider connection pooling or upgrading.');
    }
  } catch (error) {
    report.checks.connection = { ok: false, latencyMs: -1, error: error instanceof Error ? error.message : String(error) };
    report.status = 'critical';
    report.recommendations.push('Database connection failed. Check DATABASE_URL and server status.');
  }

  // 2. Table count check
  try {
    const tables = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const tableCount = Number(tables[0]?.count || 0);
    report.checks.tables = { ok: tableCount > 10, tableCount };

    if (tableCount < 10) {
      report.recommendations.push(`Only ${tableCount} tables found. Database may not be fully migrated.`);
    }
  } catch (error) {
    report.checks.tables = { ok: false, tableCount: 0, error: error instanceof Error ? error.message : String(error) };
  }

  // 3. Migration status
  try {
    const migrationCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL
    `;
    const pendingMigrations = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM "_prisma_migrations" WHERE "finished_at" IS NULL
    `;
    const pending = Number(pendingMigrations[0]?.count || 0);
    report.checks.migrations = { ok: pending === 0, pending };

    if (pending > 0) {
      report.recommendations.push(`${pending} pending migrations. Run 'npx prisma migrate deploy'.`);
      report.status = 'degraded';
    }
  } catch {
    // _prisma_migrations table may not exist
    report.checks.migrations = { ok: true, pending: 0 };
  }

  // 4. Data integrity checks
  const integrityIssues: string[] = [];

  try {
    // Check for orphaned conversations (no user)
    const orphanedConvos = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM "Conversation" c
      WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = c."userId")
    `;
    const orphanedCount = Number(orphanedConvos[0]?.count || 0);
    if (orphanedCount > 0) {
      integrityIssues.push(`${orphanedCount} orphaned conversations (no matching user)`);
    }

    // Check for conversations with no messages
    const emptyConvos = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM "Conversation" WHERE "messageCount" = 0
    `;
    const emptyCount = Number(emptyConvos[0]?.count || 0);
    if (emptyCount > 50) {
      integrityIssues.push(`${emptyCount} empty conversations (consider cleanup)`);
    }

    report.checks.integrity = { ok: integrityIssues.length === 0, issues: integrityIssues };
  } catch (error) {
    report.checks.integrity = { ok: false, issues: [], error: error instanceof Error ? error.message : String(error) };
  }

  // 5. Stats
  try {
    const [users, conversations, messages, memoryEmbeddings] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.memoryEmbedding.count().catch(() => 0),
    ]);

    report.stats = { users, conversations, messages, memories: memoryEmbeddings };
  } catch {
    // Stats are optional
  }

  // Determine overall status
  if (!report.checks.connection.ok) {
    report.status = 'critical';
  } else if (report.checks.integrity.issues.length > 0 || report.checks.migrations.pending > 0) {
    report.status = 'degraded';
  }

  return report;
}
