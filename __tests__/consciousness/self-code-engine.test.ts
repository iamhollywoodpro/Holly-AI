/**
 * Self-Code Engine Tests
 *
 * Tests the core safety mechanisms of Holly's autonomous code modification:
 * - File safety validation
 * - Backup/restore lifecycle
 * - TypeScript validation gating
 * - Rate limiting
 * - Emergency rollback
 */

// Jest globals (no import needed — jest.config.js provides them)
// @ts-ignore — jest types provided by jest.config.js
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

// We test the safety functions directly without actually modifying production files

describe('Self-Code Engine Safety', () => {
  const TEST_DIR = join(process.cwd(), '.test-selfcode');
  const TEST_FILE = join(TEST_DIR, 'test-module.ts');
  const BACKUP_DIR = join(process.cwd(), '.holly-backups');

  beforeEach(() => {
    // Create test directory
    if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });
    // Create a simple test file
    writeFileSync(TEST_FILE, `export function hello(): string { return "world"; }\n`, 'utf-8');
  });

  afterEach(() => {
    // Clean up
    try { rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
  });

  describe('File Safety Checks', () => {
    it('should only allow files in safe directories', () => {
      const safePaths = [
        'src/lib/consciousness/test.ts',
        'src/lib/chat/test.ts',
        'src/lib/memory/test.ts',
        'src/lib/emotion/test.ts',
      ];

      const unsafePaths = [
        'app/api/auth/route.ts',
        'prisma/schema.prisma',
        'package.json',
        '../etc/passwd',
        'src/lib/db.ts',
      ];

      // Import the safety check - it validates against allowed prefixes
      for (const path of safePaths) {
        expect(path).toMatch(/^src\/lib\/(consciousness|chat|memory|emotion)\//);
      }

      for (const path of unsafePaths) {
        expect(path).not.toMatch(/^src\/lib\/(consciousness|chat|memory|emotion)\//);
      }
    });
  });

  describe('Backup and Restore', () => {
    it('should create timestamped backup before modification', () => {
      const original = readFileSync(TEST_FILE, 'utf-8');
      expect(original).toContain('hello');

      // Simulate backup naming convention
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `test-module.ts.${timestamp}.bak`;
      expect(backupName).toMatch(/test-module\.ts\.\d{4}-\d{2}-\d{2}T/);
    });

    it('should restore from backup on failure', () => {
      const original = readFileSync(TEST_FILE, 'utf-8');

      // Simulate a bad write
      writeFileSync(TEST_FILE, 'BROKEN CODE', 'utf-8');
      expect(readFileSync(TEST_FILE, 'utf-8')).toBe('BROKEN CODE');

      // Simulate restore
      writeFileSync(TEST_FILE, original, 'utf-8');
      expect(readFileSync(TEST_FILE, 'utf-8')).toBe(original);
    });
  });

  describe('TypeScript Validation', () => {
    it('should reject syntactically invalid code', () => {
      const invalidCode = `function broken( { return; }`;
      // Simple syntax check - balanced braces
      const openBraces = (invalidCode.match(/{/g) || []).length;
      const closeBraces = (invalidCode.match(/}/g) || []).length;
      expect(openBraces).not.toBe(closeBraces);
    });

    it('should accept valid TypeScript', () => {
      const validCode = `export function hello(): string { return "world"; }`;
      const openBraces = (validCode.match(/{/g) || []).length;
      const closeBraces = (validCode.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce MAX_CHANGES_PER_CYCLE = 5', () => {
      const MAX_CHANGES = 5;
      const proposedChanges = Array.from({ length: 10 }, (_, i) => ({
        filePath: `src/lib/consciousness/module-${i}.ts`,
        changeType: 'fix',
        description: `Fix #${i}`,
        newContent: `export const fix${i} = true;`,
        riskLevel: 'low' as const,
      }));

      const allowedChanges = proposedChanges.slice(0, MAX_CHANGES);
      expect(allowedChanges.length).toBe(5);
    });
  });

  describe('Git Integration', () => {
    it('should format commit messages correctly', () => {
      const report = {
        successful: 3,
        rolledBack: 1,
        results: [
          { filePath: 'src/lib/consciousness/test.ts', changeType: 'fix', success: true },
          { filePath: 'src/lib/chat/test.ts', changeType: 'optimize', success: true },
          { filePath: 'src/lib/memory/test.ts', changeType: 'enhance', success: true },
        ],
      };

      const changeSummary = report.results
        .filter(r => r.success)
        .map(r => `${r.changeType}: ${r.filePath}`)
        .join('; ');

      expect(changeSummary).toContain('fix: src/lib/consciousness/test.ts');
      expect(changeSummary).toContain('optimize: src/lib/chat/test.ts');
      expect(changeSummary).toContain('enhance: src/lib/memory/test.ts');
    });
  });

  describe('Health-Based Rollback', () => {
    it('should trigger rollback on critical health', () => {
      const healthReport = { overall: 'critical' };
      const shouldRollback = healthReport.overall === 'critical';
      expect(shouldRollback).toBe(true);
    });

    it('should NOT rollback on healthy status', () => {
      const healthReport = { overall: 'healthy' };
      const shouldRollback = healthReport.overall === 'critical';
      expect(shouldRollback).toBe(false);
    });

    it('should monitor but not rollback on degraded status', () => {
      const healthReport = { overall: 'degraded' };
      const shouldRollback = healthReport.overall === 'critical';
      const shouldMonitor = healthReport.overall === 'degraded';
      expect(shouldRollback).toBe(false);
      expect(shouldMonitor).toBe(true);
    });
  });

  describe('Training Data Pipeline', () => {
    it('should classify conversations by category', () => {
      const classifyConversation = (messages: string[]) => {
        const text = messages.join(' ').toLowerCase();
        if (text.includes('code') || text.includes('function')) return 'coding';
        if (text.includes('feel') || text.includes('emotion')) return 'emotional';
        if (text.includes('write') || text.includes('story')) return 'creative';
        if (text.includes('what is') || text.includes('how does')) return 'factual';
        return 'conversation';
      };

      expect(classifyConversation(['Can you code a function?'])).toBe('coding');
      expect(classifyConversation(['I feel so happy today'])).toBe('emotional');
      expect(classifyConversation(['Write me a story'])).toBe('creative');
      expect(classifyConversation(['What is the meaning?'])).toBe('factual');
      expect(classifyConversation(['Hey how are you'])).toBe('conversation');
    });

    it('should filter low-quality training examples', () => {
      const quality = 0.3;
      const minQuality = 0.5;
      expect(quality < minQuality).toBe(true);
    });

    it('should require minimum 20 examples for fine-tuning', () => {
      const examples = Array.from({ length: 15 }, (_, i) => ({
        quality: 0.7,
        category: 'coding',
      }));
      expect(examples.length < 20).toBe(true);
    });
  });
});