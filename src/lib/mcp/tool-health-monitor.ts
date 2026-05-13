/**
 * Tool Health Monitor — Tracks MCP tool call success rates and auto-disables failing tools
 *
 * Features:
 * - Per-tool success/failure tracking with rolling window
 * - Configurable alert thresholds
 * - Auto-disable tools below minimum success rate
 * - Health summary reporting
 * - Circuit breaker pattern for tool calls
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ToolHealthRecord {
  toolName: string;
  totalCalls: number;
  successCalls: number;
  failureCalls: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastError: string | null;
  consecutiveFailures: number;
  isEnabled: boolean;
  disabledReason: string | null;
  disabledAt: number | null;
}

export interface HealthCheckConfig {
  /** Minimum success rate (0-1) before alerting. Default: 0.9 */
  alertThreshold: number;
  /** Minimum success rate (0-1) before auto-disable. Default: 0.5 */
  disableThreshold: number;
  /** Minimum calls before evaluating health. Default: 5 */
  minimumCalls: number;
  /** Rolling window in milliseconds. Default: 3600000 (1 hour) */
  windowMs: number;
  /** Maximum consecutive failures before circuit opens. Default: 3 */
  maxConsecutiveFailures: number;
}

export interface HealthSummary {
  totalTools: number;
  healthyTools: number;
  degradedTools: number;
  disabledTools: number;
  tools: ToolHealthSummary[];
}

export interface ToolHealthSummary {
  toolName: string;
  successRate: number;
  totalCalls: number;
  isEnabled: boolean;
  status: 'healthy' | 'degraded' | 'disabled';
}

// ─── Call Record for Rolling Window ─────────────────────────────────────────

interface CallRecord {
  timestamp: number;
  success: boolean;
  error?: string;
}

// ─── Default Configuration ──────────────────────────────────────────────────

export const DEFAULT_HEALTH_CONFIG: HealthCheckConfig = {
  alertThreshold: 0.9,
  disableThreshold: 0.5,
  minimumCalls: 5,
  windowMs: 3600000, // 1 hour
  maxConsecutiveFailures: 3,
};

// ─── Tool Health Monitor ────────────────────────────────────────────────────

export class ToolHealthMonitor {
  private config: HealthCheckConfig;
  private records: Map<string, CallRecord[]> = new Map();
  private disabledTools: Map<string, { reason: string; disabledAt: number }> = new Map();
  private consecutiveFailures: Map<string, number> = new Map();
  private lastErrors: Map<string, string> = new Map();

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = { ...DEFAULT_HEALTH_CONFIG, ...config };
  }

  /**
   * Record a successful tool call.
   */
  recordSuccess(toolName: string): void {
    this.addRecord(toolName, { timestamp: Date.now(), success: true });
    this.consecutiveFailures.set(toolName, 0);
  }

  /**
   * Record a failed tool call.
   */
  recordFailure(toolName: string, error: string = 'Unknown error'): void {
    this.addRecord(toolName, { timestamp: Date.now(), success: false, error });
    const current = this.consecutiveFailures.get(toolName) ?? 0;
    this.consecutiveFailures.set(toolName, current + 1);
    this.lastErrors.set(toolName, error);

    // Check if we should auto-disable
    if (current + 1 >= this.config.maxConsecutiveFailures) {
      this.disableTool(toolName, `Consecutive failures: ${current + 1}`);
    }
  }

  /**
   * Check if a tool is enabled and can be called.
   */
  isToolEnabled(toolName: string): boolean {
    return !this.disabledTools.has(toolName);
  }

  /**
   * Get the success rate for a tool (0-1), considering only calls within the rolling window.
   */
  getSuccessRate(toolName: string): number {
    const records = this.getRecordsInWindow(toolName);
    if (records.length === 0) return 1; // No data = assume healthy
    const successes = records.filter(r => r.success).length;
    return successes / records.length;
  }

  /**
   * Get the health record for a specific tool.
   */
  getToolHealth(toolName: string): ToolHealthRecord {
    const records = this.getRecordsInWindow(toolName);
    const successes = records.filter(r => r.success);
    const failures = records.filter(r => !r.success);
    const disabled = this.disabledTools.get(toolName);

    return {
      toolName,
      totalCalls: records.length,
      successCalls: successes.length,
      failureCalls: failures.length,
      lastSuccessAt: successes.length > 0 ? successes[successes.length - 1].timestamp : null,
      lastFailureAt: failures.length > 0 ? failures[failures.length - 1].timestamp : null,
      lastError: this.lastErrors.get(toolName) ?? null,
      consecutiveFailures: this.consecutiveFailures.get(toolName) ?? 0,
      isEnabled: !disabled,
      disabledReason: disabled?.reason ?? null,
      disabledAt: disabled?.disabledAt ?? null,
    };
  }

  /**
   * Get a full health summary across all tracked tools.
   */
  getHealthSummary(): HealthSummary {
    const allTools = new Set<string>();
    for (const toolName of this.records.keys()) allTools.add(toolName);
    for (const toolName of this.disabledTools.keys()) allTools.add(toolName);

    const tools: ToolHealthSummary[] = [];
    let healthyCount = 0;
    let degradedCount = 0;
    let disabledCount = 0;

    for (const toolName of allTools) {
      const rate = this.getSuccessRate(toolName);
      const records = this.getRecordsInWindow(toolName);
      const isEnabled = this.isToolEnabled(toolName);

      let status: 'healthy' | 'degraded' | 'disabled';
      if (!isEnabled) {
        status = 'disabled';
        disabledCount++;
      } else if (records.length >= this.config.minimumCalls && rate < this.config.alertThreshold) {
        status = 'degraded';
        degradedCount++;
      } else {
        status = 'healthy';
        healthyCount++;
      }

      tools.push({
        toolName,
        successRate: rate,
        totalCalls: records.length,
        isEnabled,
        status,
      });
    }

    return {
      totalTools: allTools.size,
      healthyTools: healthyCount,
      degradedTools: degradedCount,
      disabledTools: disabledCount,
      tools: tools.sort((a, b) => a.toolName.localeCompare(b.toolName)),
    };
  }

  /**
   * Manually disable a tool.
   */
  disableTool(toolName: string, reason: string): void {
    this.disabledTools.set(toolName, { reason, disabledAt: Date.now() });
  }

  /**
   * Re-enable a previously disabled tool.
   */
  enableTool(toolName: string): void {
    this.disabledTools.delete(toolName);
    this.consecutiveFailures.set(toolName, 0);
  }

  /**
   * Get tools that should be alerted on (degraded but not disabled).
   */
  getAlerts(): ToolHealthSummary[] {
    const summary = this.getHealthSummary();
    return summary.tools.filter(t => t.status === 'degraded');
  }

  /**
   * Clean up old records outside the rolling window.
   */
  cleanup(): void {
    const cutoff = Date.now() - this.config.windowMs;
    for (const [toolName, records] of this.records.entries()) {
      const filtered = records.filter(r => r.timestamp >= cutoff);
      if (filtered.length === 0) {
        this.records.delete(toolName);
      } else {
        this.records.set(toolName, filtered);
      }
    }
  }

  // ─── Private Methods ──────────────────────────────────────────────────

  private addRecord(toolName: string, record: CallRecord): void {
    if (!this.records.has(toolName)) {
      this.records.set(toolName, []);
    }
    this.records.get(toolName)!.push(record);
  }

  private getRecordsInWindow(toolName: string): CallRecord[] {
    const cutoff = Date.now() - this.config.windowMs;
    const records = this.records.get(toolName) ?? [];
    return records.filter(r => r.timestamp >= cutoff);
  }
}
