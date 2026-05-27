/**
 * Holly Notes Plugin API Routes
 *
 * GET  /api/plugins/holly-notes          — List notes (supports ?search=&tag=&pinned=)
 * POST /api/plugins/holly-notes          — Create a note
 * GET  /api/plugins/holly-notes/[id]     — Get a note
 * PATCH /api/plugins/holly-notes/[id]    — Update a note
 * DELETE /api/plugins/holly-notes/[id]   — Delete a note
 * GET  /api/plugins/holly-notes/summary  — Get notes summary
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { notesService } from '@/lib/plugins/implementations/holly-notes';

async function getAuthUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;
  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  return user;
}

// GET — List or search notes
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');
    const pinned = searchParams.get('pinned');
    const summary = searchParams.get('summary');

    // Summary mode
    if (summary === 'true') {
      const data = await notesService.getNotesSummary(user.id);
      return NextResponse.json(data);
    }

    // Search mode
    if (search) {
      const results = await notesService.searchNotes(user.id, search);
      return NextResponse.json(results);
    }

    // List mode
    const results = await notesService.listNotes(user.id, {
      tag: tag || undefined,
      pinned: pinned !== null ? pinned === 'true' : undefined,
    });
    return NextResponse.json(results);
  } catch (error) {
    console.error('[HollyNotes] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — Create a note
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title, content, tags, conversationId } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'title and content required' }, { status: 400 });
    }

    const note = await notesService.createNote(user.id, {
      title,
      content,
      tags,
      conversationId,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('[HollyNotes] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — Update a note
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { noteId, title, content, tags, pinned } = await req.json();
    if (!noteId) {
      return NextResponse.json({ error: 'noteId required' }, { status: 400 });
    }

    const updated = await notesService.updateNote(user.id, noteId, {
      title, content, tags, pinned,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[HollyNotes] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — Delete a note
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { noteId } = await req.json();
    if (!noteId) {
      return NextResponse.json({ error: 'noteId required' }, { status: 400 });
    }

    const deleted = await notesService.deleteNote(user.id, noteId);
    if (!deleted) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[HollyNotes] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
