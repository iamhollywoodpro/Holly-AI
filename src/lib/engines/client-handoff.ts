/**
 * ClientHandoffManager Engine — Holly AI Phase 7
 *
 * Generates client handoff documentation, manages delivery and acceptance.
 * Produces project overviews, architecture docs, API documentation,
 * deployment/maintenance/troubleshooting guides, security notes, and cost estimates.
 */

import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import type { ChatMessage } from '@/lib/ai/providers/free-providers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HandoffStatus = 'draft' | 'review' | 'delivered' | 'accepted';

interface CreateHandoffOptions {
  projectId: string;
  version?: string;
  supportDays?: number;
}

interface HandoffUpdates {
  version?: string;
  status?: HandoffStatus;
  projectOverview?: string;
  architectureDoc?: string;
  apiDocumentation?: string;
  deploymentGuide?: string;
  maintenanceGuide?: string;
  troubleshootingGuide?: string;
  securityNotes?: string;
  costEstimate?: string;
  runbookUrl?: string;
  trainingMaterials?: Array<{ title: string; content: string; type: string }>;
  videoWalkthroughUrl?: string;
  supportDays?: number;
  supportEndDate?: Date;
  supportContacts?: Array<{ name: string; role: string; email: string; phone: string }>;
  deliveredAt?: Date;
  acceptedAt?: Date;
  clientFeedback?: string;
  clientRating?: number;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// AI Helper
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  'You are Holly AI, an expert technical writer and project delivery specialist.';

async function aiGenerate(
  systemPrompt: string,
  userPrompt: string,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const routing = await smartRoute(userPrompt, { forceTask: 'creative' });
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  const { text } = await cascadeCollect(
    routing.waterfall,
    messages,
    {
      maxTokens: opts.maxTokens ?? 3000,
      temperature: opts.temperature ?? 0.7,
    },
  );
  return text;
}

// ---------------------------------------------------------------------------
// ClientHandoffManager Class
// ---------------------------------------------------------------------------

export class ClientHandoffManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // -----------------------------------------------------------------------
  // 1. Create Handoff
  // -----------------------------------------------------------------------

  async createHandoff(opts: CreateHandoffOptions) {
    const project = await prisma.lifecycleProject.findFirst({
      where: { id: opts.projectId, userId: this.userId },
    });

    if (!project) {
      throw new Error(`Project not found: ${opts.projectId}`);
    }

    const supportDays = opts.supportDays ?? 30;
    const supportEndDate = new Date();
    supportEndDate.setDate(supportEndDate.getDate() + supportDays);

    const handoff = await prisma.clientHandoff.create({
      data: {
        userId: this.userId,
        projectId: opts.projectId,
        version: opts.version ?? '1.0',
        status: 'draft',
        supportDays,
        supportEndDate,
        trainingMaterials: [],
        supportContacts: [],
        metadata: {},
      },
    });

    return handoff;
  }

  // -----------------------------------------------------------------------
  // 2. Generate All Docs
  // -----------------------------------------------------------------------

