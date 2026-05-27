/**
 * Holly Language Tutor Plugin — Adaptive language exercises
 *
 * Practice conversations in different languages with adaptive difficulty.
 * Tracks vocabulary, grammar accuracy, and adjusts exercise difficulty
 * based on user performance over time.
 */

import { prisma } from '@/lib/prisma';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

// ============================================================================
// TYPES
// ============================================================================

export interface LanguageSession {
  id: string;
  userId: string;
  language: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  score: number;
  exercisesCompleted: number;
  startedAt: Date;
  endedAt: Date | null;
}

export interface Exercise {
  type: 'translation' | 'fill-blank' | 'conversation' | 'vocabulary';
  prompt: string;
  correctAnswer: string;
  hint?: string;
  difficulty: number; // 1-10
}

export interface ExerciseResult {
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
  feedback: string;
  scoreDelta: number;
}

export interface LanguageProgress {
  language: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  totalSessions: number;
  totalExercises: number;
  accuracy: number;
  vocabularyLearned: number;
  streak: number;
}

// ============================================================================
// LANGUAGE TUTOR SERVICE
// ============================================================================

const SUPPORTED_LANGUAGES = [
  'spanish', 'french', 'german', 'italian', 'portuguese', 'japanese',
  'korean', 'chinese', 'arabic', 'hindi', 'russian', 'dutch',
];

export class LanguageTutorService {
  /**
   * Start a new language practice session.
   */
  async startSession(userId: string, language: string): Promise<LanguageSession> {
    const normalizedLang = this.normalizeLanguage(language);
    const level = await this.determineLevel(userId, normalizedLang);

    return prisma.pluginLanguageSession.create({
      data: {
        userId,
        language: normalizedLang,
        level,
        score: 0,
        exercisesCompleted: 0,
        startedAt: new Date(),
        endedAt: null,
      },
    }) as unknown as LanguageSession;
  }

