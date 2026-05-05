"use strict";
/**
 * HOLLY'S METAMORPHOSIS - PHASE 1: LOGGING SYSTEM
 *
 * This is HOLLY's structured logging foundation - how she observes and records
 * her own operational state, performance, and interactions.
 *
 * Purpose: Enable HOLLY to monitor herself in real-time and build self-awareness
 * through comprehensive, structured logging of all system activities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.log = log;
exports.getRecentLogs = getRecentLogs;
exports.getRecentErrors = getRecentErrors;
exports.getLogStats = getLogStats;
exports.clearLogs = clearLogs;
exports.createPerformanceTracker = createPerformanceTracker;
exports.withLogging = withLogging;
// ============================================================================
// IN-MEMORY LOG BUFFER (FOR RECENT LOGS)
// ============================================================================
class LogBuffer {
    constructor() {
        this.logs = [];
        this.maxSize = 1000; // Keep last 1000 logs in memory
    }
    add(log) {
        this.logs.push(log);
        if (this.logs.length > this.maxSize) {
            this.logs.shift(); // Remove oldest log
        }
    }
    getLogs(filters) {
        let filtered = [...this.logs];
        if (filters?.level) {
            filtered = filtered.filter(log => log.level === filters.level);
        }
        if (filters?.category) {
            filtered = filtered.filter(log => log.category === filters.category);
        }
        if (filters?.since) {
            filtered = filtered.filter(log => log.timestamp >= filters.since);
        }
        if (filters?.limit) {
            filtered = filtered.slice(-filters.limit);
        }
        return filtered;
    }
    getRecentErrors(limit = 10) {
        return this.logs
            .filter(log => log.level === 'ERROR' || log.level === 'CRITICAL')
            .slice(-limit);
    }
    clear() {
        this.logs = [];
    }
}
// Singleton log buffer
const logBuffer = new LogBuffer();
// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================
/**
 * Main logging function - routes to appropriate handlers
 */
async function log(level, category, message, context, metadata) {
    const logEntry = {
        timestamp: new Date(),
        level,
        category,
        message,
        context: {
            traceId: generateTraceId(),
            ...context,
        },
        metadata,
    };
    // Add to in-memory buffer
    logBuffer.add(logEntry);
    // Console output (for development)
    logToConsole(logEntry);
    // For critical errors, could add alert system here
    if (level === 'CRITICAL') {
        await handleCriticalError(logEntry);
    }
    // Optionally persist important logs to database
    if (shouldPersistLog(logEntry)) {
        await persistLog(logEntry);
    }
}
// ============================================================================
// CONVENIENCE LOGGING FUNCTIONS
// ============================================================================
exports.logger = {
    debug: (category, message, context) => log('DEBUG', category, message, context),
    info: (category, message, context) => log('INFO', category, message, context),
    warn: (category, message, context) => log('WARN', category, message, context),
    error: (category, message, context, metadata) => log('ERROR', category, message, context, metadata),
    critical: (category, message, context, metadata) => log('CRITICAL', category, message, context, metadata),
    // Domain-specific loggers
    api: {
        start: (endpoint, context) => log('INFO', 'api_call', `API call started: ${endpoint}`, context),
        success: (endpoint, duration, context) => log('INFO', 'api_call', `API call completed: ${endpoint}`, { ...context, duration }),
        error: (endpoint, error, context) => log('ERROR', 'api_call', `API call failed: ${endpoint}`, context, {
            errorCode: error.code,
            stackTrace: error.stack,
        }),
    },
    db: {
        query: (operation, duration, context) => log('DEBUG', 'database_query', `DB query: ${operation}`, { ...context, duration }),
        slow: (operation, duration, context) => log('WARN', 'database_query', `Slow DB query: ${operation} (${duration}ms)`, { ...context, duration }),
        error: (operation, error, context) => log('ERROR', 'database_query', `DB error: ${operation}`, context, {
            errorCode: error.code,
            stackTrace: error.stack,
        }),
    },
    ai: {
        start: (model, prompt, context) => log('INFO', 'ai_inference', `AI inference started: ${model}`, { ...context, operation: 'inference' }),
        success: (model, duration, tokens, context) => log('INFO', 'ai_inference', `AI inference completed: ${model}`, {
            ...context,
            duration,
            metadata: { tokens },
        }),
        error: (model, error, context) => log('ERROR', 'ai_inference', `AI inference failed: ${model}`, context, {
            errorCode: error.code,
            stackTrace: error.stack,
        }),
    },
    performance: {
        metric: (metricName, value, unit, context) => log('INFO', 'performance', `Performance metric: ${metricName} = ${value}${unit}`, context),
        slow: (operation, duration, threshold, context) => log('WARN', 'performance', `Slow operation: ${operation} took ${duration}ms (threshold: ${threshold}ms)`, context),
    },
    user: {
        action: (action, context) => log('INFO', 'user_interaction', `User action: ${action}`, context),
        feedback: (feedbackType, sentiment, context) => log('INFO', 'user_interaction', `User feedback: ${feedbackType} (${sentiment})`, context),
    },
    metamorphosis: {
        event: (event, context) => log('INFO', 'self_improvement', `Metamorphosis event: ${event}`, context),
        insight: (insight, context) => log('INFO', 'self_improvement', `HOLLY insight: ${insight}`, context),
    },
};
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Generate unique trace ID for request tracking
 */
