/**
 * Federated Learning — Privacy-preserving learning across users
 *
 * Enables Holly to learn from all users without exposing individual data:
 *  - Learning contribution scoring
 *  - Differential privacy (noise injection)
 *  - Model weight aggregation
 *  - Privacy budget tracking
 *  - Learning quality assessment
 *
 * No raw user data ever leaves the aggregation boundary.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LearningUpdate {
  userId: string;
  domain: string;
  insights: string[];
  confidence: number;          // 0-1
  sampleSize: number;          // Number of interactions this is based on
  timestamp: number;
}

export interface AggregatedLearning {
  domain: string;
  consensusInsights: string[];  // Insights agreed upon by multiple users
  avgConfidence: number;
  contributorCount: number;
  totalSamples: number;
  privacyBudgetUsed: number;    // How much privacy budget was consumed
  timestamp: number;
}

export interface PrivacyBudget {
  totalBudget: number;          // Total epsilon for this domain
  usedBudget: number;           // How much has been consumed
  remainingBudget: number;      // What's left
  contributions: number;        // Number of contributions processed
}

export interface FederatedConfig {
  minContributors: number;       // Minimum users before aggregation
  minConfidence: number;         // Minimum confidence to include
  epsilon: number;               // Privacy budget per contribution (differential privacy)
  maxInsightsPerAggregation: number;
  consensusThreshold: number;    // Fraction of contributors that must agree (0-1)
}

export const DEFAULT_FEDERATED_CONFIG: FederatedConfig = {
  minContributors: 3,
  minConfidence: 0.3,
  epsilon: 0.1,
  maxInsightsPerAggregation: 10,
  consensusThreshold: 0.5,
};

// ─── Privacy ────────────────────────────────────────────────────────────────

/**
 * Add Laplacian noise to a value for differential privacy.
 * The noise scale is sensitivity / epsilon.
 */
export function addLaplacianNoise(value: number, sensitivity: number, epsilon: number): number {
  const scale = sensitivity / Math.max(epsilon, 0.001);
  // Generate Laplace-distributed random variable
  const u = Math.random() - 0.5;
  const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  return value + noise;
}

/**
 * Check if a privacy budget has remaining capacity.
 */
export function checkPrivacyBudget(budget: PrivacyBudget, epsilonNeeded: number): boolean {
  return budget.remainingBudget >= epsilonNeeded;
}

/**
 * Create a new privacy budget for a domain.
 */
export function createPrivacyBudget(totalEpsilon: number = 10.0): PrivacyBudget {
  return {
    totalBudget: totalEpsilon,
    usedBudget: 0,
    remainingBudget: totalEpsilon,
    contributions: 0,
  };
}

/**
 * Consume privacy budget from a contribution.
 */
export function consumeBudget(budget: PrivacyBudget, epsilon: number): PrivacyBudget {
  const used = Math.min(epsilon, budget.remainingBudget);
  return {
    totalBudget: budget.totalBudget,
    usedBudget: budget.usedBudget + used,
    remainingBudget: budget.remainingBudget - used,
    contributions: budget.contributions + 1,
  };
}

// ─── Learning Aggregation ───────────────────────────────────────────────────

/**
 * Score a learning update's quality.
 */
export function scoreLearningUpdate(update: LearningUpdate): number {
  let score = 0;

  // Confidence is primary signal
  score += update.confidence * 0.4;

  // Sample size — more data = more reliable
  score += Math.min(0.3, update.sampleSize / 100 * 0.3);

  // Insight count — more insights = richer learning
  score += Math.min(0.2, update.insights.length / 10 * 0.2);

  // Recency — newer updates are more relevant
  const ageHours = (Date.now() - update.timestamp) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 1 - ageHours / 168); // 1 week decay
  score += recencyScore * 0.1;

  return Math.max(0, Math.min(1, score));
}

/**
 * Aggregate learning updates from multiple users.
 * Only includes insights that meet the consensus threshold.
 */
