/**
 * ProjectLifecycle Engine — Holly AI Phase 7
 * Manages the full project lifecycle from ideation to delivery.
 */

import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import type { ChatMessage } from '@/lib/ai/providers/free-providers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProjectStatus =
  | 'ideation'
  | 'planning'
  | 'scaffolding'
  | 'developing'
  | 'testing'
  | 'staging'
  | 'deploying'
  | 'live'
  | 'maintenance'
  | 'archived';

interface CreateProjectOptions {
  name: string;
  description?: string;
  clientName?: string;
  clientEmail?: string;
  stack?: string;
  framework?: string;
  database?: string;
  hostingTargets?: string[];
  deadline?: Date;
  tags?: string[];
}

interface QualityScores {
  qualityScore?: number;
  testCoverage?: number;
  performanceScore?: number;
  accessibilityScore?: number;
  securityScore?: number;
}

// ---------------------------------------------------------------------------
// AI Helper
// ---------------------------------------------------------------------------

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
      maxTokens: opts.maxTokens ?? 2000,
      temperature: opts.temperature ?? 0.7,
    },
  );
  return text;
}

// ---------------------------------------------------------------------------
// ProjectLifecycle Class
// ---------------------------------------------------------------------------

export class ProjectLifecycle {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // -----------------------------------------------------------------------
  // 1. Create Project
  // -----------------------------------------------------------------------

  async createProject(opts: CreateProjectOptions) {
    const project = await prisma.lifecycleProject.create({
      data: {
        userId: this.userId,
        name: opts.name,
        description: opts.description ?? null,
        clientName: opts.clientName ?? null,
        clientEmail: opts.clientEmail ?? null,
        stack: opts.stack ?? 'nextjs',
        framework: opts.framework ?? null,
        database: opts.database ?? null,
        hostingTargets: opts.hostingTargets ?? undefined,
        status: 'ideation',
        phase: 'planning',
        qualityScore: 0,
        testCoverage: 0,
        performanceScore: 0,
        accessibilityScore: 0,
        securityScore: 0,
        deadline: opts.deadline ?? null,
        tags: opts.tags ?? [],
        metadata: {},
      },
    });

    return project;
  }

  // -----------------------------------------------------------------------
  // 2. Generate Project Brief
  // -----------------------------------------------------------------------