function generateTraceId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Log to console (development only)
 */
function logToConsole(log) {
    const emoji = {
        DEBUG: '🔍',
        INFO: 'ℹ️',
        WARN: '⚠️',
        ERROR: '❌',
        CRITICAL: '🚨',
    }[log.level];
    const color = {
        DEBUG: '\x1b[36m', // Cyan
        INFO: '\x1b[32m', // Green
        WARN: '\x1b[33m', // Yellow
        ERROR: '\x1b[31m', // Red
        CRITICAL: '\x1b[35m', // Magenta
    }[log.level];
    const reset = '\x1b[0m';
    console.log(`${emoji} ${color}[${log.level}]${reset} [${log.category}] ${log.message}`, log.context);
    if (log.metadata?.stackTrace) {
        console.error(log.metadata.stackTrace);
    }
}
/**
 * Determine if log should be persisted to database
 */
function shouldPersistLog(log) {
    // Always persist errors and critical logs
    if (log.level === 'ERROR' || log.level === 'CRITICAL') {
        return true;
    }
    // Persist important system events
    if (log.category === 'self_improvement' || log.category === 'system') {
        return true;
    }
    // Persist slow performance issues
    if (log.category === 'performance' && log.level === 'WARN') {
        return true;
    }
    // Don't persist debug logs
    return false;
}
/**
 * Persist log to database (for important logs)
 */
async function persistLog(log) {
    try {
        // Note: This would require a new database model
        // For now, we'll store in a simple format
        // TODO: Create SystemLog model in Prisma schema
        // Placeholder - implement after adding database model
        console.log('📝 [Persist Log] Would persist to database:', log.message);
    }
    catch (error) {
        console.error('Failed to persist log:', error);
    }
}
/**
 * Handle critical errors (could send alerts, trigger rollbacks, etc.)
 */
async function handleCriticalError(log) {
    console.error('🚨 CRITICAL ERROR DETECTED:', log);
    // Future: Send alerts, trigger automated responses
    // For now, just ensure it's logged prominently
}
// ============================================================================
// LOG RETRIEVAL & ANALYSIS
// ============================================================================
/**
 * Get recent logs from buffer
 */
function getRecentLogs(filters) {
    return logBuffer.getLogs(filters);
}
/**
 * Get recent errors
 */
function getRecentErrors(limit = 10) {
    return logBuffer.getRecentErrors(limit);
}
/**
 * Get log statistics
 */
function getLogStats(since) {
    const logs = logBuffer.getLogs({ since });
    const byLevel = {
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0,
        CRITICAL: 0,
    };
    const byCategory = {};
    logs.forEach(log => {
        byLevel[log.level]++;
        byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });
    const errorRate = logs.length > 0
        ? ((byLevel.ERROR + byLevel.CRITICAL) / logs.length) * 100
        : 0;
    return {
        total: logs.length,
        byLevel,
        byCategory,
        errorRate,
    };
}
/**
 * Clear log buffer (use with caution)
 */
function clearLogs() {
    logBuffer.clear();
    console.log('🧹 Log buffer cleared');
}
// ============================================================================
// PERFORMANCE TRACKING UTILITIES
// ============================================================================
/**
 * Create a performance tracker for timing operations
 */
function createPerformanceTracker(operation, category, context) {
    const startTime = performance.now();
    return {
        end: async (additionalContext) => {
            const duration = performance.now() - startTime;
            await exports.logger.performance.metric(operation, duration, 'ms', {
                ...context,
                ...additionalContext,
            });
            return duration;
        },
    };
}
/**
 * Wrap async function with automatic logging
 */
function withLogging(fn, category, operationName) {
    return (async (...args) => {
        const tracker = createPerformanceTracker(operationName, category);
        try {
            const result = await fn(...args);
            await tracker.end({ status: 'success' });
            return result;
        }
        catch (error) {
            await tracker.end({ status: 'error' });
            await exports.logger.error(category, `${operationName} failed`, {}, {
                errorCode: error.code,
                stackTrace: error.stack,
            });
            throw error;
        }
    });
}
// ============================================================================
// EXPORTS
// ============================================================================
exports.default = exports.logger;
