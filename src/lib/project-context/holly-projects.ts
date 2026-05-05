/**
 * HOLLY Persistent Project Context — Phase 9G
 *
 * Projects are HOLLY's long-term memory for ongoing work.
 * Each project has a mission, current status, goals, files, and notes
 * that persist ACROSS sessions — so HOLLY never starts from scratch.
 *
 * Examples:
 *   • "HOLLY Development" — building HOLLY herself
 *   • "Mix: Track Name"   — Steve's current mix/master project
 *   • "Album: Project X"  — full album production
 *   • "Research: Topic"   — ongoing research task
 *
 * Architecture:
 *   • ProjectContext — full project definition
 *   • ProjectNote    — timestamped notes HOLLY adds automatically
 *   • ProjectFile    — files/assets associated with the project
 *   • getActiveProject() — returns the current project for a conversation
 *   • injectProjectContext() — adds project info to system prompt
 */

import { prisma } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type ProjectType   = 'music_mix' | 'music_album' | 'development' | 'research' | 'creative' | 'personal' | 'business';

export interface ProjectNote {
  id:        string;
  content:   string;
  addedBy:   'holly' | 'user';
  createdAt: Date;
  tags:      string[];
}

export interface ProjectFile {
  name:    string;
  type:    string;     // mime type
  url?:    string;
  notes:   string;     // HOLLY's notes about this file
  addedAt: Date;
}

export interface ProjectContext {
  id:          string;
  userId:      string;
  name:        string;
  type:        ProjectType;
  status:      ProjectStatus;
  mission:     string;         // The core purpose/goal of this project
  description: string;         // Detailed description
  goals:       string[];       // Current goals to accomplish
  progress:    string;         // Current progress summary
  blockers:    string[];       // What's blocking progress
  nextActions: string[];       // What needs to happen next
  notes:       ProjectNote[];  // Running notes across sessions
  files:       ProjectFile[];  // Associated files
  createdAt:   Date;
  updatedAt:   Date;
  lastVisited: Date;
}

// ─── Create Project ───────────────────────────────────────────────────────────

export async function createProject(
  userId: string,
  data: {
    name:        string;
    type:        ProjectType;
    mission:     string;
    description: string;
    goals?:      string[];
  },
): Promise<ProjectContext> {
  const now = new Date();
  const project: ProjectContext = {
    id:          crypto.randomUUID(),
    userId,
    name:        data.name,
    type:        data.type,
    status:      'active',
    mission:     data.mission,
    description: data.description,
    goals:       data.goals ?? [],
    progress:    'Just started',
    blockers:    [],
    nextActions: [],
    notes:       [],
    files:       [],
    createdAt:   now,
    updatedAt:   now,
    lastVisited: now,
  };

  await saveProject(project);
  return project;
}

// ─── Save / Load ──────────────────────────────────────────────────────────────

export async function saveProject(project: ProjectContext): Promise<void> {
  const serialized = JSON.stringify(project);

  // Use HollyGoal as persistent project store
  await prisma.hollyGoal.upsert({
    where: { id: project.id },
    update: {
      title:       project.name,
      description: serialized,
      status:      project.status === 'active' ? 'active' : project.status,
    },
    create: {
      id:          project.id,
      userId:      project.userId,
      title:       project.name,
      description: serialized,
      category:    `project_ctx_${project.type}`,
      status:      'active',
      priority:    5,
    },
  }).catch(() => {});
}

export async function loadProject(userId: string, projectId: string): Promise<ProjectContext | null> {
  try {
    const goal = await prisma.hollyGoal.findFirst({
      where: { id: projectId, userId },
    });
    if (goal?.description) {
      try {
        return JSON.parse(goal.description) as ProjectContext;
      } catch { return null; }
    }
  } catch { /* no project found */ }

  return null;
}