  async generateAllDocs(projectId: string) {
    const project = await prisma.lifecycleProject.findFirst({
      where: { id: projectId, userId: this.userId },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Find or create a draft handoff for this project
    let handoff = await prisma.clientHandoff.findFirst({
      where: { projectId, userId: this.userId, status: 'draft' },
    });

    if (!handoff) {
      handoff = await this.createHandoff({ projectId });
    }

    // Generate all documents in parallel
    const [
      projectOverview,
      architectureDoc,
      apiDocumentation,
      deploymentGuide,
      maintenanceGuide,
      troubleshootingGuide,
      securityNotes,
      costEstimate,
    ] = await Promise.all([
      this.generateProjectOverview(projectId),
      this.generateArchitectureDoc(projectId),
      this.generateAPIDocumentation(projectId),
      this.generateDeploymentGuide(projectId),
      this.generateMaintenanceGuide(projectId),
      this.generateTroubleshootingGuide(projectId),
      this.generateSecurityNotes(projectId),
      this.generateCostEstimate(projectId),
    ]);

    // Update the handoff with all generated docs
    const updated = await prisma.clientHandoff.update({
      where: { id: handoff.id },
      data: {
        projectOverview,
        architectureDoc,
        apiDocumentation,
        deploymentGuide,
        maintenanceGuide,
        troubleshootingGuide,
        securityNotes,
        costEstimate,
        status: 'review',
      },
      include: { project: true },
    });

    return updated;
  }

  // -----------------------------------------------------------------------
  // 3. Generate Project Overview
  // -----------------------------------------------------------------------

  async generateProjectOverview(projectId: string): Promise<string> {
    const project = await this.requireProject(projectId);

    const userPrompt = [
      'Generate a clear, non-technical project overview document for stakeholders and client teams.',
      '',
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : '',
      project.clientName ? `Client: ${project.clientName}` : '',
      project.stack ? `Tech Stack: ${project.stack}` : '',
      project.framework ? `Framework: ${project.framework}` : '',
      project.database ? `Database: ${project.database}` : '',
      project.hostingTargets && Array.isArray(project.hostingTargets) && (project.hostingTargets as string[]).length
        ? `Hosting: ${(project.hostingTargets as string[]).join(', ')}`
        : '',
      '',
      'Include: purpose, target users, key features, benefits, and high-level architecture summary.',
      'Use plain language suitable for non-technical stakeholders.',
    ]
      .filter(Boolean)
      .join('\n');

    const overview = await aiGenerate(SYSTEM_PROMPT, userPrompt, {
      maxTokens: 3000,
      temperature: 0.7,
    });

    return overview;
  }

  // -----------------------------------------------------------------------
  // 4. Generate Deployment Guide
  // -----------------------------------------------------------------------

  async generateDeploymentGuide(projectId: string): Promise<string> {
    const project = await this.requireProject(projectId);

    const userPrompt = [
      'Generate a comprehensive, step-by-step deployment guide for the following project.',
      '',
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : '',
      project.stack ? `Tech Stack: ${project.stack}` : '',
      project.framework ? `Framework: ${project.framework}` : '',
      project.database ? `Database: ${project.database}` : '',
      project.hostingTargets && Array.isArray(project.hostingTargets) && (project.hostingTargets as string[]).length
        ? `Hosting Targets: ${(project.hostingTargets as string[]).join(', ')}`
        : '',
      project.architectureDoc ? `\nExisting Architecture:\n${project.architectureDoc}` : '',
      '',
      'Include: prerequisites, environment setup, configuration, build steps, deployment commands,',
      'environment variables, DNS/SSL setup, database migrations, health checks, rollback procedures,',
      'and post-deployment verification steps.',
    ]
      .filter(Boolean)
      .join('\n');

    const guide = await aiGenerate(SYSTEM_PROMPT, userPrompt, {
      maxTokens: 3000,
      temperature: 0.7,
    });

    return guide;
  }

  // -----------------------------------------------------------------------
  // 5. Generate Maintenance Guide
  // -----------------------------------------------------------------------

  async generateMaintenanceGuide(projectId: string): Promise<string> {
    const project = await this.requireProject(projectId);

    const userPrompt = [
      'Generate a day-to-day maintenance and operations guide for the following project.',
      '',
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : '',
      project.stack ? `Tech Stack: ${project.stack}` : '',
      project.framework ? `Framework: ${project.framework}` : '',
      project.database ? `Database: ${project.database}` : '',
      project.hostingTargets && Array.isArray(project.hostingTargets) && (project.hostingTargets as string[]).length
        ? `Hosting: ${(project.hostingTargets as string[]).join(', ')}`
        : '',
      '',
      'Include: routine maintenance tasks (daily/weekly/monthly), monitoring and alerting setup,',
      'backup procedures, database maintenance, log management, performance optimization tips,',
      'security update procedures, scaling guidelines, and common operational runbooks.',
    ]
      .filter(Boolean)
      .join('\n');

    const guide = await aiGenerate(SYSTEM_PROMPT, userPrompt, {
      maxTokens: 3000,
      temperature: 0.7,
    });

    return guide;
  }

  // -----------------------------------------------------------------------
  // 6. Generate API Documentation
  // -----------------------------------------------------------------------

  async generateAPIDocumentation(projectId: string): Promise<string> {
    const project = await this.requireProject(projectId);

    const userPrompt = [
      'Generate comprehensive API documentation for the following project.',
      '',
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : '',
      project.stack ? `Tech Stack: ${project.stack}` : '',
      project.framework ? `Framework: ${project.framework}` : '',
      project.architectureDoc ? `\nArchitecture:\n${project.architectureDoc}` : '',
      '',
      'Include: authentication methods, all API endpoints (with methods, paths, request/response schemas),',
      'rate limiting, error codes, pagination, webhook integrations, SDK usage examples (curl, JavaScript, Python),',
      'versioning strategy, and deprecation policy.',
    ]
      .filter(Boolean)
      .join('\n');

    const docs = await aiGenerate(SYSTEM_PROMPT, userPrompt, {
      maxTokens: 3000,
      temperature: 0.7,
    });

    return docs;
  }

  // -----------------------------------------------------------------------
  // 7. Deliver Handoff
  // -----------------------------------------------------------------------

  async deliverHandoff(handoffId: string) {
    const handoff = await prisma.clientHandoff.findFirst({
      where: { id: handoffId, userId: this.userId },
    });

    if (!handoff) {
      throw new Error(`Handoff not found: ${handoffId}`);
    }

    if (handoff.status !== 'review') {
      throw new Error(`Handoff must be in 'review' status to deliver. Current: ${handoff.status}`);
    }

    const now = new Date();
    const supportEndDate = new Date(now);
    supportEndDate.setDate(supportEndDate.getDate() + handoff.supportDays);

    const updated = await prisma.clientHandoff.update({
      where: { id: handoffId },
      data: {
        status: 'delivered',
        deliveredAt: now,
        supportEndDate,
      },
      include: { project: true },
    });

    return updated;
  }

  // -----------------------------------------------------------------------
  // 8. Accept Handoff
  // -----------------------------------------------------------------------

  async acceptHandoff(
    handoffId: string,
    feedback?: string,
    rating?: number,
  ) {
    const handoff = await prisma.clientHandoff.findFirst({
      where: { id: handoffId, userId: this.userId },
    });

    if (!handoff) {
      throw new Error(`Handoff not found: ${handoffId}`);
    }

    if (handoff.status !== 'delivered') {
      throw new Error(`Handoff must be in 'delivered' status to accept. Current: ${handoff.status}`);
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new Error('Client rating must be between 1 and 5');
    }

    const updated = await prisma.clientHandoff.update({
      where: { id: handoffId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        ...(feedback !== undefined && { clientFeedback: feedback }),
        ...(rating !== undefined && { clientRating: rating }),
      },
      include: { project: true },
    });

    return updated;
  }

  // -----------------------------------------------------------------------
  // 9. Get Handoff
  // -----------------------------------------------------------------------

  async getHandoff(handoffId: string) {
    const handoff = await prisma.clientHandoff.findFirst({
      where: { id: handoffId, userId: this.userId },
      include: { project: true },
    });

    if (!handoff) {
      throw new Error(`Handoff not found: ${handoffId}`);
    }

    return handoff;
  }

  // -----------------------------------------------------------------------
  // 10. List Handoffs
  // -----------------------------------------------------------------------

  async listHandoffs(
    projectId?: string,
    status?: HandoffStatus,
    limit: number = 50,
  ) {
    const where: Record<string, unknown> = { userId: this.userId };

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    const handoffs = await prisma.clientHandoff.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { project: true },
    });

    return handoffs;
  }

