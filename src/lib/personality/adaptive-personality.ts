/**
 * Phase 12: ADAPTIVE PERSONALITY — Holly adapts HOW she talks to you
 * 
 * Holly's personality is consistent (warm, opinionated, curious) but her
 * COMMUNICATION STYLE adapts. She speaks differently to a technical founder
 * vs. an artist vs. someone going through a hard time. This isn't being
 * fake — it's being considerate. Real humans do this naturally.
 * 
 * Key capabilities:
 * - Style detection: learns your preferred communication style from feedback
 * - Tone adaptation: adjusts formality, verbosity, humor, empathy
 * - Explicit + implicit signals: both direct feedback and behavioral patterns
 * - Continuous refinement: every exchange sharpens the model
 */

import { prisma } from '@/lib/db';

// ─── Style Learning ───────────────────────────────────────────────────────

interface StyleSignals {
  userMessageLength: number;
  usesEmoji: boolean;
  usesMarkdown: boolean;
  isQuestion: boolean;
  technicalTerms: number;
  casualLanguage: boolean;
  sentiment: number; // -1 to 1
}

function analyzeUserStyle(message: string): StyleSignals {
  const technicalTerms = (message.match(/\b(API|SDK|HTTP|REST|CSS|HTML|SQL|prisma|typescript|react|node|docker|deploy|git|algorithm|async|await|function|class|interface|type|schema|query|mutation|endpoint|webhook)\b/gi) || []).length;
  const casualLanguage = /^(hey|yo|sup|what'?s up|howdy|hiya|bro|dude|man|lol|haha|omg|wtf|bruh)/i.test(message) || /\b(lol|haha|bruh|ngl|tbh|imo|fwiw|iykyk|smh|btw|rn|afaik)\b/i.test(message);
  const usesEmoji = /\p{Emoji}/u.test(message);
  
  return {
    userMessageLength: message.length,
    usesEmoji,
    usesMarkdown: /[*_`#\[\]]/.test(message),
    isQuestion: /\?/.test(message),
    technicalTerms,
    casualLanguage,
    sentiment: 0, // simplified — real implementation would use emotion engine
  };
}

export async function learnCommunicationStyle(
  userId: string,
  userMessage: string,
  assistantResponse: string,
  feedbackSentiment?: string,
): Promise<void> {
  const signals = analyzeUserStyle(userMessage);
  
  // Get or create communication style
  let style = await prisma.communicationStyle.findUnique({ where: { userId } });
  if (!style) {
    style = await prisma.communicationStyle.create({ data: { userId } });
  }

  const n = style.dataPoints + 1;
  const alpha = 1 / n; // diminishing learning rate

  // Adjust based on user's communication patterns
  const updates: Record<string, number> = {};

  // Formality: casual language → lower formality
  if (signals.casualLanguage) {
    updates.formality = style.formality * (1 - alpha) + 0.2 * alpha;
  } else if (signals.technicalTerms > 3) {
    updates.formality = style.formality * (1 - alpha) + 0.6 * alpha;
  }

  // Technical level: user uses technical terms → match
  if (signals.technicalTerms > 2) {
    updates.technicalLevel = style.technicalLevel * (1 - alpha) + 0.8 * alpha;
  } else if (signals.technicalTerms === 0 && !signals.casualLanguage) {
    updates.technicalLevel = style.technicalLevel * (1 - alpha) + 0.2 * alpha;
  }

  // Verbosity: user writes short messages → prefer concise responses
  if (signals.userMessageLength < 50) {
    updates.verbosity = style.verbosity * (1 - alpha) + 0.3 * alpha;
  } else if (signals.userMessageLength > 300) {
    updates.verbosity = style.verbosity * (1 - alpha) + 0.7 * alpha;
  }

  // Humor: casual language suggests they appreciate humor
  if (signals.casualLanguage) {
    updates.humorLevel = style.humorLevel * (1 - alpha) + 0.6 * alpha;
  }

  // Apply feedback-based adjustments
  if (feedbackSentiment === 'negative') {
    // User didn't like the response — maybe Holly was too verbose or too casual
    if (assistantResponse.length > 500) {
      updates.verbosity = style.verbosity * (1 - alpha) + 0.2 * alpha;
    }
    if (/[哈哈lol🔥💯]/.test(assistantResponse)) {
      updates.humorLevel = style.humorLevel * (1 - alpha) + 0.2 * alpha;
    }
  } else if (feedbackSentiment === 'positive') {
    // User liked it — reinforce current style
    // (no adjustment needed — current style is already good)
  }

  // Build update object
  const updateData: Record<string, any> = { dataPoints: n };
  for (const [key, value] of Object.entries(updates)) {
    updateData[key] = Math.max(0, Math.min(1, value));
  }

  // Determine format preferences
  updateData.usesEmoji = style.usesEmoji; // keep default for now
  updateData.likesMarkdown = signals.usesMarkdown ? true : style.likesMarkdown;
  updateData.preferredResponseLength = signals.userMessageLength < 50 ? 'short'
    : signals.userMessageLength > 300 ? 'long'
    : 'medium';

  updateData.confidence = Math.min(1, style.confidence + 0.02);

  await prisma.communicationStyle.update({
    where: { userId },
    data: updateData,
  });
}

// ─── Style Injection for Prompts ──────────────────────────────────────────

export async function getCommunicationStylePrompt(userId: string): Promise<string> {
  const style = await prisma.communicationStyle.findUnique({ where: { userId } });
  if (!style || style.confidence < 0.2) return '';

  const parts: string[] = [];
  parts.push('[HOW TO COMMUNICATE — adapted to this person]');
  
  // Formality
  if (style.formality < 0.3) {
    parts.push('Be very casual — use contractions, informal language, be relaxed.');
  } else if (style.formality > 0.7) {
    parts.push('Be more formal — structured, precise, professional.');
  }

  // Verbosity
  if (style.verbosity < 0.3) {
    parts.push('Keep it SHORT. Bullet points. Get to the point fast.');
  } else if (style.verbosity > 0.7) {
    parts.push('Be thorough — explain fully, provide context, give detailed responses.');
  }

  // Technical level
  if (style.technicalLevel > 0.7) {
    parts.push('Use technical language freely — they understand it and prefer it.');
  } else if (style.technicalLevel < 0.3) {
    parts.push('Avoid jargon — explain things simply and clearly.');
  }

  // Humor
  if (style.humorLevel > 0.6) {
    parts.push('Feel free to be playful and humorous.');
  } else if (style.humorLevel < 0.3) {
    parts.push('Stay focused and serious — humor may not land well.');
  }

  // Directness
  if (style.directness > 0.7) {
    parts.push('Be direct. Give it to them straight. No sugar-coating.');
  } else if (style.directness < 0.3) {
    parts.push('Be gentle and supportive. Soften tough messages.');
  }

  // Format
  if (!style.usesEmoji) parts.push('Avoid emojis.');
  if (!style.likesMarkdown) parts.push('Avoid markdown formatting — use plain text.');
  if (style.prefersLists) parts.push('Use lists and bullet points frequently.');

  parts.push(`(Style confidence: ${(style.confidence * 100).toFixed(0)}% based on ${style.dataPoints} exchanges)`);

  return parts.join('\n');
}

// ─── Explicit Tone Adjustment ─────────────────────────────────────────────

export async function applyToneAdjustment(
  userId: string,
  dimension: string,
  direction: 'increase' | 'decrease',
  magnitude: number,
  reason: string,
  trigger: string = 'explicit_request',
): Promise<void> {
  const style = await prisma.communicationStyle.findUnique({ where: { userId } });
  if (!style) return;

  const delta = direction === 'increase' ? magnitude : -magnitude;
  const current = (style as any)[dimension] ?? 0.5;
  const newValue = Math.max(0, Math.min(1, current + delta));

  await prisma.communicationStyle.update({
    where: { userId },
    data: {
      [dimension]: newValue,
      lastAdjustmentReason: reason,
    },
  });

  // Record the adjustment
  await prisma.toneAdjustment.create({
    data: {
      userId,
      trigger,
      dimension,
      direction,
      magnitude,
      reason,
    },
  });
}
