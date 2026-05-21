/**
 * POST /api/hub/project — Phase 7: Project Lifecycle Hub
 *
 * Unified API route for the Project Lifecycle MCP Hub.
 * All project management, deployment, monitoring, and handoff tools
 * are proxied through this single endpoint.
 *
 * Auth: Requires x-internal-token header matching INTERNAL_API_SECRET.
 *
 * Actions:
 *   PROJECT:
 *     create_project       — Create a new lifecycle project
 *     get_project          — Get a project with deployments, alerts, handoffs
 *     list_projects        — List projects with optional status filter
 *     update_project_status— Update project status (ideation → live → archived)
 *     update_quality       — Update quality scores (test, perf, a11y, security)
 *     generate_brief       — AI-generate a project brief
 *     generate_architecture— AI-generate architecture documentation
 *     generate_roadmap     — AI-generate a phased development roadmap
 *     archive_project      — Archive a project
 *     delete_project       — Delete a project
 *
 *   DEPLOYMENT:
 *     create_deployment    — Create a deployment record
 *     get_deployment       — Get a deployment with project relation
 *     list_deployments     — List deployments with filters
 *     update_deployment    — Update deployment status
 *     record_build_metrics — Record build/deploy performance metrics
 *     generate_pipeline    — AI-generate CI/CD pipeline config
 *     deployment_history   — Get full deployment history for a project
 *     rollback_deployment  — Rollback to last successful deployment
 *
 *   MONITORING:
 *     create_alert         — Create a monitoring alert
 *     get_alerts           — List alerts with filters
 *     check_uptime         — Run an uptime check on a project
 *     run_security_scan    — AI-powered security scan
 *     run_performance_audit— AI-powered performance audit
 *     acknowledge_alert    — Acknowledge an alert
 *     resolve_alert        — Resolve an alert
 *     mute_alert           — Mute an alert
 *     escalate_alert       — Escalate an alert
 *     get_project_health   — Get overall project health summary
 *     cleanup_alerts       — Delete old resolved alerts
 *
 *   HANDOFF:
 *     create_handoff       — Create a client handoff package
 *     generate_all_docs    — AI-generate all handoff documents
 *     generate_overview    — AI-generate project overview
 *     generate_deploy_guide— AI-generate deployment guide
 *     generate_maintenance — AI-generate maintenance guide
 *     generate_api_docs    — AI-generate API documentation
 *     deliver_handoff      — Mark handoff as delivered
 *     accept_handoff       — Accept handoff with feedback
 *     get_handoff          — Get handoff with project relation
 *     list_handoffs        — List handoffs with filters
 *     update_handoff       — Update handoff fields
 */

import { NextRequest, NextResponse } from 'next/server';
import ProjectLifecycle from '@/lib/engines/project-lifecycle';
import DeploymentManager from '@/lib/engines/deployment-manager';
import MonitoringEngine from '@/lib/engines/project-monitoring-engine';
import ClientHandoffManager from '@/lib/engines/client-handoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INTERNAL_TOKEN = process.env.INTERNAL_API_SECRET || 'holly-internal';

// ── Auth helper ─────────────────────────────────────────────────────────────

