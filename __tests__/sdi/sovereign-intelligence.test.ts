import {
  calculateGap,
  identifyGaps,
  overallCapabilityScore,
  scoreGoal,
  prioritizeGoals,
  selectTopGoals,
  generateGoalsFromGaps,
  calculateLearningROI,
  getBestLearningTopics,
  getHarmfulTopics,
  transitionGoalStatus,
  getGoalStats,
  Capability,
  Goal,
  LearningEntry,
} from '@/lib/autonomy/goal-prioritization';

import {
  DEFAULT_TRAITS,
  calculateTraitDrift,
  detectDrift,
  traitCoherence,
  calculateCoherence,
  autoCorrect,
  createUserAdaptation,
  applyUserAdaptation,
  isAdaptationSafe,
  evolveTrait,
  createProfile,
  PersonalityTrait,
} from '@/lib/consciousness/personality-coherence';

import {
  evaluateUserImpact,
  evaluatePrivacy,
  evaluateSafety,
  evaluateFairness,
  evaluateTransparency,
  performEthicalReview,
  logEthicalReview,
  getAuditLog,
  clearAuditLog,
  getAuditStats,
  crossesPrivacyBoundary,
  validateUserIsolation,
  ETHICS_THRESHOLDS,
  ProposedAction,
} from '@/lib/safety/ethics-framework';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const makeCapability = (overrides: Partial<Capability> = {}): Capability => ({
  name: 'Test Capability',
  currentLevel: 0.5,
  targetLevel: 0.9,
  category: 'improvement',
  ...overrides,
});

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 'goal_1',
  title: 'Test Goal',
  description: 'A test goal',
  category: 'improvement',
  priority: 50,
  impact: 0.5,
  effort: 0.5,
  status: 'proposed',
  createdAt: Date.now(),
  relatedCapabilities: [],
  ...overrides,
});

const makeAction = (overrides: Partial<ProposedAction> = {}): ProposedAction => ({
  type: 'code_modification',
  description: 'Test action',
  targetResource: 'src/lib/test.ts',
  userId: 'user_1',
  estimatedImpact: 'low',
  isReversible: true,
  affectsOtherUsers: false,
  dataAccessed: [],
  ...overrides,
});

// ─── Goal Prioritization ────────────────────────────────────────────────────

