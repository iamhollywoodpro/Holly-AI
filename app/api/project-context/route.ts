/**
 * /api/project-context — Phase 9G: Persistent Project Context
 *
 * GET  /api/project-context                 → list all projects for user
 * POST /api/project-context { action }      → create, update, add-note, get, delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  createProject,
  loadProject,
  getUserProjects,
  addNote,
  updateProgress,
  type ProjectType,
  type ProjectStatus,
} from '@/lib/project-context/holly-projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projects = await getUserProjects(userId);
  return NextResponse.json({ ok: true, projects });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body   = await req.json();
  const action = body.action as string;

  try {
    switch (action) {

      case 'create': {
        const { name, type, mission, description, goals } = body;
        if (!name || !type || !mission) {
          return NextResponse.json({ error: 'name, type, mission required' }, { status: 400 });
        }
        const VALID: ProjectType[] = ['music_mix', 'music_album', 'development', 'research', 'creative', 'personal', 'business'];
        if (!VALID.includes(type)) {
          return NextResponse.json({ error: `type must be one of: ${VALID.join(', ')}` }, { status: 400 });
        }
        const project = await createProject(userId, { name, type, mission, description: description ?? mission, goals });
        return NextResponse.json({ ok: true, project, message: `Project "${name}" created` });
      }

      case 'get': {
        const project = await loadProject(userId, body.projectId);
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        return NextResponse.json({ ok: true, project });
      }

      case 'add-note': {
        const { projectId, content, addedBy, tags } = body;
        if (!projectId || !content) {
          return NextResponse.json({ error: 'projectId and content required' }, { status: 400 });
        }
        await addNote(userId, projectId, content, addedBy ?? 'user', tags ?? []);
        return NextResponse.json({ ok: true, message: 'Note added' });
      }

      case 'update': {
        const { projectId, progress, blockers, nextActions, goals, status } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'projectId required' }, { status: 400 });
        }
        const VALID_STATUS: ProjectStatus[] = ['active', 'paused', 'completed', 'archived'];
        if (status && !VALID_STATUS.includes(status)) {
          return NextResponse.json({ error: `status must be: ${VALID_STATUS.join(', ')}` }, { status: 400 });
        }
        await updateProgress(userId, projectId, { progress, blockers, nextActions, goals, status });
        return NextResponse.json({ ok: true, message: 'Project updated' });
      }

      default:
        return NextResponse.json({
          error:        `Unknown action: ${action}`,
          validActions: ['create', 'get', 'add-note', 'update'],
        }, { status: 400 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
