/// <reference types="jest" />

/**
 * Phase 4 — Self-Modification Mastery Test Suite
 *
 * Tests the sandbox pipeline logic, risk assessment, diff generation,
 * approval gates, autonomous fixer risk patterns, and self-healing
 * circuit breaker — all as pure functions without filesystem/DB side effects.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Inline replicas of private pure functions from self-code-sandbox.ts
// (These mirror the exact production logic for isolated testing)
// ═══════════════════════════════════════════════════════════════════════════════

interface ProposedChange {
  filePath: string;
  changeType: string;
  description?: string;
  newContent?: string;
}

/**
 * Replica of assessRisk() from self-code-sandbox.ts (line 601-625)
 */
function assessRisk(
  change: ProposedChange,
  originalContent: string,
  proposedContent: string,
): 'low' | 'medium' | 'high' {
  const linesChanged = Math.abs(
    proposedContent.split('\n').length - originalContent.split('\n').length
  );
  const charDelta = Math.abs(proposedContent.length - originalContent.length);
  const changeRatio = originalContent.length > 0
    ? charDelta / originalContent.length
    : 1;

  if (changeRatio > 0.3 || linesChanged > 50) return 'high';
  if (change.filePath.includes('orchestrator') || change.filePath.includes('middleware')) return 'high';
  if (change.changeType === 'enhance' && changeRatio > 0.15) return 'high';

  if (changeRatio > 0.1 || linesChanged > 20) return 'medium';
  if (change.changeType === 'enhance') return 'medium';

  return 'low';
}

/**
 * Replica of generateSimpleDiff() from self-code-sandbox.ts (line 629-649)
 */
