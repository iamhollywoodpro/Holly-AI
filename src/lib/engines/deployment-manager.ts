/**
 * HOLLY Deployment Manager — Phase 7: Full External Project Building
 *
 * Manages deployments across multiple hosting platforms (Vercel, Netlify, AWS,
 * Coolify, Railway, DigitalOcean). Handles CI/CD pipeline generation via AI,
 * status tracking with timestamp management, performance metrics, and rollback.
 *
 * Uses LifecycleDeployment + LifecycleProject Prisma models.
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import type { ChatMessage } from '@/lib/ai/providers/free-providers';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DeploymentPlatform =
  | 'vercel'
  | 'netlify'
  | 'aws'
  | 'coolify'
  | 'railway'
  | 'digitalocean';

export type DeploymentEnvironment = 'production' | 'staging' | 'preview';

export type DeploymentStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'live'
  | 'failed'
  | 'rolled_back';

export interface CreateDeploymentOpts {
  projectId: string;
  platform: DeploymentPlatform;
  environment?: DeploymentEnvironment;
  branch?: string;
  commitSha?: string;
  autoDeploy?: boolean;
  branchAutoDeploy?: string;
  customDomain?: string;
  pipelineConfig?: Record<string, unknown>;
}

export interface BuildMetrics {
  buildDurationSec?: number;
  deployDurationSec?: number;
  coldStartMs?: number;
}

export interface GeneratePipelineOpts {
  platform: DeploymentPlatform;
  stack: string;
  framework?: string;
  database?: string;
  environment: DeploymentEnvironment;
}

// ─── DeploymentManager Class ────────────────────────────────────────────────

export class DeploymentManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ── 1. Create Deployment ─────────────────────────────────────────────────

  /**
   * Creates a new LifecycleDeployment record in pending status.
   */
  async createDeployment(opts: CreateDeploymentOpts) {
    // Verify the project belongs to this user
    const project = await prisma.lifecycleProject.findFirst({
      where: { id: opts.projectId, userId: this.userId },
    });
    if (!project) {
      throw new Error(
        `Project ${opts.projectId} not found or not owned by user ${this.userId}`,
      );
    }

    const deployment = await prisma.lifecycleDeployment.create({
      data: {
        userId: this.userId,
        projectId: opts.projectId,
        platform: opts.platform,
        environment: opts.environment ?? 'production',
        status: 'pending',
        branch: opts.branch,
        commitSha: opts.commitSha,
        autoDeploy: opts.autoDeploy ?? false,
        branchAutoDeploy: opts.branchAutoDeploy,
        customDomain: opts.customDomain,
        pipelineConfig: (opts.pipelineConfig ?? undefined) as any,
      },
      include: { project: true },
    });

    return deployment;
  }

  // ── 2. Update Deployment Status ──────────────────────────────────────────

  /**
   * Updates deployment status with automatic timestamp management:
   *  - building  → sets startedAt
   *  - deploying → keeps startedAt
   *  - live      → sets completedAt
   *  - failed    → sets completedAt
   */
  async updateDeploymentStatus(
    deploymentId: string,
    status: DeploymentStatus,
    error?: string,
    buildLog?: string,
    url?: string,
  ) {
    const existing = await prisma.lifecycleDeployment.findFirst({
      where: { id: deploymentId, userId: this.userId },
    });
    if (!existing) {
      throw new Error(
        `Deployment ${deploymentId} not found or not owned by user ${this.userId}`,
      );
    }

    // Build the update payload with smart timestamp management
    const updateData: Record<string, unknown> = { status };

    // Set startedAt when transitioning to building
    if (status === 'building' && !existing.startedAt) {
      updateData.startedAt = new Date();
    }

    // Set completedAt when reaching a terminal state
    if (status === 'live' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    // Conditionally apply optional fields
    if (error !== undefined) {
      updateData.error = error;
    }
    if (buildLog !== undefined) {
      updateData.buildLog = buildLog;
    }
    if (url !== undefined) {
      updateData.url = url;
    }

    // Enable SSL automatically when a custom domain is set and deployment goes live
    if (
      status === 'live' &&
      existing.customDomain &&
      !existing.sslEnabled
    ) {
      updateData.sslEnabled = true;
      updateData.sslExpiry = new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000,
      ); // 90 days from now
    }

    const updated = await prisma.lifecycleDeployment.update({
      where: { id: deploymentId },
      data: updateData,
      include: { project: true },
    });

    return updated;
  }

  // ── 3. Record Build Metrics ──────────────────────────────────────────────

  /**
   * Records performance metrics (build time, deploy time, cold start) on a deployment.
   */
  async recordBuildMetrics(deploymentId: string, metrics: BuildMetrics) {
    const existing = await prisma.lifecycleDeployment.findFirst({
      where: { id: deploymentId, userId: this.userId },
    });
    if (!existing) {
      throw new Error(
        `Deployment ${deploymentId} not found or not owned by user ${this.userId}`,
      );
    }

    const updateData: Record<string, unknown> = {};
    if (metrics.buildDurationSec !== undefined) {
      updateData.buildDurationSec = metrics.buildDurationSec;
    }
    if (metrics.deployDurationSec !== undefined) {
      updateData.deployDurationSec = metrics.deployDurationSec;
    }
    if (metrics.coldStartMs !== undefined) {
      updateData.coldStartMs = metrics.coldStartMs;
    }

    const updated = await prisma.lifecycleDeployment.update({
      where: { id: deploymentId },
      data: updateData,
    });

    return updated;
  }

  // ── 4. Generate Pipeline Config (AI) ─────────────────────────────────────

  /**
   * Uses AI (smartRoute + cascadeCollect) to generate a CI/CD pipeline
   * configuration for the target platform. Returns a parsed JSON config
   * suitable for the specified platform, stack, and environment.
   */
  async generatePipelineConfig(opts: GeneratePipelineOpts): Promise<Record<string, unknown>> {
    const platformGuides: Record<string, string> = {
      vercel: 'Vercel: Use vercel.json or next.config.js. Supports serverless functions, edge middleware, automatic preview deployments.',
      netlify: 'Netlify: Use netlify.toml. Supports serverless functions, redirects/headers, form handling, build plugins.',
      aws: 'AWS: Use AWS CDK, CloudFormation, or Terraform. Supports ECS Fargate, Lambda, S3+CloudFront, CodePipeline.',
      coolify: 'Coolify: Use docker-compose.yml or Coolify config. Self-hosted PaaS, supports Docker, Nixpacks, custom build packs.',
      railway: 'Railway: Use railway.json or railway.toml. Supports Dockerfile, Nixpacks, cron jobs, environment-based deploys.',
      digitalocean: 'DigitalOcean: Use app spec YAML (DigitalOcean App Platform). Supports Dockerfile, Heroku buildpacks, static sites.',
    };

    const guide = platformGuides[opts.platform] ?? opts.platform;

    const systemPrompt = `You are an expert DevOps engineer specializing in CI/CD pipeline configurations.
Generate a complete, production-ready pipeline/deployment configuration for the following:
- Platform: ${opts.platform}
- Stack: ${opts.stack}
- Framework: ${opts.framework ?? 'N/A'}
- Database: ${opts.database ?? 'N/A'}
- Environment: ${opts.environment}

Platform guide: ${guide}

Return ONLY a valid JSON object representing the pipeline configuration. The JSON should include:
1. Build steps and commands
2. Environment variable setup (use placeholders)
3. Deploy configuration for the target platform
4. Any platform-specific settings (domains, SSL, caching, etc.)
5. Rollback strategy
6. Health check endpoints if applicable

Make it specific to ${opts.platform} — do NOT return a generic config.`;

    const userMessage = `Generate a ${opts.platform} deployment pipeline config for a ${opts.stack} app${opts.framework ? ` using ${opts.framework}` : ''}${opts.database ? ` with ${opts.database} database` : ''} targeting ${opts.environment}.`;

    // Route to the best coding model via smart router
    const route = await smartRoute(userMessage, {
      forceTask: 'coding',
    });

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];
    const { text } = await cascadeCollect(
      route.waterfall,
      messages,
      { temperature: 0.3, maxTokens: 4000 },
    );

    // Parse the JSON from the AI response (strip markdown fences if present)
    let config: Record<string, unknown>;
    try {
      const cleaned = text
        .replace(/^```(?:json)?\s*\n?/m, '')
        .replace(/\n?```\s*$/m, '')
        .trim();
      config = JSON.parse(cleaned);
    } catch {
      // If parsing fails, wrap the raw text as a config
      config = {
        _raw: text,
        _warning: 'AI output was not valid JSON; raw text included.',
        platform: opts.platform,
        environment: opts.environment,
      };
    }

    return config;
  }

  // ── 5. Get Single Deployment ─────────────────────────────────────────────

  /**
   * Returns a full deployment record with its related LifecycleProject.
   */
  async getDeployment(deploymentId: string) {
    const deployment = await prisma.lifecycleDeployment.findFirst({
      where: { id: deploymentId, userId: this.userId },
      include: { project: true },
    });

    if (!deployment) {
      throw new Error(
        `Deployment ${deploymentId} not found or not owned by user ${this.userId}`,
      );
    }

    return deployment;
  }

  // ── 6. List Deployments ──────────────────────────────────────────────────

  /**
   * Lists deployments with optional filters for project, platform, and status.
   * Returns most recent first, up to the specified limit.
   */
  async listDeployments(opts?: {
    projectId?: string;
    platform?: DeploymentPlatform;
    status?: DeploymentStatus;
    limit?: number;
  }) {
    const where: Record<string, unknown> = { userId: this.userId };

    if (opts?.projectId) {
      where.projectId = opts.projectId;
    }
    if (opts?.platform) {
      where.platform = opts.platform;
    }
    if (opts?.status) {
      where.status = opts.status;
    }

    const deployments = await prisma.lifecycleDeployment.findMany({
      where,
      include: { project: true },
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
    });

    return deployments;
  }

  // ── 7. Get Project Deployment History ────────────────────────────────────

  /**
   * Returns the full deployment history for a project, including metrics
   * and timeline data, ordered by most recent first.
   */
  async getProjectDeploymentHistory(projectId: string) {
    // Verify project ownership
    const project = await prisma.lifecycleProject.findFirst({
      where: { id: projectId, userId: this.userId },
    });
    if (!project) {
      throw new Error(
        `Project ${projectId} not found or not owned by user ${this.userId}`,
      );
    }

    const deployments = await prisma.lifecycleDeployment.findMany({
      where: { projectId, userId: this.userId },
      include: { project: true },
      orderBy: { createdAt: 'desc' },
    });

    // Compute summary stats
    const total = deployments.length;
    const successful = deployments.filter((d) => d.status === 'live').length;
    const failed = deployments.filter((d) => d.status === 'failed').length;
    const rollbacks = deployments.filter(
      (d) => d.status === 'rolled_back',
    ).length;

    const avgBuildDuration =
      deployments
        .filter((d) => d.buildDurationSec !== null)
        .reduce((sum, d) => sum + (d.buildDurationSec ?? 0), 0) /
        (deployments.filter((d) => d.buildDurationSec !== null).length || 1);

    const avgDeployDuration =
      deployments
        .filter((d) => d.deployDurationSec !== null)
        .reduce((sum, d) => sum + (d.deployDurationSec ?? 0), 0) /
        (deployments.filter((d) => d.deployDurationSec !== null).length || 1);

    const avgColdStart =
      deployments
        .filter((d) => d.coldStartMs !== null)
        .reduce((sum, d) => sum + (d.coldStartMs ?? 0), 0) /
        (deployments.filter((d) => d.coldStartMs !== null).length || 1);

    // Per-platform breakdown
    const byPlatform: Record<string, number> = {};
    for (const d of deployments) {
      byPlatform[d.platform] = (byPlatform[d.platform] ?? 0) + 1;
    }

    // Per-environment breakdown
    const byEnvironment: Record<string, number> = {};
    for (const d of deployments) {
      byEnvironment[d.environment] = (byEnvironment[d.environment] ?? 0) + 1;
    }

    return {
      project,
      deployments,
      summary: {
        total,
        successful,
        failed,
        rollbacks,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        avgBuildDurationSec: Math.round(avgBuildDuration * 100) / 100,
        avgDeployDurationSec: Math.round(avgDeployDuration * 100) / 100,
        avgColdStartMs: Math.round(avgColdStart * 100) / 100,
        byPlatform,
        byEnvironment,
      },
    };
  }

  // ── 8. Rollback Deployment ───────────────────────────────────────────────

  /**
   * Creates a rollback by finding the last successful (live) deployment for
   * the same project/platform/environment and creating a new deployment
   * record that re-deploys from that commit SHA. The current deployment is
   * marked as rolled_back.
   */
  async rollbackDeployment(deploymentId: string) {
    // Fetch the deployment to roll back
    const current = await prisma.lifecycleDeployment.findFirst({
      where: { id: deploymentId, userId: this.userId },
    });
    if (!current) {
      throw new Error(
        `Deployment ${deploymentId} not found or not owned by user ${this.userId}`,
      );
    }

    // Mark the current deployment as rolled_back
    await prisma.lifecycleDeployment.update({
      where: { id: deploymentId },
      data: {
        status: 'rolled_back',
        completedAt: new Date(),
      },
    });

    // Find the last successful deployment for this project/platform/environment
    const lastSuccessful = await prisma.lifecycleDeployment.findFirst({
      where: {
        projectId: current.projectId,
        platform: current.platform,
        environment: current.environment,
        status: 'live',
        userId: this.userId,
        id: { not: deploymentId },
      },
      orderBy: { completedAt: 'desc' },
    });

    if (!lastSuccessful) {
      throw new Error(
        `No successful deployment found to roll back to for project ${current.projectId} on ${current.platform}/${current.environment}`,
      );
    }

    // Create a new deployment record that re-deploys from the last successful commit
    const rollbackDeployment = await prisma.lifecycleDeployment.create({
      data: {
        userId: this.userId,
        projectId: current.projectId,
        platform: current.platform,
        environment: current.environment,
        status: 'pending',
        branch: lastSuccessful.branch,
        commitSha: lastSuccessful.commitSha,
        autoDeploy: false,
        customDomain: current.customDomain,
        pipelineConfig: lastSuccessful.pipelineConfig as Prisma.InputJsonValue | undefined,
        metadata: {
          rollbackFrom: deploymentId,
          rollbackTo: lastSuccessful.id,
          rollbackReason: 'Manual rollback via DeploymentManager',
          rolledBackAt: new Date().toISOString(),
        },
      },
      include: { project: true },
    });

    return {
      rolledBackDeployment: deploymentId,
      restoredFrom: lastSuccessful.id,
      newDeployment: rollbackDeployment,
    };
  }
}

export default DeploymentManager;
