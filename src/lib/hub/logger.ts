/**
 * HOLLY Tool Hub — Request Logger & Metrics
 *
 * In-memory ring buffer (last 1000 entries) + console output.
 * In production this would flush to a database or observability platform.
 */

import type { HubLogEntry, ToolId } from './types';
import { nanoid } from 'nanoid';

// ─── In-memory ring buffer ────────────────────────────────────────────────────

const MAX_LOG_ENTRIES = 1000;
const logBuffer: HubLogEntry[] = [];

export function writeLog(entry: HubLogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_ENTRIES) logBuffer.shift();

  const icon = entry.status === 'success' ? '✅' : entry.status === 'error' ? '❌' : '⏱';
  console.log(
    `[Hub] ${icon} ${entry.tool}.${entry.action} — ${entry.status} ${entry.statusCode} — ${entry.duration}ms` +
    (entry.errorMsg ? ` — ${entry.errorMsg}` : ''),
  );
}

export function getLogs(opts: {
  tool?:   ToolId;
  status?: HubLogEntry['status'];
  limit?:  number;
} = {}): HubLogEntry[] {
  let entries = [...logBuffer].reverse(); // newest first
  if (opts.tool)   entries = entries.filter(e => e.tool === opts.tool);
  if (opts.status) entries = entries.filter(e => e.status === opts.status);
  return entries.slice(0, opts.limit ?? 100);
}

export function getMetrics(): HubMetrics {
  const total   = logBuffer.length;
  const errors  = logBuffer.filter(e => e.status === 'error').length;
  const success = logBuffer.filter(e => e.status === 'success').length;
  const avgMs   = total
    ? Math.round(logBuffer.reduce((s, e) => s + e.duration, 0) / total)
    : 0;

  const byTool: Record<string, ToolMetric> = {};
  for (const entry of logBuffer) {
    if (!byTool[entry.tool]) byTool[entry.tool] = { requests: 0, errors: 0, avgDuration: 0, _totalDuration: 0 };
    byTool[entry.tool].requests++;
    if (entry.status === 'error') byTool[entry.tool].errors++;
    byTool[entry.tool]._totalDuration += entry.duration;
    byTool[entry.tool].avgDuration = Math.round(byTool[entry.tool]._totalDuration / byTool[entry.tool].requests);
  }

  return { total, success, errors, avgDuration: avgMs, byTool };
}

export function clearLogs(): void {
  logBuffer.length = 0;
}

export interface HubMetrics {
  total:       number;
  success:     number;
  errors:      number;
  avgDuration: number;
  byTool:      Record<string, ToolMetric>;
}

export interface ToolMetric {
  requests:      number;
  errors:        number;
  avgDuration:   number;
  _totalDuration: number;
}

// ─── Request ID ───────────────────────────────────────────────────────────────

export function newRequestId(): string {
  return `hub_${nanoid(12)}`;
}

// ─── Timing helper ────────────────────────────────────────────────────────────

export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
