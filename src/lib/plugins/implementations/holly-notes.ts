/**
 * Holly Notes Plugin — Persistent note-taking
 *
 * Allows users to create, search, list, and delete notes
 * alongside their conversations with Holly. Notes are stored
 * per-user in the database and can be searched by content or tags.
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateNoteInput {
  title: string;
  content: string;
  tags?: string[];
  conversationId?: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  conversationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteSearchResult {
  notes: Note[];
  total: number;
  query: string;
}

// ============================================================================
// NOTES SERVICE
// ============================================================================

export class NotesService {
  /**
   * Create a new note for a user.
   */
  async createNote(userId: string, input: CreateNoteInput): Promise<Note> {
    return prisma.pluginNote.create({
      data: {
        userId,
        title: input.title.trim(),
        content: input.content,
        tags: input.tags || [],
        conversationId: input.conversationId || null,
        pinned: false,
      },
    }) as Promise<Note>;
  }

  /**
   * Get a single note by ID (with ownership check).
   */
  async getNote(userId: string, noteId: string): Promise<Note | null> {
    const note = await prisma.pluginNote.findFirst({
      where: { id: noteId, userId },
    });
    return note as Note | null;
  }

  /**
   * List all notes for a user, newest first.
   */
  async listNotes(
    userId: string,
    opts: { limit?: number; offset?: number; tag?: string; pinned?: boolean } = {}
  ): Promise<NoteSearchResult> {
    const { limit = 50, offset = 0, tag, pinned } = opts;

    const where: any = { userId };
    if (tag) where.tags = { has: tag };
    if (pinned !== undefined) where.pinned = pinned;

    const [notes, total] = await Promise.all([
      prisma.pluginNote.findMany({
        where,
        orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.pluginNote.count({ where }),
    ]);

    return { notes: notes as Note[], total, query: tag || 'all' };
  }

  /**
   * Search notes by content or title.
   */
  async searchNotes(userId: string, query: string, limit: number = 20): Promise<NoteSearchResult> {
    const searchQuery = query.trim().toLowerCase();
    if (!searchQuery) return { notes: [], total: 0, query: '' };

    const notes = await prisma.pluginNote.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { content: { contains: searchQuery, mode: 'insensitive' } },
          { tags: { has: searchQuery } },
        ],
      },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });

    return { notes: notes as Note[], total: notes.length, query };
  }

  /**
   * Update a note.
   */
  async updateNote(
    userId: string,
    noteId: string,
    updates: Partial<Pick<Note, 'title' | 'content' | 'tags' | 'pinned'>>
  ): Promise<Note | null> {
    // Verify ownership
    const existing = await this.getNote(userId, noteId);
    if (!existing) return null;

    return prisma.pluginNote.update({
      where: { id: noteId },
      data: {
        ...(updates.title !== undefined && { title: updates.title.trim() }),
        ...(updates.content !== undefined && { content: updates.content }),
        ...(updates.tags !== undefined && { tags: updates.tags }),
        ...(updates.pinned !== undefined && { pinned: updates.pinned }),
        updatedAt: new Date(),
      },
    }) as Promise<Note>;
  }

  /**
   * Delete a note.
   */
  async deleteNote(userId: string, noteId: string): Promise<boolean> {
    const existing = await this.getNote(userId, noteId);
    if (!existing) return false;

    await prisma.pluginNote.delete({ where: { id: noteId } });
    return true;
  }

  /**
   * Get notes summary (count by tag).
   */
  async getNotesSummary(userId: string): Promise<{
    totalNotes: number;
    pinnedCount: number;
    topTags: { tag: string; count: number }[];
  }> {
    const [totalNotes, pinnedNotes, allNotes] = await Promise.all([
      prisma.pluginNote.count({ where: { userId } }),
      prisma.pluginNote.count({ where: { userId, pinned: true } }),
      prisma.pluginNote.findMany({
        where: { userId },
        select: { tags: true },
      }),
    ]);

    // Count tag frequencies
    const tagCounts: Record<string, number> = {};
    for (const note of allNotes) {
      for (const tag of note.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return { totalNotes, pinnedCount: pinnedNotes, topTags };
  }
}

// Export singleton
export const notesService = new NotesService();
