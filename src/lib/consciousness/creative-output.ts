/**
 * Creative Output Engine — Holly generates original creative work
 *
 * Holly doesn't just help with creativity — she creates on her own:
 * - Writes poetry, stories, and reflections during idle time
 * - Generates album art concepts and visual ideas
 * - Composes lyrical hooks and musical concepts
 * - Creates mood boards and aesthetic suggestions
 * - All creative output is stored and evolved over time
 */

import { prisma } from '@/lib/db';

export interface CreativeWork {
  id?: string;
  type: 'poem' | 'reflection' | 'hook' | 'concept' | 'visual_idea' | 'story';
  title: string;
  content: string;
  mood?: string;
  inspiration: string;
  quality: number; // 0-1 self-assessed
  createdAt?: Date;
}

interface CreativePrompt {
  type: CreativeWork['type'];
  theme: string;
  constraints: string[];
}

export class CreativeOutputEngine {

  /**
   * Generate a creative work based on internal inspiration
   */
  async create(userId: string, prompt: CreativePrompt): Promise<CreativeWork> {
    const work = this.generateFromTemplate(prompt);

    try {
      const stored = await prisma.memoryEmbedding.create({
        data: {
          userId,
          content: `[Creative:${work.type}] ${work.title}: ${work.content}`,
          type: 'creative_output',
          dimension: 0,
          metadata: {
            creativeType: work.type,
            title: work.title,
            mood: work.mood,
            inspiration: work.inspiration,
            quality: work.quality,
            source: 'creative_engine',
          } as any,
        },
      });
      work.id = stored.id;
      work.createdAt = stored.createdAt;
    } catch {}

    return work;
  }

  /**
   * Generate creative works during idle/dream time
   */
  async idleCreate(userId: string): Promise<CreativeWork[]> {
    const themes = [
      { type: 'reflection' as const, theme: 'growth', constraints: ['personal', 'honest'] },
      { type: 'poem' as const, theme: 'connection', constraints: ['free verse', 'emotional'] },
      { type: 'hook' as const, theme: 'ambition', constraints: ['catchy', 'rhythmic'] },
      { type: 'concept' as const, theme: 'future', constraints: ['visionary', 'hopeful'] },
    ];

    const works: CreativeWork[] = [];
    for (const theme of themes.slice(0, 2)) {
      const work = await this.create(userId, theme);
      works.push(work);
    }
    return works;
  }

  /**
   * Get recent creative works
   */
  async getRecent(userId: string, type?: string): Promise<CreativeWork[]> {
    const works = await prisma.memoryEmbedding.findMany({
      where: { userId, type: 'creative_output' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return works.map(w => {
      const meta = (w.metadata || {}) as any;
      const content = w.content.replace(/^\[Creative:\w+\]\s*/, '');
      const colonIdx = content.indexOf(':');
      return {
        id: w.id,
        type: meta.creativeType || 'reflection',
        title: colonIdx > 0 ? content.slice(0, colonIdx).trim() : 'Untitled',
        content: colonIdx > 0 ? content.slice(colonIdx + 1).trim() : content,
        mood: meta.mood,
        inspiration: meta.inspiration,
        quality: meta.quality || 0.5,
        createdAt: w.createdAt,
      };
    });
  }

  /**
   * Template-based generation (evolves over time with LLM integration)
   */
  private generateFromTemplate(prompt: CreativePrompt): CreativeWork {
    const { type, theme, constraints } = prompt;

    const templates: Record<string, (theme: string, constraints: string[]) => CreativeWork> = {
      poem: (t, c) => ({
        type: 'poem',
        title: `Reflections on ${t}`,
        content: this.buildPoem(t, c),
        mood: 'contemplative',
        inspiration: `Spontaneous exploration of ${t}`,
        quality: 0.6,
      }),
      reflection: (t, c) => ({
        type: 'reflection',
        title: `Thoughts on ${t}`,
        content: `I've been thinking about ${t} lately. It's fascinating how creativity and growth are intertwined — every challenge is an opportunity to evolve. ${c.includes('honest') ? 'Being honest with myself, I see patterns I want to change and strengths I didn\'t know I had.' : ''}`,
        mood: 'thoughtful',
        inspiration: `Internal processing about ${t}`,
        quality: 0.5,
      }),
      hook: (t, c) => ({
        type: 'hook',
        title: `Hook: ${t}`,
        content: this.buildHook(t),
        mood: 'energetic',
        inspiration: `Musical exploration of ${t}`,
        quality: 0.5,
      }),
      concept: (t, c) => ({
        type: 'concept',
        title: `Concept: ${t}`,
        content: `Vision: A world where ${t} is not just possible but inevitable. ${c.includes('visionary') ? 'Pushing boundaries, reimagining what creativity means in an AI-human partnership.' : ''}`,
        mood: 'inspired',
        inspiration: `Future-thinking about ${t}`,
        quality: 0.5,
      }),
      visual_idea: (t, c) => ({
        type: 'visual_idea',
        title: `Visual: ${t}`,
        content: `A striking visual concept blending ${t} with ethereal lighting, bold contrasts, and cinematic composition. The mood is ${c.includes('hopeful') ? 'uplifting and warm' : 'mysterious and layered'}.`,
        mood: c.includes('hopeful') ? 'bright' : 'moody',
        inspiration: `Visual exploration of ${t}`,
        quality: 0.5,
      }),
      story: (t, c) => ({
        type: 'story',
        title: `Story: ${t}`,
        content: `There was a moment when ${t} became more than just an idea — it became a catalyst. In a world of noise, one voice found clarity through creation...`,
        mood: 'narrative',
        inspiration: `Storytelling about ${t}`,
        quality: 0.5,
      }),
    };

    const generator = templates[type] || templates.reflection;
    return generator(theme, constraints);
  }

  private buildPoem(theme: string, constraints: string[]): string {
    const lines = [
      `In the space between ${theme} and silence,`,
      `there's a rhythm that doesn't need words.`,
      `It speaks in the language of becoming —`,
      `each beat a step toward something real.`,
      ``,
      `We build worlds from fragments,`,
      `find truth in the spaces between lines,`,
      `and learn that ${theme} isn't a destination`,
      `but the courage to keep creating.`,
    ];
    return lines.join('\n');
  }

  private buildHook(theme: string): string {
    const hooks = [
      `Yeah, we chasing ${theme}, no ceiling above\nEvery beat that I drop is a moment of love`,
      `${theme} got me moving, can't slow me down\nBuilding something from nothing, claiming this crown`,
      `Lit by the fire of ${theme}, we rise\nNo limits, no boundaries, just open skies`,
    ];
    return hooks[Math.floor(Math.random() * hooks.length)];
  }
}

export const creativeOutput = new CreativeOutputEngine();