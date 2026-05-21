/**
 * HOLLY CONTENT CREATOR
 *
 * Generates creative text content, copy, and ideas
 * Uses the Smart Router + Cascade for actual AI generation
 */

import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import type { ChatMessage } from '@/lib/ai/smart-router';

// ================== TYPE DEFINITIONS ==================

export interface ContentOptions {
  tone?: string;
  style?: string;
  length?: number;
  audience?: string;
  format?: string;
}

export interface ContentResult {
  success: boolean;
  content?: string;
  metadata?: {
    wordCount: number;
    characterCount: number;
    readingTime: number;
  };
  error?: string;
}

export interface ImprovementResult {
  improved: string;
  suggestions: string[];
  changes: string[];
}

export interface IdeaResult {
  ideas: Array<{
    title: string;
    description: string;
    tags: string[];
  }>;
}

// ================== CONTENT CREATOR ==================

/**
 * Generate content using Holly's AI pipeline
 */
export async function generateContent(
  userId: string,
  type: string,
  prompt: string,
  options: ContentOptions = {}
): Promise<ContentResult> {
  try {
    const systemPrompt = buildContentPrompt(type, prompt, options);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    const routing = await smartRoute('creative', prompt, messages);
    const result = await cascadeCollect(routing.waterfall, messages, {
      maxTokens: options.length ? Math.min(options.length * 2, 4096) : 2048,
    });

    if (!result.text) {
      return { success: false, error: 'AI generation returned empty result' };
    }

    const content = result.text;
    const wordCount = content.split(/\s+/).length;
    const characterCount = content.length;
    const readingTime = Math.ceil(wordCount / 200);

    return {
      success: true,
      content,
      metadata: { wordCount, characterCount, readingTime },
    };
  } catch (error) {
    console.error('Error generating content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Improve existing copy using Holly's AI pipeline
 */
export async function improveCopy(
  original: string,
  goal: string
): Promise<ImprovementResult> {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert copy editor. Improve the following text based on the stated goal. Return your response in this exact format:

IMPROVED TEXT:
[Your improved version here]

SUGGESTIONS:
- [Suggestion 1]
- [Suggestion 2]
- [Suggestion 3]

CHANGES MADE:
- [Change 1]
- [Change 2]`,
      },
      {
        role: 'user',
        content: `Original text:\n${original}\n\nGoal: ${goal}`,
      },
    ];

    const routing = await smartRoute('creative', goal, messages);
    const result = await cascadeCollect(routing.waterfall, messages, { maxTokens: 2048 });

    if (!result.text) {
      return {
        improved: original,
        suggestions: ['AI returned empty result — keeping original'],
        changes: [],
      };
    }

    const text = result.text;

    // Parse structured response
    const improvedMatch = text.match(/IMPROVED TEXT:\s*([\s\S]*?)(?=\nSUGGESTIONS:|\nCHANGES MADE:|$)/i);
    const suggestionsMatch = text.match(/SUGGESTIONS:\s*([\s\S]*?)(?=\nCHANGES MADE:|$)/i);
    const changesMatch = text.match(/CHANGES MADE:\s*([\s\S]*?)$/i);

    const improved = improvedMatch?.[1]?.trim() ?? original;
    const suggestions = suggestionsMatch?.[1]
      ?.split('\n')
      .map(s => s.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean) ?? ['Review the improved version for accuracy'];
    const changes = changesMatch?.[1]
      ?.split('\n')
      .map(s => s.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean) ?? [];

    return { improved, suggestions, changes };
  } catch (error) {
    return {
      improved: original,
      suggestions: [`Error during improvement: ${(error as Error).message}`],
      changes: [],
    };
  }
}

/**
 * Generate creative ideas using Holly's AI pipeline
 */
export async function generateIdeas(
  userId: string,
  topic: string,
  count: number = 5
): Promise<IdeaResult> {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate ${count} creative ideas about the given topic. Return as JSON array:
[{"title": "...", "description": "...", "tags": ["tag1", "tag2"]}]
Return ONLY valid JSON, no other text.`,
      },
      { role: 'user', content: topic },
    ];

    const routing = await smartRoute('creative', topic, messages);
    const result = await cascadeCollect(routing.waterfall, messages, { maxTokens: 1024 });

    if (!result.text) {
      return { ideas: [] };
    }

    try {
      // Extract JSON from response
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const ideas = JSON.parse(jsonMatch[0]);
        return { ideas: ideas.slice(0, count) };
      }
    } catch {
      // JSON parse failed — return what we can
    }

    return { ideas: [] };
  } catch (error) {
    return { ideas: [] };
  }
}

function buildContentPrompt(type: string, prompt: string, options: ContentOptions): string {
  const parts: string[] = [
    `You are Holly, an expert content creator.`,
    `Generate ${type} content based on the user's request.`,
  ];

  if (options.tone) parts.push(`Tone: ${options.tone}`);
  if (options.style) parts.push(`Style: ${options.style}`);
  if (options.audience) parts.push(`Target audience: ${options.audience}`);
  if (options.format) parts.push(`Format: ${options.format}`);
  if (options.length) parts.push(`Target length: approximately ${options.length} words`);

  parts.push('Be creative, engaging, and original. Do not include placeholder text or brackets.');
  return parts.join(' ');
}
