/**
 * HOLLY PREDICTIVE INTELLIGENCE
 * 
 * Prediction and forecasting system that allows HOLLY to:
 * 1. Predict user needs and preferences
 * 2. Forecast project outcomes
 * 3. Anticipate potential issues
 * 4. Track prediction accuracy
 * 
 * Uses: PredictionLog (Prisma model)
 */

import { prisma } from '@/lib/db';

// ================== TYPE DEFINITIONS ==================

export interface PredictionInput {
  type: string;
  target: string;
  prediction: Record<string, any>;
  confidence: number;
  context?: Record<string, any>;
}

export interface Prediction {
  id: string;
  type: string;
  target: string;
  prediction: Record<string, any>;
  confidence: number;
  context: Record<string, any>;
  accuracy?: number;
  outcome?: Record<string, any>;
  createdAt: Date;
  validatedAt?: Date;
}

export interface PredictionValidation {
  predictionId: string;
  outcome: Record<string, any>;
  accuracy: number;
}

export interface AccuracyMetrics {
  overall: number;
  byType: Record<string, number>;
  totalPredictions: number;
  validatedPredictions: number;
  highAccuracyCount: number;
}

// ================== PREDICTIVE INTELLIGENCE ==================

/**
 * Make a prediction
 */
export async function makePrediction(input: PredictionInput): Promise<{
  success: boolean;
  id?: string;
  prediction?: Prediction;
  error?: string;
}> {
  try {
    const log = await prisma.predictionLog.create({
      data: {
        predictionType: input.type,
        target: input.target,
        prediction: input.prediction,
        confidence: input.confidence,
        context: input.context || {},
        accuracy: null,
        outcome: null
      }
    });

    const prediction: Prediction = {
      id: log.id,
      type: log.predictionType,
      target: log.target,
      prediction: log.prediction as Record<string, any>,
      confidence: log.confidence,
      context: log.context as Record<string, any>,
      accuracy: log.accuracy || undefined,
      outcome: log.outcome ? (log.outcome as Record<string, any>) : undefined,
      createdAt: log.createdAt,
      validatedAt: log.validatedAt || undefined
    };

    return {
      success: true,
      id: log.id,
      prediction
    };
  } catch (error) {
    console.error('Error making prediction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate prediction with actual outcome
 */
export async function validatePrediction(validation: PredictionValidation): Promise<{
  success: boolean;
  accuracy?: number;
  error?: string;
}> {
  try {
    const updated = await prisma.predictionLog.update({
      where: { id: validation.predictionId },
      data: {
        outcome: validation.outcome,
        accuracy: validation.accuracy,
        validatedAt: new Date()
      }
    });

    return {
      success: true,
      accuracy: updated.accuracy || 0
    };
  } catch (error) {
    console.error('Error validating prediction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get predictions by type/target
 */
export async function getPredictions(options?: {
  type?: string;
  target?: string;
  validated?: boolean;
  minConfidence?: number;
  limit?: number;
}): Promise<Prediction[]> {
  try {
    const where: any = {};

    if (options?.type) where.predictionType = options.type;
    if (options?.target) where.target = options.target;
    if (options?.validated !== undefined) {
      where.validatedAt = options.validated ? { not: null } : null;
    }
    if (options?.minConfidence) {
      where.confidence = { gte: options.minConfidence };
    }

    const logs = await prisma.predictionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50
    });

    return logs.map(log => ({
      id: log.id,
      type: log.predictionType,
      target: log.target,
      prediction: log.prediction as Record<string, any>,
      confidence: log.confidence,
      context: log.context as Record<string, any>,
      accuracy: log.accuracy || undefined,
      outcome: log.outcome ? (log.outcome as Record<string, any>) : undefined,
      createdAt: log.createdAt,
      validatedAt: log.validatedAt || undefined
    }));
  } catch (error) {
    console.error('Error getting predictions:', error);
    return [];
  }
}

/**
 * Calculate prediction accuracy metrics
 */
export async function getAccuracyMetrics(): Promise<AccuracyMetrics> {
  try {
    const allPredictions = await prisma.predictionLog.findMany();
    const validatedPredictions = allPredictions.filter(p => p.validatedAt !== null);

    // Calculate overall accuracy
    const totalAccuracy = validatedPredictions.reduce((sum, p) => 
      sum + (p.accuracy || 0), 0
    );
    const overall = validatedPredictions.length > 0 
      ? totalAccuracy / validatedPredictions.length 
      : 0;

    // Calculate accuracy by type
    const byType: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    validatedPredictions.forEach(p => {
      const type = p.predictionType;
      if (!byType[type]) {
        byType[type] = 0;
        typeCounts[type] = 0;
      }
      byType[type] += p.accuracy || 0;
      typeCounts[type]++;
    });

    // Average by type
    Object.keys(byType).forEach(type => {
      byType[type] = byType[type] / typeCounts[type];
    });

    // Count high accuracy predictions (>= 0.8)
    const highAccuracyCount = validatedPredictions.filter(p => 
      (p.accuracy || 0) >= 0.8
    ).length;

    return {
      overall: Math.round(overall * 100) / 100,
      byType,
      totalPredictions: allPredictions.length,
      validatedPredictions: validatedPredictions.length,
      highAccuracyCount
    };
  } catch (error) {
    console.error('Error calculating accuracy metrics:', error);
    return {
      overall: 0,
      byType: {},
      totalPredictions: 0,
      validatedPredictions: 0,
      highAccuracyCount: 0
    };
  }
}

/**
 * Predict based on historical patterns
 */
export async function predictFromHistory(options: {
  type: string;
  target: string;
  contextSimilarity?: number;
}): Promise<{
  success: boolean;
  prediction?: Prediction;
  reasoning?: string;
  error?: string;
}> {
  try {
    // Get similar validated predictions
    const historicalPredictions = await getPredictions({
      type: options.type,
      validated: true,
      minConfidence: 0.7
    });

    if (historicalPredictions.length === 0) {
      return {
        success: true,
        reasoning: 'No historical data available for this prediction type'
      };
    }

    // Calculate average confidence from historical data
    const avgConfidence = historicalPredictions.reduce((sum, p) => 
      sum + p.confidence, 0
    ) / historicalPredictions.length;

    // Use most accurate historical prediction as base
    const bestPrediction = historicalPredictions.sort((a, b) => 
      (b.accuracy || 0) - (a.accuracy || 0)
    )[0];

    // Create new prediction based on historical pattern
    const result = await makePrediction({
      type: options.type,
      target: options.target,
      prediction: bestPrediction.prediction,
      confidence: avgConfidence,
      context: {
        basedOn: 'historical_pattern',
        sourcePredictionId: bestPrediction.id,
        historicalAccuracy: bestPrediction.accuracy
      }
    });

    return {
      success: result.success,
      prediction: result.prediction,
      reasoning: `Based on ${historicalPredictions.length} historical predictions with avg accuracy ${Math.round((bestPrediction.accuracy || 0) * 100)}%`,
      error: result.error
    };
  } catch (error) {
    console.error('Error predicting from history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