function verifyToken(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  return token === INTERNAL_TOKEN;
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    if (!verifyToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { action, userId } = body;
    if (!action) {
      return NextResponse.json({ error: 'Missing "action" field' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'Missing "userId" field' }, { status: 400 });
    }

    const projectEngine = new ProjectLifecycle(userId);
    const deploymentEngine = new DeploymentManager(userId);
    const monitoringEngine = new MonitoringEngine(userId);
    const handoffEngine = new ClientHandoffManager(userId);

    switch (action) {

      // ════════════════════════════════════════════════════════════════════════
      // PROJECT ACTIONS
      // ════════════════════════════════════════════════════════════════════════

      case 'create_project': {
        const { name, description, clientName, clientEmail, stack, framework, database, hostingTargets, deadline, tags } = body;
        if (!name) {
          return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
        }
        const project = await projectEngine.createProject({ name, description, clientName, clientEmail, stack, framework, database, hostingTargets, deadline: deadline ? new Date(deadline) : undefined, tags });
        return NextResponse.json({ success: true, project });
      }

      case 'get_project': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const project = await projectEngine.getProject(projectId);
        return NextResponse.json({ success: true, project });
      }

      case 'list_projects': {
        const { status, limit } = body;
        const projects = await projectEngine.listProjects(status, limit);
        return NextResponse.json({ success: true, projects });
      }

      case 'update_project_status': {
        const { projectId, status, phase } = body;
        if (!projectId || !status) {
          return NextResponse.json({ error: 'Missing projectId or status' }, { status: 400 });
        }
        const project = await projectEngine.updateProjectStatus(projectId, status, phase);
        return NextResponse.json({ success: true, project });
      }

      case 'update_quality': {
        const { projectId, qualityScore, testCoverage, performanceScore, accessibilityScore, securityScore } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const project = await projectEngine.updateQualityScores(projectId, { qualityScore, testCoverage, performanceScore, accessibilityScore, securityScore });
        return NextResponse.json({ success: true, project });
      }

      case 'generate_brief': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const brief = await projectEngine.generateProjectBrief(projectId);
        return NextResponse.json({ success: true, brief });
      }

      case 'generate_architecture': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const doc = await projectEngine.generateArchitectureDoc(projectId);
        return NextResponse.json({ success: true, architectureDoc: doc });
      }

      case 'generate_roadmap': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const roadmap = await projectEngine.generateRoadmap(projectId);
        return NextResponse.json({ success: true, roadmap });
      }

      case 'archive_project': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        await projectEngine.archiveProject(projectId);
        return NextResponse.json({ success: true });
      }

      case 'delete_project': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        await projectEngine.deleteProject(projectId);
        return NextResponse.json({ success: true });
      }

      // ════════════════════════════════════════════════════════════════════════
      // DEPLOYMENT ACTIONS
      // ════════════════════════════════════════════════════════════════════════

      case 'create_deployment': {
        const { projectId, platform, environment, branch, commitSha, autoDeploy, branchAutoDeploy, customDomain, pipelineConfig } = body;
        if (!projectId || !platform) {
          return NextResponse.json({ error: 'Missing projectId or platform' }, { status: 400 });
        }
        const deployment = await deploymentEngine.createDeployment({ projectId, platform, environment, branch, commitSha, autoDeploy, branchAutoDeploy, customDomain, pipelineConfig });
        return NextResponse.json({ success: true, deployment });
      }

      case 'get_deployment': {
        const { deploymentId } = body;
        if (!deploymentId) {
          return NextResponse.json({ error: 'Missing deploymentId' }, { status: 400 });
        }
        const deployment = await deploymentEngine.getDeployment(deploymentId);
        return NextResponse.json({ success: true, deployment });
      }

      case 'list_deployments': {
        const { projectId, platform, status, limit } = body;
        const deployments = await deploymentEngine.listDeployments({ projectId, platform, status, limit });
        return NextResponse.json({ success: true, deployments });
      }

      case 'update_deployment': {
        const { deploymentId, status, error, buildLog, url } = body;
        if (!deploymentId || !status) {
          return NextResponse.json({ error: 'Missing deploymentId or status' }, { status: 400 });
        }
        const deployment = await deploymentEngine.updateDeploymentStatus(deploymentId, status, error, buildLog, url);
        return NextResponse.json({ success: true, deployment });
      }

      case 'record_build_metrics': {
        const { deploymentId, buildDurationSec, deployDurationSec, coldStartMs } = body;
        if (!deploymentId) {
          return NextResponse.json({ error: 'Missing deploymentId' }, { status: 400 });
        }
        const deployment = await deploymentEngine.recordBuildMetrics(deploymentId, { buildDurationSec, deployDurationSec, coldStartMs });
        return NextResponse.json({ success: true, deployment });
      }

      case 'generate_pipeline': {
        const { platform: pl, stack, framework, database, environment } = body;
        if (!pl || !stack) {
          return NextResponse.json({ error: 'Missing platform or stack' }, { status: 400 });
        }
        const config = await deploymentEngine.generatePipelineConfig({ platform: pl, stack, framework, database, environment });
        return NextResponse.json({ success: true, config });
      }

      case 'deployment_history': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const history = await deploymentEngine.getProjectDeploymentHistory(projectId);
        return NextResponse.json({ success: true, history });
      }

      case 'rollback_deployment': {
        const { deploymentId } = body;
        if (!deploymentId) {
          return NextResponse.json({ error: 'Missing deploymentId' }, { status: 400 });
        }
        const rollback = await deploymentEngine.rollbackDeployment(deploymentId);
        return NextResponse.json({ success: true, rollback });
      }

      // ════════════════════════════════════════════════════════════════════════
      // MONITORING ACTIONS
      // ════════════════════════════════════════════════════════════════════════

      case 'create_alert': {
        const { projectId, type, severity, title, description, metric, metricValue, thresholdValue, deploymentId, url } = body;
        if (!projectId || !type || !title) {
          return NextResponse.json({ error: 'Missing projectId, type, or title' }, { status: 400 });
        }
        const alert = await monitoringEngine.createAlert({ projectId, type, severity, title, description, metric, metricValue, thresholdValue, deploymentId, url });
        return NextResponse.json({ success: true, alert });
      }

      case 'get_alerts': {
        const { projectId, status, severity, type, limit } = body;
        const result = await monitoringEngine.getAlerts({ projectId, status, severity, type, limit });
        return NextResponse.json({ success: true, ...result });
      }

      case 'check_uptime': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const result = await monitoringEngine.checkUptime(projectId);
        return NextResponse.json({ success: true, result });
      }

      case 'run_security_scan': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const findings = await monitoringEngine.runSecurityScan(projectId);
        return NextResponse.json({ success: true, findings });
      }

      case 'run_performance_audit': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const findings = await monitoringEngine.runPerformanceAudit(projectId);
        return NextResponse.json({ success: true, findings });
      }

      case 'acknowledge_alert': {
        const { alertId } = body;
        if (!alertId) {
          return NextResponse.json({ error: 'Missing alertId' }, { status: 400 });
        }
        const alert = await monitoringEngine.acknowledgeAlert(alertId);
        return NextResponse.json({ success: true, alert });
      }

      case 'resolve_alert': {
        const { alertId, resolvedBy } = body;
        if (!alertId) {
          return NextResponse.json({ error: 'Missing alertId' }, { status: 400 });
        }
        const alert = await monitoringEngine.resolveAlert(alertId, resolvedBy);
        return NextResponse.json({ success: true, alert });
      }

      case 'mute_alert': {
        const { alertId } = body;
        if (!alertId) {
          return NextResponse.json({ error: 'Missing alertId' }, { status: 400 });
        }
        const alert = await monitoringEngine.muteAlert(alertId);
        return NextResponse.json({ success: true, alert });
      }

      case 'escalate_alert': {
        const { alertId } = body;
        if (!alertId) {
          return NextResponse.json({ error: 'Missing alertId' }, { status: 400 });
        }
        const alert = await monitoringEngine.escalateAlert(alertId);
        return NextResponse.json({ success: true, alert });
      }

      case 'get_project_health': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const health = await monitoringEngine.getProjectHealth(projectId);
        return NextResponse.json({ success: true, health });
      }

      case 'cleanup_alerts': {
        const { olderThanDays } = body;
        const deleted = await monitoringEngine.cleanupResolvedAlerts(olderThanDays);
        return NextResponse.json({ success: true, deleted });
      }

      // ════════════════════════════════════════════════════════════════════════
      // HANDOFF ACTIONS
      // ════════════════════════════════════════════════════════════════════════

      case 'create_handoff': {
        const { projectId, version, supportDays } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const handoff = await handoffEngine.createHandoff({ projectId, version, supportDays });
        return NextResponse.json({ success: true, handoff });
      }

      case 'generate_all_docs': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const handoff = await handoffEngine.generateAllDocs(projectId);
        return NextResponse.json({ success: true, handoff });
      }

      case 'generate_overview': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const overview = await handoffEngine.generateProjectOverview(projectId);
        return NextResponse.json({ success: true, overview });
      }

      case 'generate_deploy_guide': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const guide = await handoffEngine.generateDeploymentGuide(projectId);
        return NextResponse.json({ success: true, guide });
      }

      case 'generate_maintenance': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const guide = await handoffEngine.generateMaintenanceGuide(projectId);
        return NextResponse.json({ success: true, guide });
      }

      case 'generate_api_docs': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }
        const docs = await handoffEngine.generateAPIDocumentation(projectId);
        return NextResponse.json({ success: true, docs });
      }

      case 'deliver_handoff': {
        const { handoffId } = body;
        if (!handoffId) {
          return NextResponse.json({ error: 'Missing handoffId' }, { status: 400 });
        }
        const handoff = await handoffEngine.deliverHandoff(handoffId);
        return NextResponse.json({ success: true, handoff });
      }

      case 'accept_handoff': {
        const { handoffId, feedback, rating } = body;
        if (!handoffId) {
          return NextResponse.json({ error: 'Missing handoffId' }, { status: 400 });
        }
        const handoff = await handoffEngine.acceptHandoff(handoffId, feedback, rating);
        return NextResponse.json({ success: true, handoff });
      }

      case 'get_handoff': {
        const { handoffId } = body;
        if (!handoffId) {
          return NextResponse.json({ error: 'Missing handoffId' }, { status: 400 });
        }
        const handoff = await handoffEngine.getHandoff(handoffId);
        return NextResponse.json({ success: true, handoff });
      }

      case 'list_handoffs': {
        const { projectId, status, limit } = body;
        const handoffs = await handoffEngine.listHandoffs(projectId, status, limit);
        return NextResponse.json({ success: true, handoffs });
      }

      case 'update_handoff': {
        const { handoffId, updates } = body;
        if (!handoffId) {
          return NextResponse.json({ error: 'Missing handoffId' }, { status: 400 });
        }
        const handoff = await handoffEngine.updateHandoff(handoffId, updates);
        return NextResponse.json({ success: true, handoff });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error('[PROJECT HUB] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