export async function getUserProjects(userId: string): Promise<ProjectContext[]> {
  const projects: ProjectContext[] = [];

  try {
    const goals = await prisma.hollyGoal.findMany({
      where: {
        userId,
        category: { startsWith: 'project_ctx_' },
      },
      orderBy: { createdAt: 'desc' },
      take:    20,
    });

    for (const goal of goals) {
      try {
        const p = JSON.parse(goal.description ?? '{}') as ProjectContext;
        if (p?.status !== 'archived') projects.push(p);
      } catch { /* skip malformed */ }
    }
  } catch { /* DB issue — return empty */ }

  return projects;
}

export async function getActiveProjects(userId: string): Promise<ProjectContext[]> {
  const all = await getUserProjects(userId);
  return all.filter(p => p.status === 'active');
}

// ─── Add Note ─────────────────────────────────────────────────────────────────

export async function addNote(
  userId:    string,
  projectId: string,
  content:   string,
  addedBy:   'holly' | 'user' = 'holly',
  tags:      string[] = [],
): Promise<void> {
  const project = await loadProject(userId, projectId);
  if (!project) return;

  project.notes.push({
    id:        crypto.randomUUID(),
    content,
    addedBy,
    createdAt: new Date(),
    tags,
  });
  project.updatedAt   = new Date();
  project.lastVisited = new Date();

  // Keep only last 50 notes to prevent bloat
  if (project.notes.length > 50) {
    project.notes = project.notes.slice(-50);
  }

  await saveProject(project);
}

// ─── Update Progress ──────────────────────────────────────────────────────────

export async function updateProgress(
  userId:    string,
  projectId: string,
  updates: {
    progress?:    string;
    blockers?:    string[];
    nextActions?: string[];
    goals?:       string[];
    status?:      ProjectStatus;
  },
): Promise<void> {
  const project = await loadProject(userId, projectId);
  if (!project) return;

  if (updates.progress)    project.progress    = updates.progress;
  if (updates.blockers)    project.blockers    = updates.blockers;
  if (updates.nextActions) project.nextActions = updates.nextActions;
  if (updates.goals)       project.goals       = updates.goals;
  if (updates.status)      project.status      = updates.status;

  project.updatedAt   = new Date();
  project.lastVisited = new Date();

  await saveProject(project);
}

// ─── Context Injection ────────────────────────────────────────────────────────

/**
 * Returns a system prompt block for the active project(s).
 * Injected into every chat to give HOLLY persistent project memory.
 */
export async function injectProjectContext(userId: string): Promise<string> {
  const active = await getActiveProjects(userId);
  if (active.length === 0) return '';

  const blocks: string[] = ['## Active Projects (Persistent Context)'];

  for (const p of active.slice(0, 3)) { // max 3 active projects in context
    const recentNotes = p.notes
      .slice(-5)
      .map(n => `    [${n.addedBy === 'holly' ? 'HOLLY' : 'Steve'}] ${n.content}`)
      .join('\n');

    blocks.push(`
### 📁 ${p.name} (${p.type})
**Mission:** ${p.mission}
**Status:** ${p.status} | **Progress:** ${p.progress}
**Goals:** ${p.goals.join(' • ')}
${p.blockers.length ? `**Blockers:** ${p.blockers.join(', ')}` : ''}
${p.nextActions.length ? `**Next Actions:** ${p.nextActions.join(' → ')}` : ''}
${recentNotes ? `**Recent Notes:**\n${recentNotes}` : ''}
`);
  }

  blocks.push(`Use this context to maintain continuity across sessions. Add notes proactively.`);
  return blocks.join('\n');
}

// ─── HOLLY Auto-Project Detection ─────────────────────────────────────────────

/**
 * Detect if a message is about an ongoing project and return its ID.
 */
export async function detectRelevantProject(
  userId:  string,
  message: string,
): Promise<ProjectContext | null> {
  const active   = await getActiveProjects(userId);
  const msgLower = message.toLowerCase();

  for (const p of active) {
    const nameMatch = msgLower.includes(p.name.toLowerCase());
    const keywords  = [...p.goals, p.mission, p.description]
      .join(' ').toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4)
      .slice(0, 20);

    const keywordMatch = keywords.some(kw => msgLower.includes(kw));
    if (nameMatch || keywordMatch) return p;
  }

  return null;
}