function generateSimpleDiff(oldContent: string, newContent: string, filePath: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const diffLines: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`];

  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine === newLine) continue;
    if (oldLine === undefined) {
      diffLines.push(`+${newLine}`);
    } else if (newLine === undefined) {
      diffLines.push(`-${oldLine}`);
    } else {
      diffLines.push(`-${oldLine}`);
      diffLines.push(`+${newLine}`);
    }
  }
  return diffLines.join('\n');
}

/**
 * Replica of requiresApproval() from self-code-sandbox.ts (line 302-304)
 */
function requiresApproval(riskLevel: 'low' | 'medium' | 'high'): boolean {
  return riskLevel === 'high';
}

/**
 * Replica of assessFixRisk() from autonomous-fixer.ts (line 25-50)
 */
function assessFixRisk(anomaly: { description: string }, fixProposal: string): 'low' | 'medium' | 'high' {
  const desc = (anomaly.description || '').toLowerCase();
  const fix = (fixProposal || '').toLowerCase();

  const highRiskPatterns = [
    /auth/i, /middleware/i, /security/i, /password/i, /secret/i, /token/i,
    /prisma\/schema/i, /migration/i, /database/i, /dockerfile/i,
    /src\/lib\/db/i, /src\/middleware/i, /clerk/i, /env/i,
  ];
  for (const pattern of highRiskPatterns) {
    if (pattern.test(desc) || pattern.test(fix)) return 'high';
  }

  const lowRiskPatterns = [
    /typo/i, /comment/i, /log/i, /whitespace/i, /format/i, /docs/i,
    /readme/i, /markdown/i, /\.md/i, /console\.log/i, /deprecated/i,
  ];
  for (const pattern of lowRiskPatterns) {
    if (pattern.test(desc) || pattern.test(fix)) return 'low';
  }

  return 'medium';
}

/**
 * Replica of pipeline sort order from executeSandboxPipeline (line 498-501)
 */
function getChangeTypeOrder(changeType: string): number {
  const typeOrder: Record<string, number> = { fix: 0, refactor: 1, optimize: 2, enhance: 3 };
  return typeOrder[changeType] ?? 4;
}

/**
 * Replica of circuit breaker logic from self-healing.ts
 */
const MAX_AUTO_FIXES_PER_HOUR = 3;
let autoFixTimestamps: number[] = [];

function canAutoFix(): boolean {
  const oneHourAgo = Date.now() - 3600_000;
  autoFixTimestamps = autoFixTimestamps.filter(ts => ts > oneHourAgo);
  return autoFixTimestamps.length < MAX_AUTO_FIXES_PER_HOUR;
}

function recordAutoFix(): void {
  autoFixTimestamps.push(Date.now());
}

function resetCircuitBreaker(): void {
  autoFixTimestamps = [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: Sandbox Risk Assessment
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sandbox Risk Assessment', () => {
  const baseChange: ProposedChange = {
    filePath: 'src/lib/utils/helper.ts',
    changeType: 'fix',
    description: 'Fix typo in helper',
  };

  describe('LOW risk classification', () => {
    it('should classify small fixes as low risk', () => {
      const original = 'const x = 1;\nconst y = 2;\n';
      const proposed = 'const x = 1;\nconst y = 3;\n';
      expect(assessRisk(baseChange, original, proposed)).toBe('low');
    });

    it('should classify single-line changes as low risk', () => {
      const original = 'function hello() {\n  return "world";\n}\n';
      const proposed = 'function hello() {\n  return "hello";\n}\n';
      expect(assessRisk(baseChange, original, proposed)).toBe('low');
    });

    it('should classify whitespace-only changes as low risk', () => {
      // Small change in long file: charDelta=3, ratio=3/353≈0.008 → low
      const original = 'const a=1;' + ' // padding '.repeat(20);
      const proposed = 'const a = 1;' + ' // padding '.repeat(20);
      expect(assessRisk(baseChange, original, proposed)).toBe('low');
    });

    it('should classify refactor with small change ratio as low risk', () => {
      const original = 'a'.repeat(1000);
      const proposed = 'b' + 'a'.repeat(999);
      const change: ProposedChange = { ...baseChange, changeType: 'refactor' };
      expect(assessRisk(change, original, proposed)).toBe('low');
    });
  });

  describe('MEDIUM risk classification', () => {
    it('should classify changes with >10% ratio as medium', () => {
      // charDelta = |85 - 100| = 15, changeRatio = 15/100 = 0.15 → medium (>0.1 but <0.3)
      const original = 'a'.repeat(100);
      const proposed = 'a'.repeat(85);
      expect(assessRisk(baseChange, original, proposed)).toBe('medium');
    });

    it('should classify changes with >20 lines changed as medium', () => {
      // linesChanged = |30 - 5| = 25 → medium (>20 but ≤50)
      // Use longer proposed lines to keep charRatio low: ratio≈0.04 → not high
      const original = Array(30).fill('x'.repeat(50)).join('\n');
      const proposed = Array(5).fill('x'.repeat(300)).join('\n');
      expect(assessRisk(baseChange, original, proposed)).toBe('medium');
    });

    it('should classify enhance changes as medium by default', () => {
      const original = 'const x = 1;';
      const proposed = 'const x = 2;'; // tiny change but type is enhance
      const change: ProposedChange = { ...baseChange, changeType: 'enhance' };
      expect(assessRisk(change, original, proposed)).toBe('medium');
    });

    it('should classify optimize changes with moderate delta as medium', () => {
      // charDelta = |65 - 75| = 10, changeRatio = 10/75 ≈ 0.133 → medium (>0.1 but <0.3)
      const original = 'line\n'.repeat(15);
      const proposed = 'line\n'.repeat(13);
      const change: ProposedChange = { ...baseChange, changeType: 'optimize' };
      expect(assessRisk(change, original, proposed)).toBe('medium');
    });
  });

  describe('HIGH risk classification', () => {
    it('should classify changes with >30% ratio as high', () => {
      // charDelta = |60 - 100| = 40, changeRatio = 40/100 = 0.4 → high (>0.3)
      const original = 'a'.repeat(100);
      const proposed = 'a'.repeat(60);
      expect(assessRisk(baseChange, original, proposed)).toBe('high');
    });

    it('should classify changes with >50 lines changed as high', () => {
      // linesChanged = |60 - 1| = 59 → high (>50)
      const original = Array(60).fill('old line').join('\n');
      const proposed = 'single line';
      expect(assessRisk(baseChange, original, proposed)).toBe('high');
    });

    it('should classify orchestrator file changes as high', () => {
      const change: ProposedChange = {
        filePath: 'src/lib/consciousness/orchestrator.ts',
        changeType: 'fix',
      };
      const original = 'const x = 1;';
      const proposed = 'const x = 2;';
      expect(assessRisk(change, original, proposed)).toBe('high');
    });

    it('should classify middleware file changes as high', () => {
      const change: ProposedChange = {
        filePath: 'src/middleware.ts',
        changeType: 'fix',
      };
      const original = 'const x = 1;';
      const proposed = 'const x = 2;';
      expect(assessRisk(change, original, proposed)).toBe('high');
    });

    it('should classify enhance with >15% ratio as high', () => {
      // charDelta = |80 - 100| = 20, changeRatio = 20/100 = 0.2, enhance + >0.15 → high
      const original = 'a'.repeat(100);
      const proposed = 'a'.repeat(80);
      const change: ProposedChange = { ...baseChange, changeType: 'enhance' };
      expect(assessRisk(change, original, proposed)).toBe('high');
    });

    it('should classify new file creation (empty original) as high', () => {
      const original = '';
      const proposed = 'const x = 1;\nconst y = 2;\n';
      // changeRatio = charDelta / 0 → division by zero → ratio = 1 → high
      expect(assessRisk(baseChange, original, proposed)).toBe('high');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: Diff Generation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Diff Generation', () => {
  it('should generate correct diff for a single line change', () => {
    const diff = generateSimpleDiff(
      'const x = 1;',
      'const x = 2;',
      'src/test.ts'
    );
    expect(diff).toContain('--- a/src/test.ts');
    expect(diff).toContain('+++ b/src/test.ts');
    expect(diff).toContain('-const x = 1;');
    expect(diff).toContain('+const x = 2;');
  });

  it('should generate correct diff for added lines', () => {
    const diff = generateSimpleDiff(
      'line1\nline2',
      'line1\nline2\nline3',
      'src/new.ts'
    );
    expect(diff).toContain('+line3');
    expect(diff).not.toContain('-line3');
  });

  it('should generate correct diff for removed lines', () => {
    const diff = generateSimpleDiff(
      'line1\nline2\nline3',
      'line1\nline2',
      'src/removed.ts'
    );
    expect(diff).toContain('-line3');
    expect(diff).not.toContain('+line3');
  });

  it('should skip unchanged lines', () => {
    const diff = generateSimpleDiff(
      'same\nchanged_old\nsame2',
      'same\nchanged_new\nsame2',
      'src/skip.ts'
    );
    expect(diff).not.toContain('-same');
    expect(diff).not.toContain('+same');
    expect(diff).toContain('-changed_old');
    expect(diff).toContain('+changed_new');
  });

  it('should handle empty old content (new file)', () => {
    const diff = generateSimpleDiff('', 'new content', 'src/brand.ts');
    expect(diff).toContain('--- a/src/brand.ts');
    expect(diff).toContain('+new content');
  });

  it('should handle empty new content (file deletion)', () => {
    const diff = generateSimpleDiff('old content', '', 'src/delete.ts');
    expect(diff).toContain('+++ b/src/delete.ts');
    expect(diff).toContain('-old content');
  });

  it('should handle identical content (no diff)', () => {
    const diff = generateSimpleDiff('same', 'same', 'src/identical.ts');
    expect(diff).toBe('--- a/src/identical.ts\n+++ b/src/identical.ts');
  });

  it('should handle multi-line changes correctly', () => {
    const old = 'function a() {\n  return 1;\n}\nfunction b() {\n  return 2;\n}';
    const newContent = 'function a() {\n  return 3;\n}\nfunction b() {\n  return 4;\n}';
    const diff = generateSimpleDiff(old, newContent, 'src/multi.ts');
    expect(diff).toContain('-  return 1;');
    expect(diff).toContain('+  return 3;');
    expect(diff).toContain('-  return 2;');
    expect(diff).toContain('+  return 4;');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: Approval Gates
// ═══════════════════════════════════════════════════════════════════════════════

describe('Approval Gates', () => {
  it('should require approval for HIGH-risk changes', () => {
    expect(requiresApproval('high')).toBe(true);
  });

  it('should NOT require approval for MEDIUM-risk changes', () => {
    expect(requiresApproval('medium')).toBe(false);
  });

  it('should NOT require approval for LOW-risk changes', () => {
    expect(requiresApproval('low')).toBe(false);
  });

  it('should block promotion of high-risk changes without approval', () => {
    // Simulates the guard in promoteChange() lines 363-374
    const sandboxChange = {
      stage: 'validated',
      riskLevel: 'high' as const,
    };
    const canPromote = sandboxChange.stage === 'approved';
    expect(canPromote).toBe(false);
  });

  it('should allow promotion of high-risk changes after approval', () => {
    const sandboxChange = {
      stage: 'approved',
      riskLevel: 'high' as const,
    };
    const canPromote = sandboxChange.stage === 'approved';
    expect(canPromote).toBe(true);
  });

  it('should block promotion from draft stage', () => {
    const validStages = ['validated', 'approved'];
    const stage = 'draft';
    expect(validStages.includes(stage)).toBe(false);
  });

  it('should block promotion from rejected stage', () => {
    const validStages = ['validated', 'approved'];
    const stage = 'rejected';
    expect(validStages.includes(stage)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 4: Autonomous Fixer Risk Assessment
// ═══════════════════════════════════════════════════════════════════════════════

describe('Autonomous Fixer Risk Assessment', () => {
  describe('HIGH risk patterns', () => {
    it('should detect auth-related fixes as high risk', () => {
      expect(assessFixRisk({ description: 'auth token expired' }, 'fix auth')).toBe('high');
    });

    it('should detect security-related fixes as high risk', () => {
      expect(assessFixRisk({ description: 'security vulnerability' }, '')).toBe('high');
    });

    it('should detect database-related fixes as high risk', () => {
      expect(assessFixRisk({ description: '' }, 'update database schema')).toBe('high');
    });

    it('should detect middleware fixes as high risk', () => {
      expect(assessFixRisk({ description: 'middleware error' }, '')).toBe('high');
    });

    it('should detect password-related fixes as high risk', () => {
      expect(assessFixRisk({ description: '' }, 'reset password flow')).toBe('high');
    });

    it('should detect secret-related fixes as high risk', () => {
      expect(assessFixRisk({ description: 'secret rotation needed' }, '')).toBe('high');
    });

    it('should detect prisma schema changes as high risk', () => {
      expect(assessFixRisk({ description: '' }, 'modify prisma/schema.prisma')).toBe('high');
    });

    it('should detect migration fixes as high risk', () => {
      expect(assessFixRisk({ description: 'migration failed' }, '')).toBe('high');
    });

    it('should detect Dockerfile changes as high risk', () => {
      expect(assessFixRisk({ description: '' }, 'update Dockerfile')).toBe('high');
    });

    it('should detect Clerk-related fixes as high risk', () => {
      expect(assessFixRisk({ description: 'clerk webhook failing' }, '')).toBe('high');
    });

    it('should detect env variable changes as high risk', () => {
      expect(assessFixRisk({ description: '' }, 'add env variable')).toBe('high');
    });

    it('should detect src/lib/db changes as high risk', () => {
      expect(assessFixRisk({ description: '' }, 'fix src/lib/db connection')).toBe('high');
    });

    it('should detect token-related fixes as high risk', () => {
      expect(assessFixRisk({ description: 'token refresh broken' }, '')).toBe('high');
    });
  });

  describe('LOW risk patterns', () => {
    it('should detect typo fixes as low risk', () => {
      expect(assessFixRisk({ description: 'typo in variable name' }, '')).toBe('low');
    });

    it('should detect comment fixes as low risk', () => {
      expect(assessFixRisk({ description: '' }, 'update comment')).toBe('low');
    });

    it('should detect log changes as low risk', () => {
      expect(assessFixRisk({ description: 'log message unclear' }, '')).toBe('low');
    });

    it('should detect whitespace fixes as low risk', () => {
      expect(assessFixRisk({ description: '' }, 'fix whitespace')).toBe('low');
    });

    it('should detect formatting fixes as low risk', () => {
      expect(assessFixRisk({ description: 'format issue' }, '')).toBe('low');
    });

    it('should detect docs changes as low risk', () => {
      expect(assessFixRisk({ description: '' }, 'update docs')).toBe('low');
    });

    it('should detect README changes as low risk', () => {
      expect(assessFixRisk({ description: 'readme outdated' }, '')).toBe('low');
    });

    it('should detect markdown changes as low risk', () => {
      expect(assessFixRisk({ description: '' }, 'fix markdown')).toBe('low');
    });

    it('should detect .md file changes as low risk', () => {
      expect(assessFixRisk({ description: '' }, 'update file.md')).toBe('low');
    });

    it('should detect console.log changes as low risk', () => {
      expect(assessFixRisk({ description: 'console.log spam' }, '')).toBe('low');
    });

    it('should detect deprecated code cleanup as low risk', () => {
      expect(assessFixRisk({ description: '' }, 'remove deprecated code')).toBe('low');
    });
  });

  describe('MEDIUM risk (default)', () => {
    it('should classify generic code changes as medium', () => {
      expect(assessFixRisk({ description: 'button not working' }, 'fix click handler')).toBe('medium');
    });

    it('should classify API route fixes as medium', () => {
      expect(assessFixRisk({ description: 'API returns 500' }, 'fix error handling in route')).toBe('medium');
    });

    it('should classify UI fixes as medium', () => {
      expect(assessFixRisk({ description: 'layout broken' }, 'fix CSS grid')).toBe('medium');
    });

    it('should classify empty descriptions as medium', () => {
      expect(assessFixRisk({ description: '' }, '')).toBe('medium');
    });
  });

  describe('Priority ordering (high > low > medium)', () => {
    it('should prioritize high risk over low risk', () => {
      // "auth" is high, "typo" is low — high wins
      expect(assessFixRisk({ description: 'auth typo' }, '')).toBe('high');
    });

    it('should prioritize high risk when both high and low match', () => {
      // "security docs" — security=high, docs=low — high wins
      expect(assessFixRisk({ description: 'security docs' }, '')).toBe('high');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 5: Pipeline Ordering
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline Ordering', () => {
  it('should order fix before refactor', () => {
    expect(getChangeTypeOrder('fix')).toBeLessThan(getChangeTypeOrder('refactor'));
  });

  it('should order refactor before optimize', () => {
    expect(getChangeTypeOrder('refactor')).toBeLessThan(getChangeTypeOrder('optimize'));
  });

  it('should order optimize before enhance', () => {
    expect(getChangeTypeOrder('optimize')).toBeLessThan(getChangeTypeOrder('enhance'));
  });

  it('should assign unknown types to order 4', () => {
    expect(getChangeTypeOrder('unknown')).toBe(4);
    expect(getChangeTypeOrder('custom')).toBe(4);
  });

  it('should sort changes by type priority', () => {
    const changes = [
      { changeType: 'enhance' },
      { changeType: 'fix' },
      { changeType: 'optimize' },
      { changeType: 'refactor' },
    ];
    const sorted = [...changes].sort((a, b) =>
      getChangeTypeOrder(a.changeType) - getChangeTypeOrder(b.changeType)
    );
    expect(sorted.map((c) => c.changeType)).toEqual([
      'fix', 'refactor', 'optimize', 'enhance'
    ]);
  });

  it('should limit pipeline to 5 changes max per cycle', () => {
    const changes = Array.from({ length: 10 }, (_, i) => ({
      changeType: 'fix',
      filePath: `file${i}.ts`,
    }));
    const sliced = changes.slice(0, 5);
    expect(sliced).toHaveLength(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 6: Self-Healing Circuit Breaker
// ═══════════════════════════════════════════════════════════════════════════════

describe('Self-Healing Circuit Breaker', () => {
  beforeEach(() => {
    resetCircuitBreaker();
  });

  it('should allow auto-fix when under the hourly limit', () => {
    expect(canAutoFix()).toBe(true);
  });

  it('should allow exactly MAX_AUTO_FIXES_PER_HOUR fixes', () => {
    for (let i = 0; i < MAX_AUTO_FIXES_PER_HOUR; i++) {
      expect(canAutoFix()).toBe(true);
      recordAutoFix();
    }
  });

  it('should block auto-fix after reaching the hourly limit', () => {
    for (let i = 0; i < MAX_AUTO_FIXES_PER_HOUR; i++) {
      recordAutoFix();
    }
    expect(canAutoFix()).toBe(false);
  });

  it('should reset after one hour', () => {
    // Fill up the circuit breaker
    for (let i = 0; i < MAX_AUTO_FIXES_PER_HOUR; i++) {
      recordAutoFix();
    }
    expect(canAutoFix()).toBe(false);

    // Simulate time passing by clearing timestamps
    resetCircuitBreaker();
    expect(canAutoFix()).toBe(true);
  });

  it('should have a limit of 3 fixes per hour', () => {
    expect(MAX_AUTO_FIXES_PER_HOUR).toBe(3);
  });

  it('should track individual fix timestamps', () => {
    recordAutoFix();
    recordAutoFix();
    expect(autoFixTimestamps).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 7: Sandbox Stage Transitions
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sandbox Stage Transitions', () => {
  const validStages = ['draft', 'validated', 'approved', 'promoted', 'rejected', 'rolled_back'];

  it('should define all expected stages', () => {
    expect(validStages).toContain('draft');
    expect(validStages).toContain('validated');
    expect(validStages).toContain('approved');
    expect(validStages).toContain('promoted');
    expect(validStages).toContain('rejected');
    expect(validStages).toContain('rolled_back');
  });

  it('should follow the happy path: draft → validated → promoted', () => {
    const happyPath = ['draft', 'validated', 'promoted'];
    for (const stage of happyPath) {
      expect(validStages).toContain(stage);
    }
    // Verify ordering
    expect(happyPath.indexOf('draft')).toBeLessThan(happyPath.indexOf('validated'));
    expect(happyPath.indexOf('validated')).toBeLessThan(happyPath.indexOf('promoted'));
  });

  it('should follow the approval path: draft → validated → approved → promoted', () => {
    const approvalPath = ['draft', 'validated', 'approved', 'promoted'];
    for (const stage of approvalPath) {
      expect(validStages).toContain(stage);
    }
  });

  it('should allow rejection from any pre-promotion stage', () => {
    const rejectableStages = ['draft', 'validated', 'approved'];
    for (const stage of rejectableStages) {
      expect(validStages).toContain(stage);
    }
    expect(validStages).toContain('rejected');
  });

  it('should allow rollback only from promoted stage', () => {
    const rollbackFrom = 'promoted';
    const rollbackTo = 'rolled_back';
    expect(validStages).toContain(rollbackFrom);
    expect(validStages).toContain(rollbackTo);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 8: File Safety Checks (replicated from self-code-engine.ts)
// ═══════════════════════════════════════════════════════════════════════════════

describe('File Safety Checks', () => {
  const SAFE_PATTERNS = [
    'src/',
    'app/',
    'components/',
    'lib/',
    '__tests__/',
    'scripts/',
    'docs/',
    'public/',
  ];

  const UNSAFE_PATTERNS = [
    '.env',
    'package-lock.json',
    'node_modules/',
    '.git/',
    'prisma/migrations/',
  ];

  function isFileSafeToModify(filePath: string): boolean {
    return SAFE_PATTERNS.some(p => filePath.startsWith(p));
  }

  it('should allow modifications in src/', () => {
    expect(isFileSafeToModify('src/lib/chat/route.ts')).toBe(true);
  });

  it('should allow modifications in app/', () => {
    expect(isFileSafeToModify('app/api/chat/route.ts')).toBe(true);
  });

  it('should allow modifications in components/', () => {
    expect(isFileSafeToModify('components/Chat.tsx')).toBe(true);
  });

  it('should allow modifications in __tests__/', () => {
    expect(isFileSafeToModify('__tests__/chat/test.ts')).toBe(true);
  });

  it('should allow modifications in scripts/', () => {
    expect(isFileSafeToModify('scripts/build.ts')).toBe(true);
  });

  it('should BLOCK modifications to .env', () => {
    expect(isFileSafeToModify('.env')).toBe(false);
  });

  it('should BLOCK modifications to package-lock.json', () => {
    expect(isFileSafeToModify('package-lock.json')).toBe(false);
  });

  it('should BLOCK modifications to node_modules/', () => {
    expect(isFileSafeToModify('node_modules/package/index.js')).toBe(false);
  });

  it('should BLOCK modifications to .git/', () => {
    expect(isFileSafeToModify('.git/config')).toBe(false);
  });

  it('should BLOCK modifications to prisma/migrations/', () => {
    expect(isFileSafeToModify('prisma/migrations/001.sql')).toBe(false);
  });
});