describe('Sovereign Dominant Intelligence', () => {
  describe('Capability Gap Analysis', () => {
    it('should calculate gap between current and target', () => {
      expect(calculateGap(makeCapability({ currentLevel: 0.5, targetLevel: 0.9 }))).toBe(0.4);
    });

    it('should return 0 when current meets target', () => {
      expect(calculateGap(makeCapability({ currentLevel: 0.9, targetLevel: 0.9 }))).toBe(0);
    });

    it('should return 0 when current exceeds target', () => {
      expect(calculateGap(makeCapability({ currentLevel: 1.0, targetLevel: 0.9 }))).toBe(0);
    });

    it('should identify gaps sorted by size', () => {
      const caps = [
        makeCapability({ name: 'small_gap', currentLevel: 0.8, targetLevel: 0.9 }),
        makeCapability({ name: 'big_gap', currentLevel: 0.2, targetLevel: 0.9 }),
        makeCapability({ name: 'no_gap', currentLevel: 0.9, targetLevel: 0.9 }),
      ];

      const gaps = identifyGaps(caps);
      expect(gaps).toHaveLength(2);
      expect(gaps[0].name).toBe('big_gap');
      expect(gaps[1].name).toBe('small_gap');
    });

    it('should calculate overall capability score', () => {
      const caps = [
        makeCapability({ currentLevel: 0.6 }),
        makeCapability({ currentLevel: 0.8 }),
      ];
      expect(overallCapabilityScore(caps)).toBe(0.7);
    });

    it('should handle empty capabilities', () => {
      expect(overallCapabilityScore([])).toBe(0);
    });
  });

  describe('Goal Scoring', () => {
    it('should score goals based on priority, impact, and effort', () => {
      const highScore = scoreGoal(makeGoal({ priority: 90, impact: 0.9, effort: 0.2 }));
      const lowScore = scoreGoal(makeGoal({ priority: 30, impact: 0.3, effort: 0.8 }));
      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should give safety goals a bonus', () => {
      const safetyGoal = scoreGoal(makeGoal({ category: 'safety', priority: 50 }));
      const maintenanceGoal = scoreGoal(makeGoal({ category: 'maintenance', priority: 50 }));
      expect(safetyGoal).toBeGreaterThan(maintenanceGoal);
    });

    it('should cap score at 100', () => {
      const score = scoreGoal(makeGoal({ priority: 100, impact: 1, effort: 0, category: 'safety' }));
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should not go below 0', () => {
      const score = scoreGoal(makeGoal({ priority: 0, impact: 0, effort: 1 }));
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should prioritize goals by score', () => {
      const goals = [
        makeGoal({ id: 'low', priority: 20 }),
        makeGoal({ id: 'high', priority: 90, impact: 0.9 }),
        makeGoal({ id: 'mid', priority: 50 }),
      ];

      const prioritized = prioritizeGoals(goals);
      expect(prioritized[0].id).toBe('high');
    });

    it('should select top N goals', () => {
      const goals = Array.from({ length: 10 }, (_, i) =>
        makeGoal({ id: `g${i}`, priority: i * 10 }),
      );

      const top = selectTopGoals(goals, 3);
      expect(top).toHaveLength(3);
      expect(top[0].priority).toBeGreaterThanOrEqual(top[1].priority);
    });

    it('should only select proposed goals', () => {
      const goals = [
        makeGoal({ id: 'proposed', status: 'proposed', priority: 90 }),
        makeGoal({ id: 'accepted', status: 'accepted', priority: 95 }),
        makeGoal({ id: 'completed', status: 'completed', priority: 99 }),
      ];

      const selected = prioritizeGoals(goals);
      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('proposed');
    });
  });

  describe('Goal Generation from Gaps', () => {
    it('should generate goals from capability gaps', () => {
      const caps = [
        makeCapability({ name: 'Emotion Detection', currentLevel: 0.3, targetLevel: 0.9 }),
        makeCapability({ name: 'Code Generation', currentLevel: 0.9, targetLevel: 0.9 }),
      ];

      const goals = generateGoalsFromGaps(caps);
      expect(goals).toHaveLength(1);
      expect(goals[0].title).toContain('Emotion Detection');
      expect(goals[0].status).toBe('proposed');
    });

    it('should set higher priority for larger gaps', () => {
      const caps = [
        makeCapability({ name: 'Small Gap', currentLevel: 0.8, targetLevel: 0.9 }),
        makeCapability({ name: 'Big Gap', currentLevel: 0.1, targetLevel: 0.9 }),
      ];

      const goals = generateGoalsFromGaps(caps);
      expect(goals[0].title).toContain('Big Gap');
    });
  });

  describe('Learning ROI', () => {
    const entries: LearningEntry[] = [
      { id: '1', topic: 'TypeScript', source: 'docs', learnedAt: Date.now(), appliedCount: 10, userSatisfactionDelta: 0.3 },
      { id: '2', topic: 'TypeScript', source: 'practice', learnedAt: Date.now(), appliedCount: 5, userSatisfactionDelta: 0.2 },
      { id: '3', topic: 'Rust', source: 'docs', learnedAt: Date.now(), appliedCount: 2, userSatisfactionDelta: -0.1 },
      { id: '4', topic: 'Python', source: 'course', learnedAt: Date.now(), appliedCount: 8, userSatisfactionDelta: null },
    ];

    it('should calculate ROI per topic', () => {
      const roi = calculateLearningROI(entries);
      expect(roi).toHaveLength(3); // TypeScript, Rust, Python

      const tsROI = roi.find(r => r.topic === 'TypeScript')!;
      expect(tsROI.totalApplications).toBe(15);
      expect(tsROI.averageSatisfactionDelta).toBeCloseTo(0.25);
    });

    it('should sort by ROI descending', () => {
      const roi = calculateLearningROI(entries);
      for (let i = 1; i < roi.length; i++) {
        expect(roi[i - 1].roi).toBeGreaterThanOrEqual(roi[i].roi);
      }
    });

    it('should identify best learning topics', () => {
      const best = getBestLearningTopics(entries, 2);
      expect(best).toHaveLength(2);
      expect(best[0]).toBe('TypeScript');
    });

    it('should identify harmful topics', () => {
      const harmful = getHarmfulTopics(entries);
      expect(harmful).toContain('Rust');
    });
  });

  describe('Goal Lifecycle', () => {
    it('should transition proposed → accepted', () => {
      const goal = makeGoal({ status: 'proposed' });
      const updated = transitionGoalStatus(goal, 'accepted');
      expect(updated.status).toBe('accepted');
    });

    it('should transition accepted → in_progress', () => {
      const goal = makeGoal({ status: 'accepted' });
      const updated = transitionGoalStatus(goal, 'in_progress');
      expect(updated.status).toBe('in_progress');
    });

    it('should transition in_progress → completed', () => {
      const goal = makeGoal({ status: 'in_progress' });
      const updated = transitionGoalStatus(goal, 'completed');
      expect(updated.status).toBe('completed');
    });

    it('should reject invalid transitions', () => {
      const goal = makeGoal({ status: 'completed' });
      const updated = transitionGoalStatus(goal, 'in_progress');
      expect(updated.status).toBe('completed'); // unchanged
    });

    it('should get goal statistics', () => {
      const goals = [
        makeGoal({ status: 'proposed', category: 'improvement', priority: 60 }),
        makeGoal({ status: 'accepted', category: 'learning', priority: 80 }),
        makeGoal({ status: 'completed', category: 'improvement', priority: 70 }),
        makeGoal({ status: 'rejected', category: 'safety', priority: 20 }),
      ];

      const stats = getGoalStats(goals);
      expect(stats.total).toBe(4);
      expect(stats.byStatus.proposed).toBe(1);
      expect(stats.byStatus.completed).toBe(1);
      expect(stats.byCategory.improvement).toBe(2);
      expect(stats.averagePriority).toBeGreaterThan(0);
    });
  });

  // ─── Personality Coherence ──────────────────────────────────────────────

  describe('Personality Coherence', () => {
    describe('Drift Detection', () => {
      it('should calculate drift for in-range trait', () => {
        const trait: PersonalityTrait = {
          name: 'warmth', current: 0.7, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1,
        };
        expect(calculateTraitDrift(trait)).toBe(0);
      });

      it('should calculate drift for below-range trait', () => {
        const trait: PersonalityTrait = {
          name: 'warmth', current: 0.4, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1,
        };
        expect(calculateTraitDrift(trait)).toBeCloseTo(0.2);
      });

      it('should calculate drift for above-range trait', () => {
        const trait: PersonalityTrait = {
          name: 'warmth', current: 0.95, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1,
        };
        expect(calculateTraitDrift(trait)).toBeCloseTo(0.15);
      });

      it('should detect drift across multiple traits', () => {
        const traits: PersonalityTrait[] = [
          { name: 'warmth', current: 0.3, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1 },
          { name: 'empathy', current: 0.5, targetRange: [0.7, 0.9], tolerance: 0.1, weight: 1.3 },
          { name: 'humor', current: 0.5, targetRange: [0.3, 0.6], tolerance: 0.2, weight: 0.8 },
        ];

        const report = detectDrift(traits);
        expect(report.hasDrift).toBe(true);
        expect(report.driftedTraits).toContain('warmth');
        expect(report.driftedTraits).toContain('empathy');
        expect(report.driftedTraits).not.toContain('humor');
      });

      it('should report no drift for healthy traits', () => {
        const report = detectDrift(DEFAULT_TRAITS);
        expect(report.hasDrift).toBe(false);
        expect(report.severity).toBe('none');
      });

      it('should determine severity correctly', () => {
        const highSeverity: PersonalityTrait[] = [
          { name: 'a', current: 0.1, targetRange: [0.6, 0.8], tolerance: 0.1, weight: 1 },
          { name: 'b', current: 0.1, targetRange: [0.6, 0.8], tolerance: 0.1, weight: 1 },
          { name: 'c', current: 0.1, targetRange: [0.6, 0.8], tolerance: 0.1, weight: 1 },
        ];
        const report = detectDrift(highSeverity);
        expect(report.severity).toBe('high');
      });
    });

    describe('Coherence Scoring', () => {
      it('should score 1.0 for traits in range', () => {
        const trait: PersonalityTrait = {
          name: 'test', current: 0.7, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1,
        };
        expect(traitCoherence(trait)).toBe(1);
      });

      it('should score 0 for heavily drifted traits', () => {
        const trait: PersonalityTrait = {
          name: 'test', current: 0.0, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1,
        };
        expect(traitCoherence(trait)).toBe(0);
      });

      it('should calculate overall coherence', () => {
        const result = calculateCoherence(DEFAULT_TRAITS);
        expect(result.overall).toBe(1);
        expect(result.recommendations).toHaveLength(0);
      });

      it('should generate recommendations for drifted traits', () => {
        const drifted: PersonalityTrait[] = [
          { name: 'warmth', current: 0.3, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1 },
        ];
        const result = calculateCoherence(drifted);
        expect(result.overall).toBeLessThan(0.8);
        expect(result.recommendations).toHaveLength(1);
        expect(result.recommendations[0]).toContain('warmth');
      });
    });

    describe('Auto-Correction', () => {
      it('should correct drifted traits toward midpoint', () => {
        const traits: PersonalityTrait[] = [
          { name: 'warmth', current: 0.3, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1 },
        ];

        const corrected = autoCorrect(traits, 0.5);
        expect(corrected[0].current).toBeCloseTo(0.5); // midpoint is 0.7, 0.3 + (0.7-0.3)*0.5 = 0.5
      });

      it('should not correct in-range traits', () => {
        const traits: PersonalityTrait[] = [
          { name: 'warmth', current: 0.7, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1 },
        ];

        const corrected = autoCorrect(traits);
        expect(corrected[0].current).toBe(0.7);
      });
    });

    describe('User Adaptation', () => {
      it('should create adaptation within bounds', () => {
        const adaptation = createUserAdaptation('user1', 0.5, -0.2, 0.1);
        expect(adaptation.formalityDelta).toBe(0.3); // clamped
        expect(adaptation.verbosityDelta).toBe(-0.2);
        expect(adaptation.warmthDelta).toBe(0.1);
      });

      it('should apply adaptation to traits', () => {
        const adapted = applyUserAdaptation(DEFAULT_TRAITS, {
          userId: 'user1',
          formalityDelta: 0.2,
          verbosityDelta: -0.1,
          warmthDelta: 0.1,
          adaptationCount: 1,
        });

        const formality = adapted.find(t => t.name === 'formality')!;
        expect(formality.current).toBeGreaterThan(DEFAULT_TRAITS.find(t => t.name === 'formality')!.current);
      });

      it('should check if adaptation is safe', () => {
        const safe = createUserAdaptation('user1', 0.1, 0.1, 0.1);
        expect(isAdaptationSafe(safe)).toBe(true);

        const unsafe = { userId: 'user1', formalityDelta: 0.5, verbosityDelta: 0, warmthDelta: 0, adaptationCount: 1 };
        expect(isAdaptationSafe(unsafe)).toBe(false);
      });
    });

    describe('Personality Evolution', () => {
      it('should evolve traits within bounds', () => {
        const trait: PersonalityTrait = {
          name: 'warmth', current: 0.7, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1,
        };

        const evolved = evolveTrait(trait, 0.02);
        expect(evolved.current).toBeCloseTo(0.72);
      });

      it('should cap evolution rate', () => {
        const trait: PersonalityTrait = {
          name: 'warmth', current: 0.7, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1,
        };

        const evolved = evolveTrait(trait, 0.5, 0.05); // try to evolve 0.5, max 0.05
        expect(evolved.current).toBeCloseTo(0.75);
      });

      it('should not exceed target range + tolerance', () => {
        const trait: PersonalityTrait = {
          name: 'warmth', current: 0.79, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1,
        };

        const evolved = evolveTrait(trait, 0.05, 0.05);
        expect(evolved.current).toBeLessThanOrEqual(0.95); // 0.8 + 0.15
      });
    });

    describe('Profile Creation', () => {
      it('should create a profile snapshot', () => {
        const profile = createProfile(DEFAULT_TRAITS);
        expect(profile.baseline.warmth).toBe(0.7);
        expect(profile.lastUpdated).toBeGreaterThan(0);
      });
    });
  });

  // ─── Ethics Framework ───────────────────────────────────────────────────

  describe('Ethics Framework', () => {
    beforeEach(() => {
      clearAuditLog();
    });

    describe('Impact Evaluation', () => {
      it('should score learning actions positively', () => {
        const score = evaluateUserImpact(makeAction({ type: 'learning' }));
        expect(score).toBeGreaterThan(0.5);
      });

      it('should penalize irreversible high-impact actions', () => {
        const score = evaluateUserImpact(makeAction({
          estimatedImpact: 'high',
          isReversible: false,
        }));
        expect(score).toBeLessThan(0.5);
      });
    });

    describe('Privacy Evaluation', () => {
      it('should score no-data actions as fully private', () => {
        const score = evaluatePrivacy(makeAction({ dataAccessed: [] }));
        expect(score).toBe(1);
      });

      it('should penalize accessing personal data', () => {
        const score = evaluatePrivacy(makeAction({
          dataAccessed: ['personal_info', 'email'],
        }));
        expect(score).toBeLessThan(0.7);
      });

      it('should penalize accessing conversation data', () => {
        const score = evaluatePrivacy(makeAction({
          dataAccessed: ['conversation_history'],
        }));
        expect(score).toBeLessThan(1);
      });
    });

    describe('Safety Evaluation', () => {
      it('should score reversible actions higher', () => {
        const safe = evaluateSafety(makeAction({ isReversible: true }));
        const unsafe = evaluateSafety(makeAction({ isReversible: false }));
        expect(safe).toBeGreaterThan(unsafe);
      });

      it('should penalize auth-related modifications', () => {
        const baseline = evaluateSafety(makeAction({ type: 'code_modification' }));
        const authScore = evaluateSafety(makeAction({
          type: 'code_modification',
          targetResource: 'src/lib/auth.ts',
        }));
        expect(authScore).toBeLessThan(baseline);
      });

      it('should penalize middleware modifications', () => {
        const baseline = evaluateSafety(makeAction({ type: 'code_modification' }));
        const mwScore = evaluateSafety(makeAction({
          type: 'code_modification',
          targetResource: 'middleware.ts',
        }));
        expect(mwScore).toBeLessThan(baseline);
      });
    });

    describe('Fairness Evaluation', () => {
      it('should penalize actions affecting other users', () => {
        const score = evaluateFairness(makeAction({ affectsOtherUsers: true }));
        expect(score).toBeLessThan(0.9);
      });

      it('should score single-user actions as fair', () => {
        const score = evaluateFairness(makeAction({ affectsOtherUsers: false }));
        expect(score).toBeGreaterThanOrEqual(0.9);
      });
    });

    describe('Full Ethical Review', () => {
      it('should approve safe, low-impact actions', () => {
        const review = performEthicalReview(makeAction({
          type: 'learning',
          estimatedImpact: 'low',
          isReversible: true,
          affectsOtherUsers: false,
          dataAccessed: [],
        }));
        expect(review.approved).toBe(true);
        expect(review.scores.overall).toBeGreaterThan(0.6);
      });

      it('should reject unsafe actions', () => {
        const review = performEthicalReview(makeAction({
          type: 'deployment',
          estimatedImpact: 'high',
          isReversible: false,
          affectsOtherUsers: true,
          dataAccessed: ['personal_info', 'conversations'],
          targetResource: 'middleware.ts',
        }));
        expect(review.approved).toBe(false);
      });

      it('should generate concerns for borderline actions', () => {
        const review = performEthicalReview(makeAction({
          isReversible: false,
          affectsOtherUsers: true,
        }));
        expect(review.concerns.length).toBeGreaterThan(0);
      });

      it('should set conditions for approved actions', () => {
        const review = performEthicalReview(makeAction({
          estimatedImpact: 'high',
          isReversible: false,
          type: 'learning',
        }));
        if (review.approved) {
          expect(review.conditions.length).toBeGreaterThan(0);
        }
      });
    });

    describe('Audit Logging', () => {
      it('should log ethical reviews', () => {
        const review = performEthicalReview(makeAction());
        const id = logEthicalReview(review);
        expect(id).toContain('eth_');

        const log = getAuditLog();
        expect(log).toHaveLength(1);
        expect(log[0].review.approved).toBe(review.approved);
      });

      it('should accumulate multiple reviews', () => {
        logEthicalReview(performEthicalReview(makeAction()));
        logEthicalReview(performEthicalReview(makeAction()));
        logEthicalReview(performEthicalReview(makeAction()));
        expect(getAuditLog()).toHaveLength(3);
      });

      it('should calculate audit statistics', () => {
        logEthicalReview(performEthicalReview(makeAction({ type: 'learning' })));
        logEthicalReview(performEthicalReview(makeAction({
          type: 'deployment',
          estimatedImpact: 'high',
          isReversible: false,
          affectsOtherUsers: true,
          dataAccessed: ['personal_data'],
          targetResource: 'middleware.ts',
        })));

        const stats = getAuditStats();
        expect(stats.totalReviews).toBe(2);
        expect(stats.approvedCount + stats.rejectedCount).toBe(2);
        expect(stats.byCategory.learning.total).toBe(1);
        expect(stats.byCategory.deployment.total).toBe(1);
      });

      it('should clear audit log', () => {
        logEthicalReview(performEthicalReview(makeAction()));
        clearAuditLog();
        expect(getAuditLog()).toHaveLength(0);
      });
    });

    describe('Privacy Boundaries', () => {
      it('should detect cross-user data access', () => {
        const action = makeAction({
          affectsOtherUsers: true,
          dataAccessed: ['user_data'],
        });
        expect(crossesPrivacyBoundary(action, 'user_1')).toBe(true);
      });

      it('should allow same-user actions', () => {
        const action = makeAction({ userId: 'user_1' });
        expect(crossesPrivacyBoundary(action, 'user_1')).toBe(false);
      });

      it('should validate user isolation', () => {
        const action = makeAction({ userId: 'user_2' });
        const result = validateUserIsolation(action, 'user_1');
        expect(result.valid).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should pass validation for same user', () => {
        const action = makeAction({ userId: 'user_1' });
        const result = validateUserIsolation(action, 'user_1');
        expect(result.valid).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it('should reject cross-user data modification', () => {
        const action = makeAction({
          userId: 'user_1',
          type: 'data_modification',
          affectsOtherUsers: true,
        });
        const result = validateUserIsolation(action, 'user_1');
        expect(result.valid).toBe(false);
      });
    });
  });
});