  // -----------------------------------------------------------------------
  // 11. Update Handoff
  // -----------------------------------------------------------------------

  async updateHandoff(handoffId: string, updates: HandoffUpdates) {
    const handoff = await prisma.clientHandoff.findFirst({
      where: { id: handoffId, userId: this.userId },
    });

    if (!handoff) {
      throw new Error(`Handoff not found: ${handoffId}`);
    }

    const updated = await prisma.clientHandoff.update({
      where: { id: handoffId },
      data: updates,
      include: { project: true },
    });

    return updated;
  }

  // -----------------------------------------------------------------------
  // Private Helpers
  // -----------------------------------------------------------------------

  private async requireProject(projectId: string) {
    const project = await prisma.lifecycleProject.findFirst({
      where: { id: projectId, userId: this.userId },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return project;
  }

  private async generateArchitectureDoc(projectId: string): Promise<string> {
    const project = await this.requireProject(projectId);

    const userPrompt = [
      'Generate detailed architecture documentation for client handoff.',
      '',
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : '',
      project.stack ? `Tech Stack: ${project.stack}` : '',
      project.framework ? `Framework: ${project.framework}` : '',
      project.database ? `Database: ${project.database}` : '',
      project.architectureDoc ? `\nExisting Architecture:\n${project.architectureDoc}` : '',
      '',
      'Include: system design overview, component diagram, data flow, integration points,',
      'infrastructure layout, technology decisions and rationale, scalability considerations,',
      'and failure/recovery architecture.',
    ]
      .filter(Boolean)
      .join('\n');

    return aiGenerate(SYSTEM_PROMPT, userPrompt, { maxTokens: 3000, temperature: 0.7 });
  }

  private async generateTroubleshootingGuide(projectId: string): Promise<string> {
    const project = await this.requireProject(projectId);

    const userPrompt = [
      'Generate a troubleshooting guide covering common issues and their resolutions.',
      '',
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : '',
      project.stack ? `Tech Stack: ${project.stack}` : '',
      project.framework ? `Framework: ${project.framework}` : '',
      project.database ? `Database: ${project.database}` : '',
      '',
      'Include: common error messages with solutions, performance degradation diagnosis,',
      'database connectivity issues, deployment failures, SSL/certificate problems,',
      'authentication failures, third-party service outages, and escalation procedures.',
      'Organize by symptom -> diagnosis -> resolution format.',
    ]
      .filter(Boolean)
      .join('\n');

    return aiGenerate(SYSTEM_PROMPT, userPrompt, { maxTokens: 3000, temperature: 0.7 });
  }

  private async generateSecurityNotes(projectId: string): Promise<string> {
    const project = await this.requireProject(projectId);

    const userPrompt = [
      'Generate security notes and best practices documentation for the client.',
      '',
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : '',
      project.stack ? `Tech Stack: ${project.stack}` : '',
      project.framework ? `Framework: ${project.framework}` : '',
      project.database ? `Database: ${project.database}` : '',
      '',
      'Include: authentication and authorization overview, data protection measures,',
      'SSL/TLS configuration, secret management approach, API security measures,',
      'dependency vulnerability scanning, recommended security monitoring,',
      'incident response procedures, and compliance considerations.',
    ]
      .filter(Boolean)
      .join('\n');

    return aiGenerate(SYSTEM_PROMPT, userPrompt, { maxTokens: 3000, temperature: 0.7 });
  }

  private async generateCostEstimate(projectId: string): Promise<string> {
    const project = await this.requireProject(projectId);

    const userPrompt = [
      'Generate a cost estimation and resource planning document for the client.',
      '',
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : '',
      project.stack ? `Tech Stack: ${project.stack}` : '',
      project.framework ? `Framework: ${project.framework}` : '',
      project.database ? `Database: ${project.database}` : '',
      project.hostingTargets && Array.isArray(project.hostingTargets) && (project.hostingTargets as string[]).length
        ? `Hosting Targets: ${(project.hostingTargets as string[]).join(', ')}`
        : '',
      '',
      'Include: infrastructure costs (compute, storage, bandwidth), third-party service costs,',
      'database hosting costs, CDN costs, SSL certificate costs, monitoring/tooling costs,',
      'estimated scaling costs, ongoing maintenance cost projections, and cost optimization recommendations.',
    ]
      .filter(Boolean)
      .join('\n');

    return aiGenerate(SYSTEM_PROMPT, userPrompt, { maxTokens: 3000, temperature: 0.7 });
  }
}

export default ClientHandoffManager;
