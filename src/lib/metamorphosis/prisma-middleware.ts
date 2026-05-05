/**
 * HOLLY'S METAMORPHOSIS - PHASE 1: PRISMA MIDDLEWARE
 * 
 * This middleware tracks all database queries for performance monitoring,
 * enabling HOLLY to detect slow queries and optimize database operations.
 */

import { prisma } from '@/lib/db';
import { logger } from './logging-system';
import { metrics } from './performance-metrics';

// ============================================================================
// DATABASE QUERY TRACKING MIDDLEWARE
// ============================================================================

/**
 * Install Prisma middleware for query tracking
 * Call this once during app initialization
 */
export function installPrismaMiddleware() {
  prisma.$use(async (params, next) => {
    const start = performance.now();
    const operationName = `${params.model}.${params.action}`;
    
    // Execute the query
    const result = await next(params);
    
    // Calculate duration
    const duration = performance.now() - start;
    
    // Track metrics
    await metrics.dbQuery(operationName, duration, params.model || 'unknown');
    
    // Log slow queries (> 500ms)
    if (duration > 500) {
      await logger.db.slow(operationName, duration, {
        model: params.model,
        action: params.action,
        args: params.args,
      });
    }
    
    // Debug log for very detailed tracking (optional, can be noisy)
    // await logger.db.query(operationName, duration, { model: params.model });
    
    return result;
  });
  
  console.log('📊 [Metamorphosis] Prisma middleware installed - tracking all DB queries');
}

/**
 * Log database errors
 */
export async function logDatabaseError(
  operation: string,
  error: any,
  context?: any
) {
  await logger.db.error(operation, error, context);
}
