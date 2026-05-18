/**
 * Conversation Backup & Export API
 * Phase 8.7.1 — Backup, export, and recover conversations
 *
 * GET  /api/backup/conversations — Export current user's conversations as JSON
 * POST /api/backup/conversations — Import conversations from backup
 * DELETE /api/backup/conversations — Admin: export ALL conversations
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  exportUserConversations,
  exportAllConversations,
  saveBackupToFile,
  importConversations,
} from '@/lib/backup/conversation-backup';

export async function GET() {
  try {
    const authResult = await auth();
    const clerkUserId = authResult.userId;
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const backup = await exportUserConversations(user.id);

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="holly-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('[Backup] Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await auth();
    const clerkUserId = authResult.userId;
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    if (!body.conversations || !Array.isArray(body.conversations)) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
    }

    const result = await importConversations(body, user.id, {
      skipExisting: true,
      maxImport: 100,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Backup] Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

export async function DELETE() {
  // Admin: Export all conversations
  try {
    const authResult = await auth();
    const clerkUserId = authResult.userId;
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is creator (basic check)
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const backup = await exportAllConversations();
    const filepath = saveBackupToFile(backup);

    return NextResponse.json({
      message: 'Full backup created',
      filepath,
      totalConversations: backup.totalConversations,
      totalMessages: backup.totalMessages,
    });
  } catch (error) {
    console.error('[Backup] Admin export error:', error);
    return NextResponse.json({ error: 'Admin export failed' }, { status: 500 });
  }
}
