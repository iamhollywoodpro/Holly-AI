/**
 * MonitoringEngine — Holly AI Phase 7
 *
 * Health monitoring, alerts, and proactive issue detection for lifecycle projects.
 * Provides uptime checks, security scans, performance audits, and alert lifecycle management.
 */

import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import type { ChatMessage } from '@/lib/ai/providers/free-providers';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AlertType = 'uptime' | 'performance' | 'error' | 'security' | 'ssl' | 'cost';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'muted';

export interface CreateAlertOptions {
  projectId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  metric?: string;
  metricValue?: number;
  thresholdValue?: number;
  deploymentId?: string;
  url?: string;
}

export interface ProjectHealthSummary {
  projectId: string;
  projectName: string;
  liveUrl: string | null;
  status: string;
  qualityScore: number | null;
  performanceScore: number | null;
  securityScore: number | null;
  accessibilityScore: number | null;
  testCoverage: number | null;
  activeAlerts: {
    emergency: number;
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
  recentDeployments: Array<{
    id: string;
    platform: string;
    environment: string;
    status: string;
    url: string | null;
    completedAt: Date | null;
  }>;
  overallHealth: 'healthy' | 'degraded' | 'critical' | 'unknown';
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class MonitoringEngine {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ─── Alert CRUD ────────────────────────────────────────────────────────

  /**
   * Create a new monitoring alert for a project.
   */
  async createAlert(opts: CreateAlertOptions) {
    const alert = await prisma.monitoringAlert.create({
      data: {
        userId: this.userId,
        projectId: opts.projectId,
        type: opts.type,
        severity: opts.severity,
        title: opts.title,
        description: opts.description ?? null,
        metric: opts.metric ?? null,
        metricValue: opts.metricValue ?? null,
        thresholdValue: opts.thresholdValue ?? null,
        deploymentId: opts.deploymentId ?? null,
        url: opts.url ?? null,
        status: 'active',
        escalationLevel: 0,
        notifiedVia: {},
        metadata: {},
      },
    });

    return alert;
  }

  // ─── Uptime Monitoring ─────────────────────────────────────────────────

  /**
   * Simulate an uptime check for a project by fetching its liveUrl.
   * Creates an alert if the URL is missing, unreachable, or responds slowly.
   */
  async checkUptime(projectId: string) {
    const project = await prisma.lifecycleProject.findUnique({
      where: { id: projectId },
      select: {
        name: true,
        liveUrl: true,
        status: true,
      },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const results: { checked: boolean; alertId?: string; status: string; responseTimeMs?: number } = {
      checked: false,
      status: 'unknown',
    };

    // No live URL configured
    if (!project.liveUrl) {
      const alert = await this.createAlert({
        projectId,
        type: 'uptime',
        severity: 'warning',
        title: `No live URL configured for "${project.name}"`,
        description:
          'The project has no liveUrl set. Uptime monitoring cannot be performed. ' +
          'Please configure a deployment URL to enable health checks.',
        metric: 'url_configured',
        metricValue: 0,
        thresholdValue: 1,
      });

      results.checked = false;
      results.alertId = alert.id;
      results.status = 'no_url';
      return results;
    }

    // Attempt to reach the live URL
    const startTime = Date.now();
    try {
      const response = await fetch(project.liveUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(15_000), // 15s timeout
        headers: { 'User-Agent': 'HollyAI-Monitor/1.0' },
      });

      const responseTimeMs = Date.now() - startTime;
      results.checked = true;
      results.responseTimeMs = responseTimeMs;

      if (!response.ok) {
        // Server returned an error status
        const severity: AlertSeverity = response.status >= 500 ? 'critical' : 'warning';
        const alert = await this.createAlert({
          projectId,
          type: 'uptime',
          severity,
          title: `"${project.name}" returned HTTP ${response.status}`,
          description:
            `Uptime check failed for ${project.liveUrl}. ` +
            `Server responded with HTTP ${response.status} (${response.statusText}). ` +
            `Response time: ${responseTimeMs}ms.`,
          metric: 'http_status',
          metricValue: response.status,
          thresholdValue: 399,
          url: project.liveUrl,
        });
        results.alertId = alert.id;
        results.status = 'error_response';
      } else if (responseTimeMs > 5000) {
        // Response too slow (>5s)
        const alert = await this.createAlert({
          projectId,
          type: 'performance',
          severity: 'warning',
          title: `"${project.name}" is responding slowly`,
          description:
            `Response time of ${responseTimeMs}ms exceeds the 5000ms threshold. ` +
            `URL: ${project.liveUrl}. Consider investigating server performance.`,
          metric: 'response_time_ms',
          metricValue: responseTimeMs,
          thresholdValue: 5000,
          url: project.liveUrl,
        });
        results.alertId = alert.id;
        results.status = 'slow';
      } else {
        results.status = 'healthy';
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isTimeout = /timeout|abort|timed out/i.test(errorMessage);

      const alert = await this.createAlert({
        projectId,
        type: 'uptime',
        severity: isTimeout ? 'critical' : 'emergency',
        title: `"${project.name}" is unreachable`,
        description:
          `Uptime check failed for ${project.liveUrl}. ` +
          `Error: ${errorMessage}. ` +
          (isTimeout ? 'The server did not respond within 15 seconds.' : 'DNS resolution or connection failed.'),
        metric: isTimeout ? 'timeout' : 'connection_error',
        metricValue: 0,
        thresholdValue: 1,
        url: project.liveUrl,
      });

      results.checked = true;
      results.alertId = alert.id;
      results.status = 'unreachable';
    }

    return results;
  }

  // ─── Security Scanning ─────────────────────────────────────────────────

  /**
   * Run an AI-powered security scan against the project.
   * Uses cascadeCollect via the smart router to analyze and generate findings.
   */
  async runSecurityScan(projectId: string) {
    const project = await prisma.lifecycleProject.findUnique({
      where: { id: projectId },
      select: {
        name: true,
        description: true,
        liveUrl: true,
        stack: true,
        framework: true,
        database: true,
        repositoryUrl: true,
        status: true,
        metadata: true,
      },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const contextBlock = [
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : null,
      `Stack: ${project.stack}`,
      project.framework ? `Framework: ${project.framework}` : null,
      project.database ? `Database: ${project.database}` : null,
      project.liveUrl ? `Live URL: ${project.liveUrl}` : null,
      `Status: ${project.status}`,
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = `You are a security analyst AI. Analyze the following project and identify potential security vulnerabilities and risks. For each finding, provide a severity level and recommendation.

Project context:
${contextBlock}

Respond in JSON format with this structure:
{
  "findings": [
    {
      "title": "Short finding title",
      "severity": "info|warning|critical|emergency",
      "description": "Detailed explanation of the vulnerability",
      "recommendation": "How to fix it"
    }
  ],
  "overallRiskScore": 0-100,
  "summary": "Brief overall security assessment"
}

Only report realistic, actionable findings. If the project appears secure, return an empty findings array with a high risk score.`;

    try {
      const routing = await smartRoute(prompt, { forceTask: 'analysis' });
      const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
      const { text } = await cascadeCollect(
        routing.waterfall,
        messages,
        { temperature: 0.3, maxTokens: 2000 },
      );

      let parsed: {
        findings?: Array<{
          title: string;
          severity: string;
          description: string;
          recommendation: string;
        }>;
        overallRiskScore?: number;
        summary?: string;
      };

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { findings: [], summary: text };
      } catch {
        parsed = { findings: [], summary: text };
      }

      const alerts = [];
      const findings = parsed.findings ?? [];

      for (const finding of findings) {
        const validSeverities = ['info', 'warning', 'critical', 'emergency'];
        const severity = validSeverities.includes(finding.severity)
          ? (finding.severity as AlertSeverity)
          : 'warning';

        const alert = await this.createAlert({
          projectId,
          type: 'security',
          severity,
          title: finding.title,
          description: `${finding.description}\n\nRecommendation: ${finding.recommendation}`,
          metric: 'security_risk_score',
          metricValue: parsed.overallRiskScore ?? 0,
          url: project.liveUrl ?? undefined,
        });
        alerts.push(alert);
      }

      // Update the project's security score if we got one
      if (typeof parsed.overallRiskScore === 'number') {
        const securityScore = Math.max(0, 100 - parsed.overallRiskScore);
        await prisma.lifecycleProject.update({
          where: { id: projectId },
          data: { securityScore },
        });
      }

      return {
        findings: alerts,
        overallRiskScore: parsed.overallRiskScore ?? null,
        summary: parsed.summary ?? 'Security scan completed.',
        rawText: text,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // If AI fails, create a generic scan failure alert
      const alert = await this.createAlert({
        projectId,
        type: 'security',
        severity: 'info',
        title: `Security scan incomplete for "${project.name}"`,
        description: `AI-powered security scan could not complete: ${errorMessage}. Manual review recommended.`,
        metric: 'scan_status',
        metricValue: 0,
      });

      return {
        findings: [alert],
        overallRiskScore: null,
        summary: `Scan failed: ${errorMessage}`,
        rawText: null,
      };
    }
  }

  // ─── Performance Auditing ──────────────────────────────────────────────

  /**
   * Run an AI-powered performance audit on the project.
   * Uses cascadeCollect to generate actionable performance recommendations.
   */
  async runPerformanceAudit(projectId: string) {
    const project = await prisma.lifecycleProject.findUnique({
      where: { id: projectId },
      select: {
        name: true,
        description: true,
        liveUrl: true,
        stack: true,
        framework: true,
        status: true,
        performanceScore: true,
        metadata: true,
      },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const contextBlock = [
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : null,
      `Stack: ${project.stack}`,
      project.framework ? `Framework: ${project.framework}` : null,
      project.liveUrl ? `Live URL: ${project.liveUrl}` : null,
      `Status: ${project.status}`,
      project.performanceScore !== null ? `Current Performance Score: ${project.performanceScore}/100` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = `You are a web performance expert AI. Analyze the following project and identify performance optimization opportunities. Consider Core Web Vitals (LCP, FID, CLS), asset optimization, caching, rendering strategies, and database query efficiency.

Project context:
${contextBlock}

Respond in JSON format:
{
  "recommendations": [
    {
      "title": "Short recommendation title",
      "severity": "info|warning|critical",
      "description": "What the issue is and why it matters",
      "suggestion": "Specific actionable fix",
      "estimatedImpact": "low|medium|high"
    }
  ],
  "performanceScore": 0-100,
  "summary": "Brief overall performance assessment"
}

Be specific and actionable. If performance looks good, return a high score with informational tips.`;

    try {
      const routing = await smartRoute(prompt, { forceTask: 'analysis' });
      const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
      const { text } = await cascadeCollect(
        routing.waterfall,
        messages,
        { temperature: 0.3, maxTokens: 2000 },
      );

      let parsed: {
        recommendations?: Array<{
          title: string;
          severity: string;
          description: string;
          suggestion: string;
          estimatedImpact?: string;
        }>;
        performanceScore?: number;
        summary?: string;
      };

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { recommendations: [], summary: text };
      } catch {
        parsed = { recommendations: [], summary: text };
      }

      const alerts = [];
      const recommendations = parsed.recommendations ?? [];

      for (const rec of recommendations) {
        // Only create alerts for medium/high impact items or warning/critical severity
        const validSeverities = ['info', 'warning', 'critical'];
        const severity = validSeverities.includes(rec.severity)
          ? (rec.severity as AlertSeverity)
          : 'info';

        // Skip low-impact info items to reduce noise
        if (severity === 'info' && rec.estimatedImpact === 'low') continue;

        const alert = await this.createAlert({
          projectId,
          type: 'performance',
          severity,
          title: rec.title,
          description: `${rec.description}\n\nSuggestion: ${rec.suggestion}`,
          metric: rec.estimatedImpact ? `impact_${rec.estimatedImpact}` : 'performance_audit',
          url: project.liveUrl ?? undefined,
        });
        alerts.push(alert);
      }

      // Update the project's performance score
      if (typeof parsed.performanceScore === 'number') {
        await prisma.lifecycleProject.update({
          where: { id: projectId },
          data: { performanceScore: parsed.performanceScore },
        });
      }

      return {
        recommendations: alerts,
        performanceScore: parsed.performanceScore ?? project.performanceScore ?? null,
        summary: parsed.summary ?? 'Performance audit completed.',
        rawText: text,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      const alert = await this.createAlert({
        projectId,
        type: 'performance',
        severity: 'info',
        title: `Performance audit incomplete for "${project.name}"`,
        description: `AI-powered performance audit could not complete: ${errorMessage}. Manual review recommended.`,
        metric: 'audit_status',
        metricValue: 0,
      });

      return {
        recommendations: [alert],
        performanceScore: project.performanceScore ?? null,
        summary: `Audit failed: ${errorMessage}`,
        rawText: null,
      };
    }
  }

  // ─── Alert Lifecycle ───────────────────────────────────────────────────

  /**
   * Mark an alert as acknowledged.
   */
  async acknowledgeAlert(alertId: string) {
    const alert = await prisma.monitoringAlert.findUnique({
      where: { id: alertId },
      select: { userId: true, status: true },
    });

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    if (alert.userId !== this.userId) {
      throw new Error('Unauthorized: alert does not belong to this user');
    }

    if (alert.status !== 'active') {
      throw new Error(`Cannot acknowledge alert in "${alert.status}" status`);
    }

    return prisma.monitoringAlert.update({
      where: { id: alertId },
      data: {
        status: 'acknowledged',
        metadata: { acknowledgedAt: new Date().toISOString() },
      },
    });
  }

  /**
   * Mark an alert as resolved with an optional resolver reference.
   */
  async resolveAlert(alertId: string, resolvedBy?: string) {
    const alert = await prisma.monitoringAlert.findUnique({
      where: { id: alertId },
      select: { userId: true, status: true },
    });

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    if (alert.userId !== this.userId) {
      throw new Error('Unauthorized: alert does not belong to this user');
    }

    if (alert.status === 'resolved') {
      throw new Error('Alert is already resolved');
    }

    return prisma.monitoringAlert.update({
      where: { id: alertId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: resolvedBy ?? this.userId,
      },
    });
  }

  /**
   * Mute an alert to suppress future notifications.
   */
  async muteAlert(alertId: string) {
    const alert = await prisma.monitoringAlert.findUnique({
      where: { id: alertId },
      select: { userId: true, status: true },
    });

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    if (alert.userId !== this.userId) {
      throw new Error('Unauthorized: alert does not belong to this user');
    }

    if (alert.status === 'resolved') {
      throw new Error('Cannot mute a resolved alert');
    }

    return prisma.monitoringAlert.update({
      where: { id: alertId },
      data: {
        status: 'muted',
        metadata: { mutedAt: new Date().toISOString() },
      },
    });
  }

  /**
   * Escalate an alert by bumping its escalation level (max 3).
   * Higher escalation levels trigger more urgent notification channels.
   */
  async escalateAlert(alertId: string) {
    const alert = await prisma.monitoringAlert.findUnique({
      where: { id: alertId },
      select: { userId: true, escalationLevel: true, status: true },
    });

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    if (alert.userId !== this.userId) {
      throw new Error('Unauthorized: alert does not belong to this user');
    }

    if (alert.escalationLevel >= 3) {
      throw new Error('Alert is already at maximum escalation level (3)');
    }

    const newLevel = alert.escalationLevel + 1;

    // Optionally bump severity at higher escalation levels
    let severityBump: AlertSeverity | null = null;
    if (newLevel === 2) severityBump = 'critical';
    if (newLevel === 3) severityBump = 'emergency';

    const updateData: Record<string, unknown> = {
      escalationLevel: newLevel,
      metadata: {
        escalatedAt: new Date().toISOString(),
        escalationLevel: newLevel,
      },
    };

    if (severityBump && alert.status === 'active') {
      updateData.severity = severityBump;
    }

    return prisma.monitoringAlert.update({
      where: { id: alertId },
      data: updateData,
    });
  }

  // ─── Querying ──────────────────────────────────────────────────────────

  /**
   * List alerts with optional filters.
   */
  async getAlerts(filters?: {
    projectId?: string;
    status?: AlertStatus;
    severity?: AlertSeverity;
    type?: AlertType;
    limit?: number;
  }) {
    const where: Record<string, unknown> = {
      userId: this.userId,
    };

    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.status) where.status = filters.status;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.type) where.type = filters.type;

    const limit = filters?.limit ?? 50;

    const [alerts, total] = await Promise.all([
      prisma.monitoringAlert.findMany({
        where,
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      }),
      prisma.monitoringAlert.count({ where }),
    ]);

    return { alerts, total };
  }

  // ─── Health Summary ────────────────────────────────────────────────────

  /**
   * Get an overall health summary for a project including active alerts,
   * recent deployments, and quality scores.
   */
  async getProjectHealth(projectId: string): Promise<ProjectHealthSummary> {
    const project = await prisma.lifecycleProject.findUnique({
      where: { id: projectId },
      select: {
        name: true,
        liveUrl: true,
        status: true,
        qualityScore: true,
        performanceScore: true,
        securityScore: true,
        accessibilityScore: true,
        testCoverage: true,
        deployments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            platform: true,
            environment: true,
            status: true,
            url: true,
            completedAt: true,
          },
        },
      },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Count active alerts by severity
    const activeAlertCounts = await prisma.monitoringAlert.groupBy({
      by: ['severity'],
      where: {
        projectId,
        userId: this.userId,
        status: { in: ['active', 'acknowledged'] },
      },
      _count: { severity: true },
    });

    const emergency = activeAlertCounts.find((a) => a.severity === 'emergency')?._count.severity ?? 0;
    const critical = activeAlertCounts.find((a) => a.severity === 'critical')?._count.severity ?? 0;
    const warning = activeAlertCounts.find((a) => a.severity === 'warning')?._count.severity ?? 0;
    const info = activeAlertCounts.find((a) => a.severity === 'info')?._count.severity ?? 0;
    const total = emergency + critical + warning + info;

    // Determine overall health status
    let overallHealth: ProjectHealthSummary['overallHealth'] = 'healthy';
    if (emergency > 0) {
      overallHealth = 'critical';
    } else if (critical > 0) {
      overallHealth = 'critical';
    } else if (warning > 2) {
      overallHealth = 'degraded';
    } else if (warning > 0 || info > 3) {
      overallHealth = 'degraded';
    }

    return {
      projectId,
      projectName: project.name,
      liveUrl: project.liveUrl,
      status: project.status,
      qualityScore: project.qualityScore,
      performanceScore: project.performanceScore,
      securityScore: project.securityScore,
      accessibilityScore: project.accessibilityScore,
      testCoverage: project.testCoverage,
      activeAlerts: { emergency, critical, warning, info, total },
      recentDeployments: project.deployments.map((d) => ({
        id: d.id,
        platform: d.platform,
        environment: d.environment,
        status: d.status,
        url: d.url,
        completedAt: d.completedAt,
      })),
      overallHealth,
    };
  }

  // ─── Maintenance ───────────────────────────────────────────────────────

  /**
   * Delete resolved alerts older than the specified number of days.
   * Defaults to 30 days.
   */
  async cleanupResolvedAlerts(olderThanDays: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await prisma.monitoringAlert.deleteMany({
      where: {
        userId: this.userId,
        status: 'resolved',
        resolvedAt: {
          lt: cutoff,
        },
      },
    });

    return {
      deletedCount: result.count,
      cutoffDate: cutoff,
    };
  }
}

export default MonitoringEngine;