  async generateProjectBrief(projectId: string): Promise<string> {
    const project = await prisma.lifecycleProject.findFirst({
      where: { id: projectId, userId: this.userId },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const systemPrompt = `You are Holly AI, an expert project architect. Generate a comprehensive project brief that covers objectives, scope, target users, key features, success criteria, and constraints. Be thorough but concise.`;

    const userPrompt = [
      `Generate a detailed project brief for the following project:`,
      ``,
      `Project Name: ${project.name}`,
      project.description ? `Description: ${project.description}` : '',
      project.clientName ? `Client: ${project.clientName}` : '',
      project.clientEmail ? `Client Email: ${project.clientEmail}` : '',
      project.stack ? `Tech Stack: ${project.stack}` : '',
      project.framework ? `Framework: ${project.framework}` : '',
      project.database ? `Database: ${project.database}` : '',
      project.deadline ? `Deadline: ${project.deadline.toISOString()}` : '',
      Array.isArray(project.tags) && (project.tags as string[]).length
        ? `Tags: ${(project.tags as string[]).join(', ')}`
        : '',
      project.hostingTargets && Array.isArray(project.hostingTargets) && (project.hostingTargets as string[]).length
        ? `Hosting Targets: ${(project.hostingTargets as string[]).join(', ')}`
        : '',
      ``,
      `Provide the brief in well-structured plain text with clear sections.`,
    ]
      .filter(Boolean)
      .join('\n');

    const brief = await aiGenerate(systemPrompt, userPrompt, { maxTokens: 2000, temperature: 0.7 });

    await prisma.lifecycleProject.update({
      where: { id: projectId },
      data: { projectBrief: brief },
    });

    return brief;
  }

  // -----------------------------------------------------------------------
  // 3. Generate Architecture Documentation
  // -----------------------------------------------------------------------

  async generateArchitectureDoc(projectId: string): Promise<string> {
    const project = await prisma.lifecycleProject.findFirst({
      where: { id: projectId, userId: this.userId },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const systemPrompt = `You are Holly AI, an expert software architect. Generate detailed architecture documentation covering system design, component breakdown, data flow, API design, technology decisions, scalability considerations, and deployment architecture. Be specific and technical.`;

    const userPrompt = [
      `Generate comprehensive architecture documentation for:`,
      ``,
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : '',
      project.stack ? `Tech Stack: ${project.stack}` : '',
      project.framework ? `Framework: ${project.framework}` : '',
      project.database ? `Database: ${project.database}` : '',
      project.hostingTargets && Array.isArray(project.hostingTargets) && (project.hostingTargets as string[]).length
        ? `Hosting Targets: ${(project.hostingTargets as string[]).join(', ')}`
        : '',
      project.projectBrief ? `\nExisting Project Brief:\n${project.projectBrief}` : '',
      ``,
      `Produce a thorough architecture document with clear sections.`,
    ]
      .filter(Boolean)
      .join('\n');

    const doc = await aiGenerate(systemPrompt, userPrompt, { maxTokens: 3000, temperature: 0.7 });

    await prisma.lifecycleProject.update({
      where: { id: projectId },
      data: { architectureDoc: doc },
    });

    return doc;
  }

  // -----------------------------------------------------------------------
  // 4. Generate Roadmap
  // -----------------------------------------------------------------------

  async generateRoadmap(projectId: string): Promise<Record<string, unknown>> {
    const project = await prisma.lifecycleProject.findFirst({
      where: { id: projectId, userId: this.userId },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const systemPrompt = `You are Holly AI, an expert project manager and architect. Generate a phased development roadmap as a JSON object. Structure it as an array of phases, each containing: phase (number), name, description, status (one of: pending, in-progress, completed), tasks (array of { title, description, priority, estimatedHours, status }), and estimatedDuration (string like "2 weeks"). Return ONLY valid JSON, no markdown fences or explanation.`;

    const userPrompt = [
      `Generate a phased development roadmap for:`,
      ``,
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : '',
      project.stack ? `Tech Stack: ${project.stack}` : '',
      project.framework ? `Framework: ${project.framework}` : '',
      project.database ? `Database: ${project.database}` : '',
      project.deadline ? `Deadline: ${project.deadline.toISOString()}` : '',
      project.projectBrief ? `\nProject Brief:\n${project.projectBrief}` : '',
      project.architectureDoc ? `\nArchitecture Doc:\n${project.architectureDoc}` : '',
      ``,
      `Return the roadmap as a JSON object with a "phases" array.`,
    ]
      .filter(Boolean)
      .join('\n');

    const raw = await aiGenerate(systemPrompt, userPrompt, { maxTokens: 3000, temperature: 0.7 });

    let roadmap: Record<string, unknown>;
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      roadmap = JSON.parse(cleaned);
    } catch {
      roadmap = {
        phases: [
          {
            phase: 1,
            name: 'Planning & Setup',
            description: 'Initial project setup and planning',
            status: 'pending',
            tasks: [
              { title: 'Initialize project', description: 'Set up the project structure', priority: 'high', estimatedHours: 4, status: 'pending' },
            ],
            estimatedDuration: '1 week',
          },
        ],
        raw,
        parseError: true,
      };
    }

    await prisma.lifecycleProject.update({
      where: { id: projectId },
      data: { roadmapJson: roadmap as any },
    });

    return roadmap;
  }

  // -----------------------------------------------------------------------
  // 5. Update Project Status
  // -----------------------------------------------------------------------

  async updateProjectStatus(
    projectId: string,
    status: ProjectStatus,
    phase?: number,
  ) {
    const project = await prisma.lifecycleProject.findFirst({
      where: { id: projectId, userId: this.userId },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const data: Record<string, unknown> = { status };

    if (phase !== undefined) {
      data.phase = phase;
    }

    // When leaving ideation for the first time, set startedAt
    if (project.status === 'ideation' && status !== 'ideation' && !project.startedAt) {
      data.startedAt = new Date();
    }

    // When project goes live, set deliveredAt
    if (status === 'live') {
      data.deliveredAt = new Date();
    }

    // When archiving, set archivedAt
    if (status === 'archived') {
      data.archivedAt = new Date();
    }

    const updated = await prisma.lifecycleProject.update({
      where: { id: projectId },
      data,
    });

    return updated;
  }

  // -----------------------------------------------------------------------
  // 6. Update Quality Scores
  // -----------------------------------------------------------------------

  async updateQualityScores(projectId: string, scores: QualityScores) {
    const project = await prisma.lifecycleProject.findFirst({
      where: { id: projectId, userId: this.userId },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const data: Record<string, unknown> = {};

    if (scores.qualityScore !== undefined) data.qualityScore = scores.qualityScore;
    if (scores.testCoverage !== undefined) data.testCoverage = scores.testCoverage;
    if (scores.performanceScore !== undefined) data.performanceScore = scores.performanceScore;
    if (scores.accessibilityScore !== undefined) data.accessibilityScore = scores.accessibilityScore;
    if (scores.securityScore !== undefined) data.securityScore = scores.securityScore;

    const updated = await prisma.lifecycleProject.update({
      where: { id: projectId },
      data,
    });

    return updated;
  }

  // -----------------------------------------------------------------------
  // 7. Get Project (full detail)
  // -----------------------------------------------------------------------

  async getProject(projectId: string) {
    const project = await prisma.lifecycleProject.findFirst({
      where: { id: projectId, userId: this.userId },
      include: {
        deployments: {
          orderBy: { createdAt: 'desc' },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        handoffs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return project;
  }

  // -----------------------------------------------------------------------
  // 8. List Projects
  // -----------------------------------------------------------------------

  async listProjects(status?: ProjectStatus, limit: number = 50) {
    const where: Record<string, unknown> = { userId: this.userId };

    if (status) {
      where.status = status;
    }

    const projects = await prisma.lifecycleProject.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return projects;
  }

  // -----------------------------------------------------------------------
  // 9. Archive Project
  // -----------------------------------------------------------------------

  async archiveProject(projectId: string) {
    return this.updateProjectStatus(projectId, 'archived');
  }

  // -----------------------------------------------------------------------
  // 10. Delete Project
  // -----------------------------------------------------------------------

  async deleteProject(projectId: string) {
    const project = await prisma.lifecycleProject.findFirst({
      where: { id: projectId, userId: this.userId },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Delete in correct order to respect foreign key constraints
    await prisma.monitoringAlert.deleteMany({ where: { projectId } });
    await prisma.clientHandoff.deleteMany({ where: { projectId } });
    await prisma.lifecycleDeployment.deleteMany({ where: { projectId } });
    await prisma.lifecycleProject.delete({ where: { id: projectId } });

    return { id: projectId, deleted: true };
  }
}

export default ProjectLifecycle;
