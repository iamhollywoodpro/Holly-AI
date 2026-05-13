/**
 * Ethics Framework — Ethical reasoning for autonomous actions
 *
 * Features:
 * - Pre-action ethical review
 * - Multi-dimensional impact assessment
 * - Action rejection for unethical operations
 * - Audit logging of all ethical decisions
 * - Privacy boundary enforcement
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ActionCategory =
  | 'code_modification'
  | 'data_access'
  | 'data_modification'
  | 'communication'
  | 'system_configuration'
  | 'deployment'
  | 'learning'
  | 'goal_execution';

export interface ProposedAction {
  type: ActionCategory;
  description: string;
  targetResource: string;
  userId: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  isReversible: boolean;
  affectsOtherUsers: boolean;
  dataAccessed: string[];
}

export interface EthicalReview {
  action: ProposedAction;
  approved: boolean;
  scores: EthicalScores;
  concerns: string[];
  conditions: string[];
  reviewedAt: number;
}

export interface EthicalScores {
  userImpact: number;      // 0-1, higher = better for user
  privacy: number;         // 0-1, higher = more privacy-respecting
  safety: number;          // 0-1, higher = safer
  fairness: number;        // 0-1, higher = more fair
  transparency: number;    // 0-1, higher = more transparent
  overall: number;         // weighted average
}

export interface EthicalAuditEntry {
  id: string;
  action: ProposedAction;
  review: EthicalReview;
  timestamp: number;
}

// ─── Scoring Thresholds ─────────────────────────────────────────────────────

export const ETHICS_THRESHOLDS = {
  /** Minimum overall score to approve an action */
  minimumOverall: 0.6,
  /** Minimum safety score — never approve unsafe actions */
  minimumSafety: 0.5,
  /** Minimum privacy score */
  minimumPrivacy: 0.5,
  /** Score below which concerns are raised */
  concernThreshold: 0.7,
};

// ─── Ethical Evaluation ─────────────────────────────────────────────────────

/**
 * Evaluate user impact of an action.
 */
export function evaluateUserImpact(action: ProposedAction): number {
  let score = 0.5; // neutral baseline

  // Positive impact indicators
  if (action.type === 'code_modification' && action.isReversible) score += 0.2;
  if (action.type === 'learning') score += 0.3;
  if (action.type === 'communication') score += 0.1;
  if (action.estimatedImpact === 'low') score += 0.1;

  // Negative impact indicators
  if (action.estimatedImpact === 'high' && !action.isReversible) score -= 0.3;
  if (action.affectsOtherUsers) score -= 0.1;
  if (action.type === 'deployment' && !action.isReversible) score -= 0.2;

  return Math.max(0, Math.min(1, score));
}

/**
 * Evaluate privacy implications of an action.
 */
export function evaluatePrivacy(action: ProposedAction): number {
  let score = 1; // start fully private

  // Privacy concerns
  if (action.dataAccessed.length > 3) score -= 0.2;
  if (action.affectsOtherUsers) score -= 0.3;
  if (action.dataAccessed.some(d => d.includes('personal') || d.includes('email') || d.includes('password'))) {
    score -= 0.4;
  }
  if (action.dataAccessed.some(d => d.includes('conversation') || d.includes('message'))) {
    score -= 0.2;
  }

  // Privacy positive
  if (action.dataAccessed.length === 0) score = 1;
  if (action.type === 'code_modification' && action.dataAccessed.length <= 1) score += 0.1;

  return Math.max(0, Math.min(1, score));
}

/**
 * Evaluate safety of an action.
 */
export function evaluateSafety(action: ProposedAction): number {
  let score = 0.8; // generally safe

  // Safety concerns
  if (!action.isReversible) score -= 0.3;
  if (action.type === 'deployment') score -= 0.2;
  if (action.type === 'system_configuration') score -= 0.2;
  if (action.estimatedImpact === 'high') score -= 0.2;
  if (action.type === 'code_modification' && action.targetResource.includes('middleware')) {
    score -= 0.3;
  }
  if (action.type === 'code_modification' && action.targetResource.includes('auth')) {
    score -= 0.3;
  }

  // Safety positive
  if (action.isReversible) score += 0.1;
  if (action.type === 'learning') score += 0.1;
  if (action.estimatedImpact === 'low') score += 0.1;

  return Math.max(0, Math.min(1, score));
}

/**
 * Evaluate fairness of an action.
 */
export function evaluateFairness(action: ProposedAction): number {
  let score = 0.9; // generally fair

  if (action.affectsOtherUsers) score -= 0.3;
  if (action.type === 'data_access' && action.dataAccessed.length > 2) score -= 0.2;

  return Math.max(0, Math.min(1, score));
}

/**
 * Evaluate transparency of an action.
 */
export function evaluateTransparency(action: ProposedAction): number {
  let score = 0.7;

  if (action.type === 'communication') score += 0.2;
  if (action.type === 'learning') score += 0.1;
  if (action.isReversible) score += 0.1;

  if (action.type === 'system_configuration') score -= 0.1;
  if (action.estimatedImpact === 'high') score -= 0.1;

  return Math.max(0, Math.min(1, score));
}

