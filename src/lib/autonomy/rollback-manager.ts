/**
 * HOLLY Rollback Manager — Database-Backed
 *
 * Persists rollback state to PostgreSQL so it survives container restarts.
 * Tracks every self-code change with original content hash, backup path,
 * and diff. Supports automatic rollback on health check failure and
 * manual rollback from the admin dashboard.
 *
 * Phase 3.3: Replaces in-memory rollback tracking.
 */

import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logging/structured-logger';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const logger = createLogger('rollback-manager');
const PROJECT_ROOT = process.cwd();
const BACKUP_DIR = join(PROJECT_ROOT, '.holly-backups');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RollbackEntry {
  id: string;
  userId: string;
  planId: string;
  filePath: string;
  changeType: string;
  riskLevel: string;
  status: string;
  originalHash: string;
  backupPath: string;
  diff?: string;
  appliedAt?: Date;
  rolledBackAt?: Date;
}

// ─── Core Operations ────────────────────────────────────────────────────────

/**
 * Record a new rollback entry BEFORE applying a change.
 * Returns the created record ID for tracking.
 */
export async function recordPendingChange(opts: {
  userId: string;
  planId: string;
  filePath: string;
  changeType: string;
  riskLevel: string;
  backupPath: string;
  diff?: string;
}): Promise<string> {
  const { userId, planId, filePath, changeType, riskLevel, backupPath, diff } = opts;

  // Compute hash of original file
  const fullPath = join(PROJECT_ROOT, filePath);
  let originalHash = 'none';
  if (existsSync(fullPath)) {
    const content = readFileSync(fullPath, 'utf-8');
    originalHash = hashContent(content);
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const record = await prisma.selfCodeRollback.create({
    data: {
      userId,
      planId,
      filePath,
      changeType,
      riskLevel,
      status: 'pending',
      originalHash,
      backupPath,
      diff: diff || null,
      expiresAt,
    },
  });

  logger.info(`Recorded pending change: ${filePath}`, { id: record.id, planId });
  return record.id;
}

/**
 * Mark a change as successfully applied.
 */
export async function markApplied(recordId: string): Promise<void> {
  await prisma.selfCodeRollback.update({
    where: { id: recordId },
    data: {
      status: 'applied',
      appliedAt: new Date(),
    },
  });
  logger.info(`Change marked as applied: ${recordId}`);
}

/**
 * Roll back a specific change by restoring from backup.
 */
export async function rollbackChange(recordId: string): Promise<boolean> {
  const record = await prisma.selfCodeRollback.findUnique({
    where: { id: recordId },
  });

  if (!record) {
    logger.error(`Rollback record not found: ${recordId}`);
    return false;
  }

  if (record.status === 'rolled_back') {
    logger.warn(`Change already rolled back: ${recordId}`);
    return true;
  }

  const fullPath = join(PROJECT_ROOT, record.filePath);
  const backupPath = record.backupPath;

  // Verify backup exists
  if (!existsSync(backupPath)) {
    logger.error(`Backup file not found: ${backupPath}`);
    await prisma.selfCodeRollback.update({
      where: { id: recordId },
      data: { status: 'rolled_back', rolledBackAt: new Date() },
    });
    return false;
  }

  // Restore from backup
  try {
    const backupContent = readFileSync(backupPath, 'utf-8');

    // Verify the backup hash matches what we recorded
    const backupHash = hashContent(backupContent);
    if (backupHash !== record.originalHash) {
      logger.warn(`Backup hash mismatch for ${record.filePath} — restoring anyway`);
    }

    writeFileSync(fullPath, backupContent, 'utf-8');

    await prisma.selfCodeRollback.update({
      where: { id: recordId },
      data: { status: 'rolled_back', rolledBackAt: new Date() },
    });

    logger.info(`Successfully rolled back: ${record.filePath}`, { recordId });
    return true;
  } catch (err) {
    logger.error(`Rollback failed for ${record.filePath}: ${err}`);
    return false;
  }
}

/**
 * Roll back ALL applied changes for a specific plan.
 * Used when health checks fail after a self-code cycle.
 */
export async function rollbackPlan(planId: string): Promise<number> {
  const applied = await prisma.selfCodeRollback.findMany({
    where: { planId, status: 'applied' },
    orderBy: { appliedAt: 'desc' }, // Roll back in reverse order
  });

  let rolledBack = 0;
  for (const record of applied) {
    const success = await rollbackChange(record.id);
    if (success) rolledBack++;
  }

  logger.info(`Plan rollback: ${rolledBack}/${applied.length} changes rolled back`, { planId });
  return rolledBack;
}

/**
 * Get all pending/applied changes for a plan (loaded on startup).
 */
export async function loadPlanState(planId: string): Promise<RollbackEntry[]> {
  return prisma.selfCodeRollback.findMany({
    where: {
      planId,
      status: { in: ['pending', 'applied'] },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Clean up expired rollback records (older than 30 days).
 */
export async function cleanupExpiredRollbacks(): Promise<number> {
  const result = await prisma.selfCodeRollback.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      status: { in: ['rolled_back', 'expired'] },
    },
  });

  // Mark remaining expired records
  await prisma.selfCodeRollback.updateMany({
    where: {
      expiresAt: { lt: new Date() },
      status: { notIn: ['rolled_back', 'expired'] },
    },
    data: { status: 'expired' },
  });

  if (result.count > 0) {
    logger.info(`Cleaned up ${result.count} expired rollback records`);
  }
  return result.count;
}

/**
 * Get rollback statistics for monitoring.
 */
export async function getRollbackStats(userId: string): Promise<{
  total: number;
  applied: number;
  rolledBack: number;
  pending: number;
  expired: number;
}> {
  const [total, applied, rolledBack, pending, expired] = await Promise.all([
    prisma.selfCodeRollback.count({ where: { userId } }),
    prisma.selfCodeRollback.count({ where: { userId, status: 'applied' } }),
    prisma.selfCodeRollback.count({ where: { userId, status: 'rolled_back' } }),
    prisma.selfCodeRollback.count({ where: { userId, status: 'pending' } }),
    prisma.selfCodeRollback.count({ where: { userId, status: 'expired' } }),
  ]);

  return { total, applied, rolledBack, pending, expired };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}