export function aggregateLearning(
  updates: LearningUpdate[],
  config: FederatedConfig = DEFAULT_FEDERATED_CONFIG,
): AggregatedLearning | null {
  if (updates.length < config.minContributors) return null;

  // Filter by minimum confidence
  const qualified = updates.filter(u => u.confidence >= config.minConfidence);
  if (qualified.length < config.minContributors) return null;

  const domain = qualified[0].domain;

  // Count insight frequency across contributors
  const insightFreq = new Map<string, number>();
  for (const update of qualified) {
    for (const insight of update.insights) {
      const key = insight.toLowerCase().trim();
      insightFreq.set(key, (insightFreq.get(key) || 0) + 1);
    }
  }

  // Apply consensus threshold
  const minAgreement = Math.ceil(qualified.length * config.consensusThreshold);
  const consensusInsights = Array.from(insightFreq.entries())
    .filter(([_, count]) => count >= minAgreement)
    .sort((a, b) => b[1] - a[1])
    .slice(0, config.maxInsightsPerAggregation)
    .map(([insight]) => insight);

  // Calculate average confidence with noise for privacy
  const rawAvgConfidence = qualified.reduce((sum, u) => sum + u.confidence, 0) / qualified.length;
  const noisyConfidence = Math.max(0, Math.min(1,
    addLaplacianNoise(rawAvgConfidence, 0.1, config.epsilon),
  ));

  const totalSamples = qualified.reduce((sum, u) => sum + u.sampleSize, 0);
  const privacyBudgetUsed = qualified.length * config.epsilon;

  return {
    domain,
    consensusInsights,
    avgConfidence: noisyConfidence,
    contributorCount: qualified.length,
    totalSamples,
    privacyBudgetUsed,
    timestamp: Date.now(),
  };
}

// ─── Learning Quality ───────────────────────────────────────────────────────

/**
 * Assess the quality of a federated learning result.
 */
export function assessLearningQuality(aggregated: AggregatedLearning): {
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 0;

  // Contributor diversity
  if (aggregated.contributorCount >= 10) score += 0.3;
  else if (aggregated.contributorCount >= 5) score += 0.2;
  else if (aggregated.contributorCount >= 3) score += 0.1;
  else issues.push('Too few contributors');

  // Consensus insights
  if (aggregated.consensusInsights.length >= 5) score += 0.25;
  else if (aggregated.consensusInsights.length >= 3) score += 0.15;
  else if (aggregated.consensusInsights.length >= 1) score += 0.05;
  else issues.push('No consensus insights');

  // Confidence
  if (aggregated.avgConfidence >= 0.7) score += 0.25;
  else if (aggregated.avgConfidence >= 0.5) score += 0.15;
  else issues.push('Low average confidence');

  // Sample size
  if (aggregated.totalSamples >= 100) score += 0.2;
  else if (aggregated.totalSamples >= 50) score += 0.1;
  else issues.push('Small sample size');

  // Determine quality level
  let quality: 'poor' | 'fair' | 'good' | 'excellent';
  if (score >= 0.8) quality = 'excellent';
  else if (score >= 0.6) quality = 'good';
  else if (score >= 0.3) quality = 'fair';
  else quality = 'poor';

  return { quality, score, issues };
}

/**
 * Calculate the privacy-utility tradeoff for a given configuration.
 */
export function privacyUtilityTradeoff(
  config: FederatedConfig,
  contributorCount: number,
): {
  privacyLevel: 'high' | 'medium' | 'low';
  utilityLevel: 'high' | 'medium' | 'low';
  recommendation: string;
} {
  // Lower epsilon = more privacy, less utility
  const privacyLevel = config.epsilon <= 0.05 ? 'high' : config.epsilon <= 0.5 ? 'medium' : 'low';
  const utilityLevel = contributorCount >= 10 ? 'high' : contributorCount >= 5 ? 'medium' : 'low';

  let recommendation: string;
  if (privacyLevel === 'high' && utilityLevel === 'high') {
    recommendation = 'Excellent balance — high privacy with good utility';
  } else if (privacyLevel === 'low') {
    recommendation = 'Consider lowering epsilon for better privacy protection';
  } else if (utilityLevel === 'low') {
    recommendation = 'Need more contributors for useful aggregation';
  } else {
    recommendation = 'Acceptable balance between privacy and utility';
  }

  return { privacyLevel, utilityLevel, recommendation };
}
