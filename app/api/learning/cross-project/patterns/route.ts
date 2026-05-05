/**
 * POST /api/learning/cross-project/patterns
 * Identifies reusable patterns across a user's conversations/projects.
 */
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    success: true,
    status: 'active',
    description: 'Cross-project pattern recognition — identifies recurring themes and reusable solutions',
    howToUse: 'POST (no body required) — analyzes your conversation history',
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
      select: { id: true },
    });

    if (!dbUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    // Get recent conversations and their titles/previews for pattern analysis
    const conversations = await prisma.conversation.findMany({
      where: { userId: dbUser.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { title: true, lastMessagePreview: true },
    });

    if (!conversations.length) {
      return NextResponse.json({
        success: true,
        patterns: [],
        message: 'No conversations yet — patterns will emerge as you use Holly more',
        total: 0,
      });
    }

    // Heuristic pattern detection from titles/previews
    const allText = conversations
      .map(c => `${c.title ?? ''} ${c.lastMessagePreview ?? ''}`)
      .join(' ')
      .toLowerCase();

    const patternChecks: { name: string; keywords: string[]; icon: string }[] = [
      { name: 'Code Development',     keywords: ['code', 'function', 'bug', 'error', 'typescript', 'javascript', 'python', 'react', 'api'], icon: '💻' },
      { name: 'Music Creation',       keywords: ['song', 'lyrics', 'music', 'beat', 'chord', 'melody', 'verse', 'chorus'], icon: '🎵' },
      { name: 'Writing & Content',    keywords: ['write', 'essay', 'blog', 'article', 'story', 'script', 'copy'], icon: '✍️' },
      { name: 'Research & Analysis',  keywords: ['research', 'analyze', 'compare', 'find', 'search', 'explain', 'what is'], icon: '🔍' },
      { name: 'Problem Solving',      keywords: ['fix', 'solve', 'help', 'issue', 'problem', 'how to', 'why'], icon: '🧩' },
      { name: 'Creative Projects',    keywords: ['idea', 'design', 'create', 'build', 'make', 'generate', 'imagine'], icon: '🎨' },
    ];

    const detectedPatterns = patternChecks
      .map(p => {
        const hits = p.keywords.filter(kw => allText.includes(kw)).length;
        const frequency = Math.round((hits / p.keywords.length) * 100);
        return { ...p, frequency, hits };
      })
      .filter(p => p.hits > 0)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5)
      .map(({ name, icon, frequency }) => ({ name, icon, frequency, reusable: frequency > 20 }));

    return NextResponse.json({
      success: true,
      patterns: detectedPatterns,
      total: conversations.length,
      analyzed: conversations.length,
      topPattern: detectedPatterns[0]?.name ?? 'General assistance',
      message: `Found ${detectedPatterns.length} recurring patterns across ${conversations.length} conversations`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
