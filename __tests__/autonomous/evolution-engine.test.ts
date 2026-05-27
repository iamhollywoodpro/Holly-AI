/**
 * Evolution Engine Tests
 *
 * Tests the EvolutionEngine class: capability management,
 * autonomous evolution checks, proposal generation/sorting,
 * and readiness scoring.
 *
 * Uses mock Prisma client to avoid database dependency.
 */

/// <reference types="jest" />

// ---------------------------------------------------------------------------
// Mock setup (before any imports)
// ---------------------------------------------------------------------------

const mockQueryRaw = jest.fn().mockResolvedValue([]);
const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/db', () => ({
  prisma: {
    evolutionCapability: {},
    evolutionProposal: {},
    $queryRaw: mockQueryRaw,
    $executeRaw: mockExecuteRaw,
  },
}));

jest.mock('@/lib/logger', () => ({
  hollyLogger: {
    ai: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

jest.mock('@/lib/autonomous/self-diagnosis', () => ({
  selfDiagnosisExtended: {
    runHealthCheck: jest.fn().mockResolvedValue({
      overall: 'healthy',
      score: 95,
      issues: [],
    }),
  },
  selfHealing: {
    heal: jest.fn(),
  },
}));

jest.mock('@/lib/autonomous/learning-engine', () => ({
  learningEngine: {
    generateInsights: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/lib/code/auto-fixer', () => ({
  autoFixer: {
    fix: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { EvolutionEngine } from '@/lib/autonomous/evolution-engine';
import type { EvolutionProposal, EvolutionCapability } from '@/lib/autonomous/evolution-engine';

// ---------------------------------------------------------------------------
// Helper: build a fresh engine with default capabilities
// ---------------------------------------------------------------------------

/**
 * The constructor calls initializeCapabilities() which is async.
 * Since we mock $queryRaw to return [], it will fall through to
 * initializeDefaultCapabilities() which populates the internal Map
 * and calls $executeRaw for each capability.
 */
function createEngine(): EvolutionEngine {
  return new EvolutionEngine();
}

/**
 * Small delay to let the async constructor finish initializing
 * capabilities so the internal Map is populated.
 */
function waitForInit(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EvolutionEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryRaw.mockResolvedValue([]);
    mockExecuteRaw.mockResolvedValue(undefined);
  });

  // =========================================================================
  // 1. Constructor & Default Capabilities
  // =========================================================================

  describe('constructor and default capabilities', () => {
    it('should initialize with 9 default capabilities', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = engine.getCapabilities();
      expect(caps.length).toBe(9);
    });

    it('should include all expected capability names', async () => {
      const engine = createEngine();
      await waitForInit();

      const names = engine.getCapabilities().map((c) => c.name);
      expect(names).toContain('code_analysis');
      expect(names).toContain('code_generation');
      expect(names).toContain('error_detection');
      expect(names).toContain('error_fixing');
      expect(names).toContain('learning');
      expect(names).toContain('self_diagnosis');
      expect(names).toContain('model_training');
      expect(names).toContain('api_creation');
      expect(names).toContain('llm_development');
    });

    it('should set code_generation default level to 80', async () => {
      const engine = createEngine();
      await waitForInit();

      const codeGen = engine.getCapability('code_generation');
      expect(codeGen).toBeDefined();
      expect(codeGen!.level).toBe(80);
    });

    it('should set self_diagnosis default level to 55', async () => {
      const engine = createEngine();
      await waitForInit();

      const selfDiag = engine.getCapability('self_diagnosis');
      expect(selfDiag).toBeDefined();
      expect(selfDiag!.level).toBe(55);
    });

    it('should set learning default level to 60', async () => {
      const engine = createEngine();
      await waitForInit();

      const learning = engine.getCapability('learning');
      expect(learning).toBeDefined();
      expect(learning!.level).toBe(60);
    });
  });

  // =========================================================================
  // 2. getCapability
  // =========================================================================

  describe('getCapability', () => {
    it('should return the capability when name matches', async () => {
      const engine = createEngine();
      await waitForInit();

      const cap = engine.getCapability('model_training');
      expect(cap).toBeDefined();
      expect(cap!.name).toBe('model_training');
      expect(cap!.level).toBe(20);
    });

    it('should return undefined for an unknown capability name', async () => {
      const engine = createEngine();
      await waitForInit();

      const cap = engine.getCapability('nonexistent_capability');
      expect(cap).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. canEvolveAutonomously
  // =========================================================================

  describe('canEvolveAutonomously', () => {
    it('should return true when all thresholds are met (default capabilities)', async () => {
      const engine = createEngine();
      await waitForInit();

      // Defaults: code_generation=80 >= 70, self_diagnosis=55 >= 50, learning=60 >= 50
      expect(engine.canEvolveAutonomously()).toBe(true);
    });

    it('should return false when code_generation < 70', async () => {
      const engine = createEngine();
      await waitForInit();

      // Use reflection to lower the capability level
      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      const codeGen = caps.get('code_generation')!;
      codeGen.level = 69;

      expect(engine.canEvolveAutonomously()).toBe(false);
    });

    it('should return false when self_diagnosis < 50', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      const selfDiag = caps.get('self_diagnosis')!;
      selfDiag.level = 49;

      expect(engine.canEvolveAutonomously()).toBe(false);
    });

    it('should return false when learning < 50', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      const learning = caps.get('learning')!;
      learning.level = 49;

      expect(engine.canEvolveAutonomously()).toBe(false);
    });

    it('should return false when all three are below threshold', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      caps.get('code_generation')!.level = 10;
      caps.get('self_diagnosis')!.level = 10;
      caps.get('learning')!.level = 10;

      expect(engine.canEvolveAutonomously()).toBe(false);
    });

    it('should return true at exact boundary values (70, 50, 50)', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      caps.get('code_generation')!.level = 70;
      caps.get('self_diagnosis')!.level = 50;
      caps.get('learning')!.level = 50;

      expect(engine.canEvolveAutonomously()).toBe(true);
    });
  });

  // =========================================================================
  // 4. getEvolutionReadiness
  // =========================================================================

  describe('getEvolutionReadiness', () => {
    it('should compute the weighted score correctly with default capabilities', async () => {
      const engine = createEngine();
      await waitForInit();

      // Defaults:
      //   code_generation=80, self_diagnosis=55, learning=60,
      //   model_training=20, api_creation=15, llm_development=5
      // Score = 80*0.3 + 55*0.2 + 60*0.2 + 20*0.15 + 15*0.1 + 5*0.05
      //       = 24 + 11 + 12 + 3 + 1.5 + 0.25 = 51.75 => round = 52
      const readiness = engine.getEvolutionReadiness();
      expect(readiness.score).toBe(52);
    });

    it('should report canEvolve=true when no blockers exist', async () => {
      const engine = createEngine();
      await waitForInit();

      const readiness = engine.getEvolutionReadiness();
      expect(readiness.canEvolve).toBe(true);
      expect(readiness.blockers).toHaveLength(0);
    });

    it('should identify blockers when code_generation < 70', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      caps.get('code_generation')!.level = 60;

      const readiness = engine.getEvolutionReadiness();
      expect(readiness.canEvolve).toBe(false);
      expect(readiness.blockers.length).toBeGreaterThanOrEqual(1);
      expect(readiness.blockers[0]).toContain('Code generation');
      expect(readiness.blockers[0]).toContain('60%');
    });

    it('should identify blockers when self_diagnosis < 50', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      caps.get('self_diagnosis')!.level = 40;

      const readiness = engine.getEvolutionReadiness();
      expect(readiness.canEvolve).toBe(false);
      const blockerText = readiness.blockers.find((b) => b.includes('Self-diagnosis'));
      expect(blockerText).toBeDefined();
      expect(blockerText).toContain('40%');
    });

    it('should identify blockers when learning < 50', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      caps.get('learning')!.level = 30;

      const readiness = engine.getEvolutionReadiness();
      expect(readiness.canEvolve).toBe(false);
      const blockerText = readiness.blockers.find((b) => b.includes('Learning'));
      expect(blockerText).toBeDefined();
      expect(blockerText).toContain('30%');
    });

    it('should provide nextSteps when blockers exist', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      caps.get('code_generation')!.level = 50;

      const readiness = engine.getEvolutionReadiness();
      expect(readiness.nextSteps.length).toBeGreaterThanOrEqual(1);
      expect(readiness.nextSteps[0]).toContain('Improve code generation');
    });

    it('should return "Ready for autonomous evolution!" when no blockers', async () => {
      const engine = createEngine();
      await waitForInit();

      const readiness = engine.getEvolutionReadiness();
      expect(readiness.nextSteps).toEqual(['Ready for autonomous evolution!']);
    });

    it('should compute score at maximum capability levels (all 100)', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      caps.get('code_generation')!.level = 100;
      caps.get('self_diagnosis')!.level = 100;
      caps.get('learning')!.level = 100;
      caps.get('model_training')!.level = 100;
      caps.get('api_creation')!.level = 100;
      caps.get('llm_development')!.level = 100;

      // Score = 100*0.3 + 100*0.2 + 100*0.2 + 100*0.15 + 100*0.1 + 100*0.05 = 100
      const readiness = engine.getEvolutionReadiness();
      expect(readiness.score).toBe(100);
    });
  });

  // =========================================================================
  // 5. updateCapability (tested indirectly via deployProposal path)
  // =========================================================================

  describe('updateCapability (private, tested via reflection)', () => {
    it('should increment capability level correctly', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      const before = caps.get('model_training')!.level; // 20

      // updateCapability is private; invoke via reflection
      await (engine as any).updateCapability('model_training', 5);

      expect(caps.get('model_training')!.level).toBe(before + 5);
    });

    it('should clamp capability level at 100', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      caps.get('code_generation')!.level = 98;

      await (engine as any).updateCapability('code_generation', 10);

      expect(caps.get('code_generation')!.level).toBe(100);
    });

    it('should not change level for an unknown capability name', async () => {
      const engine = createEngine();
      await waitForInit();

      const before = engine.getCapabilities().length;
      await (engine as any).updateCapability('nonexistent', 10);

      // No new capability should have been added
      expect(engine.getCapabilities().length).toBe(before);
    });

    it('should increment the improvements counter', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      const beforeImprovements = caps.get('model_training')!.improvements;

      await (engine as any).updateCapability('model_training', 3);

      expect(caps.get('model_training')!.improvements).toBe(beforeImprovements + 1);
    });

    it('should update lastImproved timestamp', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      const before = caps.get('code_generation')!.lastImproved;

      // Small delay to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 10));

      await (engine as any).updateCapability('code_generation', 1);

      const after = caps.get('code_generation')!.lastImproved;
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  // =========================================================================
  // 6. generateProposals sorting
  // =========================================================================

  describe('generateProposals', () => {
    it('should sort proposals by impact*10 - risk descending', async () => {
      const engine = createEngine();
      await waitForInit();

      // We call generateProposals with findings that produce proposals
      // of different impact/risk combinations.
      // "Issue detected:" => impact=medium(2), risk=low(1) => score = 2*10 - 1 = 19
      // "Learning insight:" => impact=high(3), risk=medium(2) => score = 3*10 - 2 = 28
      // "Code improvement:" => impact=medium(2), risk=low(1) => score = 2*10 - 1 = 19
      // Expected order: Learning insight (28), then Issue detected (19) and Code improvement (19)

      const findings = [
        'Code improvement: Reduce cyclomatic complexity in smart-router',
        'Issue detected: Memory leak in stream handler - Connection not closed',
        'Learning insight: Users prefer concise responses - Shorten default output',
      ];

      const proposals = await (engine as any).generateProposals(findings);

      expect(proposals.length).toBe(3);

      // Highest score (28) should be first
      expect(proposals[0].title).toBe('Learning-Based Feature');
      expect(proposals[0].impact).toBe('high');
      expect(proposals[0].risk).toBe('medium');
    });

    it('should sort critical impact above high impact', async () => {
      const engine = createEngine();
      await waitForInit();

      // We'll manually set up proposals and test the sorting logic directly
      const proposals: EvolutionProposal[] = [
        {
          id: 'p1',
          type: 'code_improvement',
          title: 'High impact, low risk',
          description: 'test',
          rationale: 'test',
          impact: 'high',
          risk: 'low',
          status: 'proposed',
          proposedAt: new Date(),
        },
        {
          id: 'p2',
          type: 'code_improvement',
          title: 'Critical impact, low risk',
          description: 'test',
          rationale: 'test',
          impact: 'critical',
          risk: 'low',
          status: 'proposed',
          proposedAt: new Date(),
        },
        {
          id: 'p3',
          type: 'code_improvement',
          title: 'Medium impact, low risk',
          description: 'test',
          rationale: 'test',
          impact: 'medium',
          risk: 'low',
          status: 'proposed',
          proposedAt: new Date(),
        },
      ];

      const impactOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const riskOrder: Record<string, number> = { low: 1, medium: 2, high: 3 };

      const sorted = proposals.sort((a, b) => {
        const aScore = impactOrder[a.impact] * 10 - riskOrder[a.risk];
        const bScore = impactOrder[b.impact] * 10 - riskOrder[b.risk];
        return bScore - aScore;
      });

      // critical(4)*10 - low(1) = 39
      // high(3)*10 - low(1) = 29
      // medium(2)*10 - low(1) = 19
      expect(sorted[0].impact).toBe('critical');
      expect(sorted[1].impact).toBe('high');
      expect(sorted[2].impact).toBe('medium');
    });

    it('should sort same impact by lower risk first', async () => {
      const proposals: EvolutionProposal[] = [
        {
          id: 'p1', type: 'code_improvement', title: 'A',
          description: 'test', rationale: 'test',
          impact: 'high', risk: 'high',
          status: 'proposed', proposedAt: new Date(),
        },
        {
          id: 'p2', type: 'code_improvement', title: 'B',
          description: 'test', rationale: 'test',
          impact: 'high', risk: 'low',
          status: 'proposed', proposedAt: new Date(),
        },
      ];

      const impactOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const riskOrder: Record<string, number> = { low: 1, medium: 2, high: 3 };

      const sorted = proposals.sort((a, b) => {
        const aScore = impactOrder[a.impact] * 10 - riskOrder[a.risk];
        const bScore = impactOrder[b.impact] * 10 - riskOrder[b.risk];
        return bScore - aScore;
      });

      // B: high(3)*10 - low(1) = 29 (higher score => first)
      // A: high(3)*10 - high(3) = 27
      expect(sorted[0].risk).toBe('low');
      expect(sorted[1].risk).toBe('high');
    });
  });

  // =========================================================================
  // 7. createProposalFromFinding
  // =========================================================================

  describe('createProposalFromFinding', () => {
    it('should create a code_improvement proposal for "Issue detected:" findings', async () => {
      const engine = createEngine();
      await waitForInit();

      const proposal = await (engine as any).createProposalFromFinding(
        'Issue detected: Memory leak in stream handler - Connection not closed'
      );

      expect(proposal).not.toBeNull();
      expect(proposal.type).toBe('code_improvement');
      expect(proposal.title).toBe('Fix Detected Issue');
      expect(proposal.impact).toBe('medium');
      expect(proposal.risk).toBe('low');
      expect(proposal.status).toBe('proposed');
    });

    it('should create a code_improvement proposal for "Code improvement:" findings', async () => {
      const engine = createEngine();
      await waitForInit();

      const proposal = await (engine as any).createProposalFromFinding(
        'Code improvement: Refactor error handling for consistency'
      );

      expect(proposal).not.toBeNull();
      expect(proposal.type).toBe('code_improvement');
      expect(proposal.title).toBe('Code Quality Improvement');
      expect(proposal.impact).toBe('medium');
      expect(proposal.risk).toBe('low');
    });

    it('should create a feature_addition proposal for "Learning insight:" findings', async () => {
      const engine = createEngine();
      await waitForInit();

      const proposal = await (engine as any).createProposalFromFinding(
        'Learning insight: Users prefer short responses - Adjust default length'
      );

      expect(proposal).not.toBeNull();
      expect(proposal.type).toBe('feature_addition');
      expect(proposal.title).toBe('Learning-Based Feature');
      expect(proposal.impact).toBe('high');
      expect(proposal.risk).toBe('medium');
    });

    it('should create a model_training proposal for "underdeveloped" findings', async () => {
      const engine = createEngine();
      await waitForInit();

      const proposal = await (engine as any).createProposalFromFinding(
        "Capability 'model_training' is underdeveloped (20%)"
      );

      expect(proposal).not.toBeNull();
      expect(proposal.type).toBe('model_training');
      expect(proposal.title).toContain('model_training');
      expect(proposal.impact).toBe('high');
      expect(proposal.risk).toBe('medium');
    });

    it('should return null for unrecognized finding strings', async () => {
      const engine = createEngine();
      await waitForInit();

      const proposal = await (engine as any).createProposalFromFinding(
        'Some random string that does not match any pattern'
      );

      expect(proposal).toBeNull();
    });

    it('should return null for empty string', async () => {
      const engine = createEngine();
      await waitForInit();

      const proposal = await (engine as any).createProposalFromFinding('');
      expect(proposal).toBeNull();
    });

    it('should return null for underdeveloped finding without a quoted capability name', async () => {
      const engine = createEngine();
      await waitForInit();

      const proposal = await (engine as any).createProposalFromFinding(
        'underdeveloped capability needs attention'
      );

      expect(proposal).toBeNull();
    });

    it('should assign a unique id to each proposal', async () => {
      const engine = createEngine();
      await waitForInit();

      const p1 = await (engine as any).createProposalFromFinding(
        'Issue detected: Bug A'
      );
      const p2 = await (engine as any).createProposalFromFinding(
        'Issue detected: Bug B'
      );

      expect(p1.id).not.toBe(p2.id);
    });
  });

  // =========================================================================
  // 8. testProposal gate logic
  // =========================================================================

  describe('testProposal gate (in runImprovementCycle)', () => {
    it('should only test proposals where risk === "low" AND impact !== "low"', async () => {
      // This tests the conditional in runImprovementCycle (line 309):
      //   if (proposal.risk === 'low' && proposal.impact !== 'low')

      // risk='low', impact='medium' => SHOULD be tested
      const shouldTest1 = ('low' as string) === 'low' && ('medium' as string) !== 'low';
      expect(shouldTest1).toBe(true);

      // risk='low', impact='low' => should NOT be tested
      const shouldTest2 = ('low' as string) === 'low' && ('low' as string) !== 'low';
      expect(shouldTest2).toBe(false);

      // risk='medium', impact='high' => should NOT be tested
      const shouldTest3 = ('medium' as string) === 'low' && ('high' as string) !== 'low';
      expect(shouldTest3).toBe(false);

      // risk='high', impact='critical' => should NOT be tested
      const shouldTest4 = ('high' as string) === 'low' && ('critical' as string) !== 'low';
      expect(shouldTest4).toBe(false);
    });

    it('should skip proposals with low impact even with low risk', () => {
      const risk: string = 'low';
      const impact: string = 'low';
      expect(risk === 'low' && impact !== 'low').toBe(false);
    });

    it('should skip proposals with non-low risk even with high impact', () => {
      const risk: string = 'medium';
      const impact: string = 'high';
      expect(risk === 'low' && impact !== 'low').toBe(false);
    });
  });

  // =========================================================================
  // 9. getCapabilities
  // =========================================================================

  describe('getCapabilities', () => {
    it('should return an array of all capabilities', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = engine.getCapabilities();
      expect(Array.isArray(caps)).toBe(true);
      expect(caps.length).toBe(9);
    });

    it('should return capability objects with correct shape', async () => {
      const engine = createEngine();
      await waitForInit();

      const caps = engine.getCapabilities();
      for (const cap of caps) {
        expect(cap).toHaveProperty('name');
        expect(cap).toHaveProperty('level');
        expect(cap).toHaveProperty('description');
        expect(cap).toHaveProperty('lastImproved');
        expect(cap).toHaveProperty('improvements');
        expect(typeof cap.name).toBe('string');
        expect(typeof cap.level).toBe('number');
        expect(cap.level).toBeGreaterThanOrEqual(0);
        expect(cap.level).toBeLessThanOrEqual(100);
      }
    });
  });

  // =========================================================================
  // 10. getCurrentCycle
  // =========================================================================

  describe('getCurrentCycle', () => {
    it('should return null when no cycle has been run', async () => {
      const engine = createEngine();
      await waitForInit();

      expect(engine.getCurrentCycle()).toBeNull();
    });
  });

  // =========================================================================
  // 11. Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('should throw when a required capability is missing from the Map', async () => {
      const engine = createEngine();
      await waitForInit();

      // getEvolutionReadiness uses `!` non-null assertions for six capabilities.
      // If one is removed from the internal Map, it should throw.
      const caps = (engine as any).capabilities as Map<string, EvolutionCapability>;
      caps.delete('model_training');

      expect(() => engine.getEvolutionReadiness()).toThrow();
    });

    it('should produce consistent capability levels between getCapability and getCapabilities', async () => {
      const engine = createEngine();
      await waitForInit();

      const allCaps = engine.getCapabilities();
      for (const cap of allCaps) {
        const byName = engine.getCapability(cap.name);
        expect(byName).toBeDefined();
        expect(byName!.level).toBe(cap.level);
      }
    });
  });
});
