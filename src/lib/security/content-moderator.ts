/**
 * CONTENT MODERATOR
 * Content moderation, safety filters, toxicity detection
 */

import { logAction } from './audit-logger';

export interface ModerationResult {
  safe: boolean;
  score: number; // 0-1, higher = more toxic
  categories: string[];
  filtered?: string;
  flagged: boolean;
}

export interface SafetyResult {
  safe: boolean;
  categories: string[];
  confidence: number;
}

export interface ModerationItem {
  id: string;
  contentId: string;
  contentType: string;
  content: string;
  reportedBy: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reportedAt: Date;
}

// Toxicity keywords (simplified - production would use AI moderation API)
const TOXIC_KEYWORDS = [
  'spam',
  'scam',
  'phishing',
  'malware',
  'hate',
  'violence',
  'explicit',
];

/**
 * Moderate text content
 */
export async function moderateContent(
  content: string,
  type: string
): Promise<ModerationResult> {
  try {
    // In production, this would call an AI moderation API
    // For now, use simple keyword matching

    const lowerContent = content.toLowerCase();
    const flaggedCategories: string[] = [];
    let toxicityScore = 0;

    // Check for toxic keywords
    TOXIC_KEYWORDS.forEach((keyword) => {
      if (lowerContent.includes(keyword)) {
        flaggedCategories.push(keyword);
        toxicityScore += 0.2;
      }
    });

    // Check for excessive caps (shouting)
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.7 && content.length > 20) {
      flaggedCategories.push('excessive_caps');
      toxicityScore += 0.1;
    }

    // Check for repeated characters (spam)
    if (/(.)\1{4,}/.test(content)) {
      flaggedCategories.push('spam_pattern');
      toxicityScore += 0.15;
    }

    toxicityScore = Math.min(toxicityScore, 1);
    const safe = toxicityScore < 0.5;
    const flagged = toxicityScore > 0.3;

    // Log moderation check
    await logAction({
      action: 'moderation:check',
      details: {
        type,
        safe,
        score: toxicityScore,
        categories: flaggedCategories,
      },
    });

    return {
      safe,
      score: toxicityScore,
      categories: flaggedCategories,
      flagged,
    };
  } catch (error) {
    console.error('Error moderating content:', error);
    // Fail safe - flag for manual review
    return {
      safe: false,
      score: 0.5,
      categories: ['error'],
      flagged: true,
    };
  }
}

/**
 * Check image safety
 */
export async function checkImageSafety(imageUrl: string): Promise<SafetyResult> {
  try {
    // In production, this would call an image moderation API
    // (Google Cloud Vision API, AWS Rekognition, etc.)

    // Mock implementation
    await logAction({
      action: 'moderation:image_check',
      details: { imageUrl },
    });

    // Return safe by default (would be actual API response in production)
    return {
      safe: true,
      categories: [],
      confidence: 0.95,
    };
  } catch (error) {
    console.error('Error checking image safety:', error);
    // Fail safe
    return {
      safe: false,
      categories: ['error'],
      confidence: 0,
    };
  }
}

/**
 * Filter toxic content
 */
export async function filterToxicContent(
  text: string
): Promise<{ safe: boolean; filtered?: string }> {
  try {
    const moderation = await moderateContent(text, 'text');

    if (moderation.safe) {
      return { safe: true };
    }

    // Replace toxic keywords with asterisks
    let filtered = text;
    TOXIC_KEYWORDS.forEach((keyword) => {
      const regex = new RegExp(keyword, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(keyword.length));
    });

    return {
      safe: false,
      filtered,
    };
  } catch (error) {
    console.error('Error filtering content:', error);
    return { safe: false };
  }
}

/**
 * Report content for moderation
 */
export async function reportContent(
  contentId: string,
  reason: string,
  reportedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Log the report
    await logAction({
      userId: reportedBy,
      action: 'moderation:report',
      details: {
        contentId,
        reason,
      },
    });

    // In production, this would:
    // 1. Create moderation queue entry
    // 2. Flag content for review
    // 3. Notify moderation team
    // 4. Auto-hide if multiple reports

    return { success: true };
  } catch (error) {
    console.error('Error reporting content:', error);
    return { success: false, error: 'Failed to report content' };
  }
}

/**
 * Get moderation queue
 */
export async function getModerationQueue(): Promise<ModerationItem[]> {
  try {
    // In production, this would fetch from moderation queue table
    // Mock implementation returns empty array

    await logAction({
      action: 'moderation:queue_access',
    });

    return [];
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    return [];
  }
}
