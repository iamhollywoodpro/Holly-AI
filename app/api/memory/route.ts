import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get('search') ?? '';
    const type = url.searchParams.get('type') ?? 'all';
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30', 10), 100);
    const cursor = url.searchParams.get('cursor') ?? null;

    const memories: any[] = [];
    const fetchLimit = cursor ? limit + 1 : limit;

    const searchFilter = search
      ? { contains: search, mode: 'insensitive' as const }
      : undefined;

    if (type === 'all' || type === 'conversations') {
      try {
        const convWhere: any = { userId: user.id };
        if (search) {
          convWhere.OR = [
            { title: searchFilter },
            { lastMessagePreview: searchFilter },
          ];
        }

        const conversations = await prisma.conversation.findMany({
          where: convWhere,
          orderBy: { updatedAt: 'desc' },
          take: fetchLimit,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          select: {
            id: true,
            title: true,
            messageCount: true,
            lastMessagePreview: true,
            createdAt: true,
            updatedAt: true,
            summary: {
              select: {
                id: true,
                summary: true,
                keyTopics: true,
                keyPoints: true,
                actionItems: true,
                outcome: true,
                generatedAt: true,
              },
            },
          },
        });

        for (const conv of conversations) {
          memories.push({
            id: `conv_${conv.id}`,
            rawId: conv.id,
            type: 'conversation',
            content: conv.summary?.summary || conv.lastMessagePreview || conv.title || 'No content',
            topics: conv.summary?.keyTopics || [],
            keyPoints: conv.summary?.keyPoints || [],
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            relevanceScore: null,
          });
        }
      } catch (err) {
        console.error('[Memory API] conversations query error:', err);
      }
    }

    if (type === 'all' || type === 'emotional') {
      try {
        const emotionWhere: any = { userId: user.id };
        if (search) {
          emotionWhere.OR = [
            { emotion: searchFilter },
            { trigger: searchFilter },
            { notes: searchFilter },
          ];
        }

        const emotions = await prisma.emotionLog.findMany({
          where: emotionWhere,
          orderBy: { timestamp: 'desc' },
          take: type === 'all' ? 20 : fetchLimit,
          ...(cursor && type !== 'all' ? { skip: 1, cursor: { id: cursor } } : {}),
          select: {
            id: true,
            emotion: true,
            intensity: true,
            trigger: true,
            notes: true,
            timestamp: true,
          },
        });

        for (const em of emotions) {
          memories.push({
            id: `emotion_${em.id}`,
            rawId: em.id,
            type: 'emotional',
            content: em.notes || `${em.emotion} (intensity: ${em.intensity.toFixed(1)})${em.trigger ? ` — triggered by: ${em.trigger}` : ''}`,
            emotionType: em.emotion,
            intensity: em.intensity,
            createdAt: em.timestamp,
            updatedAt: em.timestamp,
            relevanceScore: em.intensity,
          });
        }
      } catch (err) {
        console.error('[Memory API] emotionLogs query error:', err);
      }

      try {
        const emotionalStates = await prisma.emotionalState.findMany({
          where: { userId: user.id, ...(search ? { primaryEmotion: searchFilter } : {}) },
          orderBy: { timestamp: 'desc' },
          take: 15,
          select: {
            id: true,
            primaryEmotion: true,
            intensity: true,
            valence: true,
            arousal: true,
            secondaryEmotions: true,
            triggers: true,
            cues: true,
            timestamp: true,
          },
        });

        for (const es of emotionalStates) {
          memories.push({
            id: `estate_${es.id}`,
            rawId: es.id,
            type: 'emotional',
            content: `${es.primaryEmotion} — valence: ${es.valence.toFixed(2)}, arousal: ${es.arousal.toFixed(2)}${es.triggers?.length ? ` | Triggers: ${es.triggers.join(', ')}` : ''}`,
            emotionType: es.primaryEmotion,
            intensity: es.intensity,
            valence: es.valence,
            createdAt: es.timestamp,
            updatedAt: es.timestamp,
            relevanceScore: es.intensity,
          });
        }
      } catch (err) {
        console.error('[Memory API] emotionalStates query error:', err);
      }
    }

    if (type === 'all' || type === 'preferences') {
      try {
        const prefWhere: any = { userId: user.id };
        if (search) {
          prefWhere.OR = [
            { category: searchFilter },
            { preferenceKey: searchFilter },
          ];
        }

        const preferences = await prisma.userPreference.findMany({
          where: prefWhere,
          orderBy: { lastObserved: 'desc' },
          take: fetchLimit,
          ...(cursor && type === 'preferences' ? { skip: 1, cursor: { id: cursor } } : {}),
          select: {
            id: true,
            category: true,
            preferenceKey: true,
            value: true,
            confidence: true,
            source: true,
            timesObserved: true,
            lastObserved: true,
            createdAt: true,
          },
        });

        for (const pref of preferences) {
          memories.push({
            id: `pref_${pref.id}`,
            rawId: pref.id,
            type: 'preference',
            content: `${pref.category} / ${pref.preferenceKey}: ${JSON.stringify(pref.value)}`,
            category: pref.category,
            confidence: pref.confidence,
            source: pref.source,
            timesObserved: pref.timesObserved,
            createdAt: pref.createdAt,
            updatedAt: pref.lastObserved,
            relevanceScore: pref.confidence,
          });
        }
      } catch (err) {
        console.error('[Memory API] userPreferences query error:', err);
      }

      try {
        const tasteSignals = await prisma.tasteSignal.findMany({
          where: {
            userId: user.id,
            ...(search ? { OR: [{ item: searchFilter }, { category: searchFilter }, { context: searchFilter }] } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            category: true,
            item: true,
            signal: true,
            context: true,
            weight: true,
            source: true,
            createdAt: true,
          },
        });

        for (const ts of tasteSignals) {
          memories.push({
            id: `taste_${ts.id}`,
            rawId: ts.id,
            type: 'preference',
            content: `${ts.category}${ts.item ? ` / ${ts.item}` : ''}: ${ts.signal} — ${ts.context}`,
            category: ts.category,
            signal: ts.signal,
            source: ts.source,
            createdAt: ts.createdAt,
            updatedAt: ts.createdAt,
            relevanceScore: ts.weight,
          });
        }
      } catch (err) {
        console.error('[Memory API] tasteSignals query error:', err);
      }
    }

    if (type === 'all' || type === 'semantic') {
      try {
        const experiences = await prisma.hollyExperience.findMany({
          where: {
            userId: user.id,
            ...(search
              ? {
                  OR: [
                    { primaryEmotion: searchFilter },
                    { relatedConcepts: { has: search } },
                  ],
                }
              : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: type === 'all' ? 20 : fetchLimit,
          select: {
            id: true,
            type: true,
            significance: true,
            primaryEmotion: true,
            secondaryEmotions: true,
            relatedConcepts: true,
            lessons: true,
            skillsGained: true,
            content: true,
            createdAt: true,
          },
        });

        for (const exp of experiences) {
          const lessonsText = exp.lessons?.length ? ` | Lessons: ${exp.lessons.join(', ')}` : '';
          memories.push({
            id: `exp_${exp.id}`,
            rawId: exp.id,
            type: 'semantic',
            content: `${exp.type} — significance: ${exp.significance.toFixed(2)}${exp.primaryEmotion ? ` | Emotion: ${exp.primaryEmotion}` : ''}${lessonsText}`,
            experienceType: exp.type,
            significance: exp.significance,
            relatedConcepts: exp.relatedConcepts,
            lessons: exp.lessons,
            createdAt: exp.createdAt,
            updatedAt: exp.createdAt,
            relevanceScore: exp.significance,
          });
        }
      } catch (err) {
        console.error('[Memory API] hollyExperiences query error:', err);
      }

      try {
        const patterns = await prisma.conversationPattern.findMany({
          where: {
            userId: user.id,
            ...(search ? { pattern: searchFilter } : {}),
          },
          orderBy: { frequency: 'desc' },
          take: 15,
          select: {
            id: true,
            patternType: true,
            pattern: true,
            frequency: true,
            effectiveness: true,
            examples: true,
            lastSeen: true,
            firstSeen: true,
          },
        });

        for (const p of patterns) {
          memories.push({
            id: `pattern_${p.id}`,
            rawId: p.id,
            type: 'semantic',
            content: `${p.patternType}: ${p.pattern}`,
            patternType: p.patternType,
            frequency: p.frequency,
            effectiveness: p.effectiveness,
            createdAt: p.firstSeen,
            updatedAt: p.lastSeen,
            relevanceScore: p.effectiveness,
          });
        }
      } catch (err) {
        console.error('[Memory API] conversationPatterns query error:', err);
      }

      try {
        const goals = await prisma.hollyGoal.findMany({
          where: {
            userId: user.id,
            ...(search
              ? {
                  OR: [
                    { title: searchFilter },
                    { description: searchFilter },
                  ],
                }
              : {}),
          },
          orderBy: [{ status: 'asc' }, { priority: 'desc' }],
          take: 15,
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            status: true,
            priority: true,
            targetDate: true,
            createdAt: true,
            completedAt: true,
          },
        });

        for (const g of goals) {
          memories.push({
            id: `goal_${g.id}`,
            rawId: g.id,
            type: 'semantic',
            content: `${g.title}${g.description ? ` — ${g.description}` : ''} [${g.status}]`,
            goalStatus: g.status,
            priority: g.priority,
            category: g.category,
            createdAt: g.createdAt,
            updatedAt: g.completedAt || g.createdAt,
            relevanceScore: g.priority / 10,
          });
        }
      } catch (err) {
        console.error('[Memory API] hollyGoals query error:', err);
      }
    }

    memories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const hasMore = cursor ? memories.length > limit : memories.length >= limit;
    const slicedMemories = hasMore ? memories.slice(0, limit) : memories;
    const nextCursor = slicedMemories.length > 0 ? slicedMemories[slicedMemories.length - 1].id : null;

    const typeBreakdown = {
      conversation: memories.filter((m) => m.type === 'conversation').length,
      semantic: memories.filter((m) => m.type === 'semantic').length,
      emotional: memories.filter((m) => m.type === 'emotional').length,
      preference: memories.filter((m) => m.type === 'preference').length,
    };

    const latestMemory = memories[0];

    return NextResponse.json({
      memories: slicedMemories,
      hasMore,
      total: memories.length,
      nextCursor,
      typeBreakdown,
      lastUpdated: latestMemory?.updatedAt ?? null,
    });
  } catch (error: any) {
    console.error('[Memory API] Error:', error);
    return NextResponse.json({
      memories: [], totalMemories: 0, categories: [], typeBreakdown: {}, lastUpdated: null,
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Memory ID required' }, { status: 400 });
    }

    if (id.startsWith('conv_')) {
      const rawId = id.replace('conv_', '');
      await prisma.conversation.delete({ where: { id: rawId, userId: user.id } });
    } else if (id.startsWith('emotion_')) {
      const rawId = id.replace('emotion_', '');
      await prisma.emotionLog.delete({ where: { id: rawId, userId: user.id } });
    } else if (id.startsWith('estate_')) {
      const rawId = id.replace('estate_', '');
      await prisma.emotionalState.delete({ where: { id: rawId, userId: user.id } });
    } else if (id.startsWith('pref_')) {
      const rawId = id.replace('pref_', '');
      await prisma.userPreference.delete({ where: { id: rawId, userId: user.id } });
    } else if (id.startsWith('taste_')) {
      const rawId = id.replace('taste_', '');
      await prisma.tasteSignal.delete({ where: { id: rawId, userId: user.id } });
    } else if (id.startsWith('exp_')) {
      const rawId = id.replace('exp_', '');
      await prisma.hollyExperience.delete({ where: { id: rawId, userId: user.id } });
    } else if (id.startsWith('pattern_')) {
      const rawId = id.replace('pattern_', '');
      await prisma.conversationPattern.delete({ where: { id: rawId, userId: user.id } });
    } else if (id.startsWith('goal_')) {
      const rawId = id.replace('goal_', '');
      await prisma.hollyGoal.delete({ where: { id: rawId, userId: user.id } });
    } else {
      return NextResponse.json({ error: 'Unknown memory type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Memory API DELETE] Error:', error);
    return NextResponse.json({ success: false });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { id, content } = body;

    if (!id || !content) {
      return NextResponse.json({ error: 'Memory ID and content required' }, { status: 400 });
    }

    if (id.startsWith('conv_')) {
      const rawId = id.replace('conv_', '');
      await prisma.conversation.update({
        where: { id: rawId, userId: user.id },
        data: { lastMessagePreview: content.slice(0, 200) },
      });
    } else if (id.startsWith('emotion_')) {
      const rawId = id.replace('emotion_', '');
      await prisma.emotionLog.update({
        where: { id: rawId, userId: user.id },
        data: { notes: content },
      });
    } else if (id.startsWith('estate_')) {
      return NextResponse.json({ error: 'Emotional states cannot be edited' }, { status: 400 });
    } else if (id.startsWith('pref_')) {
      const rawId = id.replace('pref_', '');
      await prisma.userPreference.update({
        where: { id: rawId, userId: user.id },
        data: { value: content },
      });
    } else if (id.startsWith('taste_')) {
      const rawId = id.replace('taste_', '');
      await prisma.tasteSignal.update({
        where: { id: rawId, userId: user.id },
        data: { context: content },
      });
    } else if (id.startsWith('exp_')) {
      return NextResponse.json({ error: 'Experiences cannot be edited directly' }, { status: 400 });
    } else if (id.startsWith('pattern_')) {
      const rawId = id.replace('pattern_', '');
      await prisma.conversationPattern.update({
        where: { id: rawId, userId: user.id },
        data: { pattern: content },
      });
    } else if (id.startsWith('goal_')) {
      const rawId = id.replace('goal_', '');
      await prisma.hollyGoal.update({
        where: { id: rawId, userId: user.id },
        data: { description: content },
      });
    } else {
      return NextResponse.json({ error: 'Unknown memory type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Memory API PATCH] Error:', error);
    return NextResponse.json({ success: false });
  }
}