  /**
   * Generate an exercise appropriate for the user's level.
   */
  async generateExercise(
    language: string,
    level: 'beginner' | 'intermediate' | 'advanced',
    type: 'translation' | 'fill-blank' | 'conversation' | 'vocabulary' = 'translation',
  ): Promise<Exercise> {
    const difficulty = level === 'beginner' ? 3 : level === 'intermediate' ? 6 : 9;

    try {
      const prompt = `Generate a ${type} exercise for learning ${language} at ${level} level (difficulty ${difficulty}/10).

Return ONLY a JSON object:
{
  "type": "${type}",
  "prompt": "the exercise prompt in English",
  "correctAnswer": "the correct answer in ${language}",
  "hint": "a helpful hint",
  "difficulty": ${difficulty}
}

For translation: prompt is an English phrase to translate.
For fill-blank: prompt is a sentence with ___ to fill.
For conversation: prompt is a situation to respond to in ${language}.
For vocabulary: prompt asks for the ${language} word for an English word.

Keep it appropriate for ${level} level. Be creative and varied.`;

      const routing = await smartRoute(prompt, { taskHint: 'speed' });
      const { text } = await cascadeCollect(
        routing.waterfall,
        [{ role: 'user', content: prompt }],
        { temperature: 0.7, maxTokens: 200 },
      );

      const jsonMatch = (text || '').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type,
          prompt: String(parsed.prompt || 'Translate this phrase'),
          correctAnswer: String(parsed.correctAnswer || ''),
          hint: parsed.hint ? String(parsed.hint) : undefined,
          difficulty: typeof parsed.difficulty === 'number' ? parsed.difficulty : difficulty,
        };
      }
    } catch (err) {
      console.warn('[LanguageTutor] Exercise generation failed:', (err as Error).message);
    }

    // Fallback exercise
    return {
      type,
      prompt: `Translate to ${language}: "Hello, how are you?"`,
      correctAnswer: '',
      hint: 'A common greeting',
      difficulty,
    };
  }

  /**
   * Evaluate a user's answer to an exercise.
   */
  async evaluateAnswer(
    language: string,
    exercise: Exercise,
    userAnswer: string,
  ): Promise<ExerciseResult> {
    const trimmed = userAnswer.trim();
    if (!trimmed) {
      return {
        correct: false,
        userAnswer: '',
        correctAnswer: exercise.correctAnswer,
        feedback: 'No answer provided. Try again!',
        scoreDelta: 0,
      };
    }

    // If no correct answer was generated, use LLM to evaluate
    if (!exercise.correctAnswer) {
      return this.llmEvaluate(language, exercise.prompt, trimmed, exercise.type);
    }

    // Simple comparison (case-insensitive, trim whitespace)
    const normalizedUser = trimmed.toLowerCase().replace(/[.!?,;:]/g, '').trim();
    const normalizedCorrect = exercise.correctAnswer.toLowerCase().replace(/[.!?,;:]/g, '').trim();

    const exactMatch = normalizedUser === normalizedCorrect;
    const closeMatch = !exactMatch && this.isCloseMatch(normalizedUser, normalizedCorrect);

    if (exactMatch) {
      return {
        correct: true,
        userAnswer: trimmed,
        correctAnswer: exercise.correctAnswer,
        feedback: 'Perfect! 🎉',
        scoreDelta: 10,
      };
    }

    if (closeMatch) {
      return {
        correct: true,
        userAnswer: trimmed,
        correctAnswer: exercise.correctAnswer,
        feedback: `Close! The exact answer is: "${exercise.correctAnswer}"`,
        scoreDelta: 7,
      };
    }

    return {
      correct: false,
      userAnswer: trimmed,
      correctAnswer: exercise.correctAnswer,
      feedback: `Not quite. The correct answer is: "${exercise.correctAnswer}"`,
      scoreDelta: 2,
    };
  }

  /**
   * Update session score after an exercise.
   */
  async updateSession(sessionId: string, scoreDelta: number): Promise<void> {
    await prisma.pluginLanguageSession.update({
      where: { id: sessionId },
      data: {
        score: { increment: scoreDelta },
        exercisesCompleted: { increment: 1 },
      },
    }).catch(() => {
      // Graceful degradation
    });
  }

  /**
   * End a practice session.
   */
  async endSession(sessionId: string): Promise<void> {
    await prisma.pluginLanguageSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    }).catch(() => {});
  }

  /**
   * Get progress summary for all languages.
   */
  async getProgressSummary(userId: string): Promise<LanguageProgress[]> {
    const sessions = await prisma.pluginLanguageSession.findMany({
      where: { userId, endedAt: { not: null } },
      orderBy: { startedAt: 'desc' },
    });

    if (sessions.length === 0) return [];

    // Group by language
    const byLanguage: Record<string, typeof sessions> = {};
    for (const session of sessions) {
      const lang = session.language;
      if (!byLanguage[lang]) byLanguage[lang] = [];
      byLanguage[lang].push(session);
    }

    return Object.entries(byLanguage).map(([language, langSessions]) => {
      const totalSessions = langSessions.length;
      const totalExercises = langSessions.reduce((sum, s) => sum + s.exercisesCompleted, 0);
      const avgScore = langSessions.reduce((sum, s) => sum + s.score, 0) / totalSessions;
      const latestLevel = langSessions[0]?.level || 'beginner';

      // Estimate vocabulary from exercises (rough heuristic)
      const vocabularyLearned = Math.min(totalExercises, Math.floor(totalExercises * 0.7));

      return {
        language,
        level: latestLevel as 'beginner' | 'intermediate' | 'advanced',
        totalSessions,
        totalExercises,
        accuracy: Math.min(100, Math.round(avgScore)),
        vocabularyLearned,
        streak: 0, // Would need daily session tracking
      };
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private normalizeLanguage(language: string): string {
    const lower = language.toLowerCase().trim();
    if (SUPPORTED_LANGUAGES.includes(lower)) return lower;

    const aliases: Record<string, string> = {
      'es': 'spanish', 'fr': 'french', 'de': 'german', 'it': 'italian',
      'pt': 'portuguese', 'ja': 'japanese', 'ko': 'korean', 'zh': 'chinese',
      'ar': 'arabic', 'hi': 'hindi', 'ru': 'russian', 'nl': 'dutch',
      'mandarin': 'chinese',
    };
    return aliases[lower] || 'spanish';
  }

  private async determineLevel(
    userId: string,
    language: string,
  ): Promise<'beginner' | 'intermediate' | 'advanced'> {
    try {
      const sessions = await prisma.pluginLanguageSession.findMany({
        where: { userId, language, endedAt: { not: null } },
        orderBy: { startedAt: 'desc' },
        take: 5,
      });

      if (sessions.length === 0) return 'beginner';

      const avgScore = sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length;
      const avgExercises = sessions.reduce((sum, s) => sum + s.exercisesCompleted, 0) / sessions.length;

      if (avgScore > 70 && avgExercises > 8) return 'advanced';
      if (avgScore > 40 || sessions.length > 3) return 'intermediate';
      return 'beginner';
    } catch {
      return 'beginner';
    }
  }

  private async llmEvaluate(
    language: string,
    prompt: string,
    userAnswer: string,
    type: string,
  ): Promise<ExerciseResult> {
    try {
      const evalPrompt = `Evaluate this ${language} language exercise answer.

Exercise: ${prompt}
User's answer: ${userAnswer}
Exercise type: ${type}

Is the answer correct or close? Return JSON:
{"correct": true/false, "feedback": "encouraging feedback", "scoreDelta": 0-10}`;

      const routing = await smartRoute(evalPrompt, { taskHint: 'speed' });
      const { text } = await cascadeCollect(
        routing.waterfall,
        [{ role: 'user', content: evalPrompt }],
        { temperature: 0.2, maxTokens: 100 },
      );

      const jsonMatch = (text || '').match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          correct: !!parsed.correct,
          userAnswer,
          correctAnswer: '(LLM evaluated)',
          feedback: String(parsed.feedback || 'Keep practicing!'),
          scoreDelta: typeof parsed.scoreDelta === 'number' ? parsed.scoreDelta : 5,
        };
      }
    } catch {}

    return {
      correct: false,
      userAnswer,
      correctAnswer: '(evaluation unavailable)',
      feedback: 'Good effort! Keep practicing.',
      scoreDelta: 3,
    };
  }

  private isCloseMatch(a: string, b: string): boolean {
    // Simple Levenshtein-based closeness check
    if (a.length < 2 || b.length < 2) return a === b;
    const maxLen = Math.max(a.length, b.length);
    const threshold = Math.max(1, Math.floor(maxLen * 0.3));
    return this.levenshtein(a, b) <= threshold;
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }
    return matrix[b.length][a.length];
  }
}

// Export singleton
export const languageTutorService = new LanguageTutorService();
