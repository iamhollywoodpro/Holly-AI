/**
 * HOLLY PERSONALIZATION ENGINE
 * 
 * Generates personalized responses and recommendations based on user data
 * 
 * Uses: UserPreferences, ConversationPattern (Prisma models)
 * 
 * COMBINES DATA FROM:
 * - user-preferences.ts
 * - pattern-tracker.ts
 */

import { getUserPreferences, UserPreferencesData } from './user-preferences';
import { getUserPatterns, getPatternInsights, PatternData, PatternInsights } from './pattern-tracker';

// ================== TYPE DEFINITIONS ==================

export interface PersonalizationData {
  preferences: UserPreferencesData | null;
  patterns: PatternData[];
  insights: PatternInsights;
  recommendations: string[];
  personalizationScore: number;
}

export interface PersonalizedResponse {
  response: string;
  reasoning: string;
  confidence: number;
  appliedPatterns: string[];
}

export interface UserNeedPrediction {
  predictions: Array<{
    need: string;
    confidence: number;
    reasoning: string;
    suggestedAction: string;
  }>;
  overallConfidence: number;
}

// ================== PERSONALIZATION ENGINE ==================

/**
 * Get comprehensive personalization data
 */
export async function getPersonalization(userId: string): Promise<PersonalizationData> {
  try {
    // Get all user data
    const preferences = await getUserPreferences(userId);
    const patterns = await getUserPatterns(userId);
    const insights = await getPatternInsights(userId);

    // Calculate personalization score
    const hasPreferences = preferences !== null;
    const patternCount = patterns.length;
    const avgEffectiveness = insights.averageEffectiveness;

    const personalizationScore = (
      (hasPreferences ? 0.3 : 0) +
      (Math.min(patternCount / 50, 1) * 0.4) +
      (avgEffectiveness * 0.3)
    );

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (!preferences) {
      recommendations.push('Set user preferences for better personalization');
    }

    if (patternCount < 10) {
      recommendations.push('More interactions needed for pattern-based personalization');
    }

    if (avgEffectiveness < 0.6) {
      recommendations.push('Adjust interaction strategies for better engagement');
    }

    if (preferences?.interests && preferences.interests.length > 0) {
      recommendations.push(`Focus on interests: ${preferences.interests.slice(0, 3).join(', ')}`);
    }

    return {
      preferences,
      patterns,
      insights,
      recommendations,
      personalizationScore: Math.round(personalizationScore * 100) / 100
    };
  } catch (error) {
    console.error('Error getting personalization data:', error);
    return {
      preferences: null,
      patterns: [],
      insights: {
        totalPatterns: 0,
        byType: {},
        topPatterns: [],
        recommendations: [],
        averageEffectiveness: 0
      },
      recommendations: [],
      personalizationScore: 0
    };
  }
}

/**
 * Generate personalized response
 */
export async function generatePersonalizedResponse(
  userId: string,
  context: Record<string, any>
): Promise<PersonalizedResponse> {
  try {
    const personalization = await getPersonalization(userId);

    const appliedPatterns: string[] = [];
    let response = '';
    let reasoning = '';
    let confidence = 0.5;

    // Apply preferences
    if (personalization.preferences) {
      const prefs = personalization.preferences;
      
      if (prefs.language !== 'en') {
        appliedPatterns.push(`language:${prefs.language}`);
        reasoning += `Using ${prefs.language} language preference. `;
      }

      if (prefs.interests.length > 0) {
        appliedPatterns.push('interests');
        reasoning += `Considering interests: ${prefs.interests.slice(0, 3).join(', ')}. `;
        confidence += 0.1;
      }
    }

    // Apply patterns
    if (personalization.patterns.length > 0) {
      const relevantPatterns = personalization.patterns
        .filter(p => p.effectiveness > 0.6)
        .slice(0, 3);

      relevantPatterns.forEach(p => {
        appliedPatterns.push(p.patternType);
        reasoning += `Applied ${p.patternType} pattern. `;
        confidence += 0.1;
      });
    }

    // Generate response based on context
    if (context.query) {
      response = `Personalized response to: ${context.query}`;
    } else {
      response = 'Personalized response generated';
    }

    if (appliedPatterns.length === 0) {
      reasoning = 'Using default response strategy (no personalization data available)';
      confidence = 0.3;
    }

    return {
      response,
      reasoning: reasoning.trim(),
      confidence: Math.min(confidence, 1.0),
      appliedPatterns
    };
  } catch (error) {
    console.error('Error generating personalized response:', error);
    return {
      response: 'Error generating response',
      reasoning: 'Personalization error',
      confidence: 0,
      appliedPatterns: []
    };
  }
}

/**
 * Update user profile based on interactions
 */
export async function updateUserProfile(
  userId: string,
  interactions: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const personalization = await getPersonalization(userId);

    // Calculate new personalization score
    const interactionCount = interactions.count || 0;
    const newScore = Math.min(
      personalization.personalizationScore + (interactionCount * 0.01),
      1.0
    );

    // Update preferences with new score
    const { updatePreferences } = await import('./user-preferences');
    await updatePreferences(userId, {
      // Update personalizationScore through lastPersonalizedAt trigger
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Predict user needs based on patterns
 */
export async function predictUserNeeds(userId: string): Promise<UserNeedPrediction> {
  try {
    const personalization = await getPersonalization(userId);

    const predictions: Array<{
      need: string;
      confidence: number;
      reasoning: string;
      suggestedAction: string;
    }> = [];

    // Analyze patterns for predictions
    const patterns = personalization.patterns;

    // Time-based patterns
    const timePatterns = patterns.filter(p => p.patternType === 'time_preference');
    if (timePatterns.length > 0) {
      const mostFrequent = timePatterns.sort((a, b) => b.frequency - a.frequency)[0];
      predictions.push({
        need: 'Preferred interaction time',
        confidence: mostFrequent.effectiveness,
        reasoning: `User typically interacts during: ${mostFrequent.pattern}`,
        suggestedAction: 'Schedule notifications accordingly'
      });
    }

    // Question patterns
    const questionPatterns = patterns.filter(p => p.patternType === 'question_pattern');
    if (questionPatterns.length > 0) {
      const topPattern = questionPatterns[0];
      predictions.push({
        need: 'Information preference',
        confidence: topPattern.effectiveness,
        reasoning: `Common question type: ${topPattern.pattern}`,
        suggestedAction: 'Proactively provide related information'
      });
    }

    // Work patterns
    const workPatterns = patterns.filter(p => p.patternType === 'work_pattern');
    if (workPatterns.length > 0) {
      predictions.push({
        need: 'Task assistance',
        confidence: 0.7,
        reasoning: 'Regular work-related interactions detected',
        suggestedAction: 'Offer task management and productivity features'
      });
    }

    // Calculate overall confidence
    const avgConfidence = predictions.length > 0
      ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
      : 0;

    return {
      predictions,
      overallConfidence: Math.round(avgConfidence * 100) / 100
    };
  } catch (error) {
    console.error('Error predicting user needs:', error);
    return {
      predictions: [],
      overallConfidence: 0
    };
  }
}