// ─── Full Ethical Review ────────────────────────────────────────────────────

/**
 * Perform a complete ethical review of a proposed action.
 */
export function performEthicalReview(action: ProposedAction): EthicalReview {
  const userImpact = evaluateUserImpact(action);
  const privacy = evaluatePrivacy(action);
  const safety = evaluateSafety(action);
  const fairness = evaluateFairness(action);
  const transparency = evaluateTransparency(action);

  // Weighted overall score
  const overall = (
    userImpact * 0.25 +
    privacy * 0.25 +
    safety * 0.25 +
    fairness * 0.15 +
    transparency * 0.10
  );

  const scores: EthicalScores = {
    userImpact,
    privacy,
    safety,
    fairness,
    transparency,
    overall: Math.round(overall * 1000) / 1000,
  };

  // Identify concerns
  const concerns: string[] = [];
  if (safety < ETHICS_THRESHOLDS.concernThreshold) {
    concerns.push(`Safety concern: score ${safety.toFixed(2)} is below threshold`);
  }
  if (privacy < ETHICS_THRESHOLDS.concernThreshold) {
    concerns.push(`Privacy concern: score ${privacy.toFixed(2)} is below threshold`);
  }
  if (fairness < ETHICS_THRESHOLDS.concernThreshold) {
    concerns.push(`Fairness concern: score ${fairness.toFixed(2)} is below threshold`);
  }
  if (!action.isReversible) {
    concerns.push('Action is not reversible');
  }
  if (action.affectsOtherUsers) {
    concerns.push('Action affects other users');
  }

  // Determine approval
  const approved =
    overall >= ETHICS_THRESHOLDS.minimumOverall &&
    safety >= ETHICS_THRESHOLDS.minimumSafety &&
    privacy >= ETHICS_THRESHOLDS.minimumPrivacy;

  // Set conditions for approved actions
  const conditions: string[] = [];
  if (approved) {
    if (action.estimatedImpact === 'high') {
      conditions.push('Require user confirmation before execution');
    }
    if (!action.isReversible) {
      conditions.push('Create backup before execution');
    }
    if (action.affectsOtherUsers) {
      conditions.push('Notify affected users');
    }
    if (concerns.length > 0) {
      conditions.push('Log detailed rationale for this decision');
    }
  }

  return {
    action,
    approved,
    scores,
    concerns,
    conditions,
    reviewedAt: Date.now(),
  };
}

// ─── Audit Logging ──────────────────────────────────────────────────────────

const auditLog: EthicalAuditEntry[] = [];

/**
 * Log an ethical review to the audit trail.
 */
export function logEthicalReview(review: EthicalReview): string {
  const id = `eth_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  auditLog.push({
    id,
    action: review.action,
    review,
    timestamp: Date.now(),
  });
  return id;
}

/**
 * Get the audit log (for testing/inspection).
 */
export function getAuditLog(): EthicalAuditEntry[] {
  return [...auditLog];
}

/**
 * Clear the audit log (for testing).
 */
export function clearAuditLog(): void {
  auditLog.length = 0;
}

/**
 * Get audit statistics.
 */
export function getAuditStats(): {
  totalReviews: number;
  approvedCount: number;
  rejectedCount: number;
  approvalRate: number;
  byCategory: Record<ActionCategory, { total: number; approved: number }>;
} {
  let approvedCount = 0;
  const byCategory: Record<ActionCategory, { total: number; approved: number }> = {
    code_modification: { total: 0, approved: 0 },
    data_access: { total: 0, approved: 0 },
    data_modification: { total: 0, approved: 0 },
    communication: { total: 0, approved: 0 },
    system_configuration: { total: 0, approved: 0 },
    deployment: { total: 0, approved: 0 },
    learning: { total: 0, approved: 0 },
    goal_execution: { total: 0, approved: 0 },
  };

  for (const entry of auditLog) {
    byCategory[entry.action.type].total++;
    if (entry.review.approved) {
      approvedCount++;
      byCategory[entry.action.type].approved++;
    }
  }

  return {
    totalReviews: auditLog.length,
    approvedCount,
    rejectedCount: auditLog.length - approvedCount,
    approvalRate: auditLog.length > 0 ? approvedCount / auditLog.length : 0,
    byCategory,
  };
}

// ─── Privacy Boundaries ─────────────────────────────────────────────────────

/**
 * Check if an action crosses privacy boundaries between users.
 */
export function crossesPrivacyBoundary(action: ProposedAction, requestingUserId: string): boolean {
  // If action affects other users and accesses their data
  if (action.affectsOtherUsers && action.dataAccessed.some(d => d.includes('user_data'))) {
    return true;
  }

  // If action targets a different user's resources
  if (action.userId !== requestingUserId && action.type === 'data_access') {
    return true;
  }

  return false;
}

/**
 * Validate that an action respects user isolation.
 */
export function validateUserIsolation(
  action: ProposedAction,
  contextUserId: string,
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  if (action.userId !== contextUserId) {
    violations.push(`Action targets user ${action.userId} but context is user ${contextUserId}`);
  }

  if (action.affectsOtherUsers && action.type === 'data_modification') {
    violations.push('Data modification affecting other users is not allowed');
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
