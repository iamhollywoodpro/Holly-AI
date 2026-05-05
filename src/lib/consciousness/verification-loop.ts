/**
 * HOLLY Automated Verification Loop — Phase 4.4
 *
 * After Steve approves a proposal and HOLLY applies changes:
 * 1. Run TypeScript check (tsc --noEmit)
 * 2. Run build (next build)
 * 3. Run tests (npm test)
 * 4. If any fail → auto-revert + notify Steve
 * 5. If all pass → mark as verified
 *
 * Integrates with rollback-manager.ts for safe reverts.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@/lib/db';
import { logImprovementAction } from '@/lib/consciousness/auto-improvement-loop';

const execAsync = promisify(exec);

export interface VerificationResult {
  proposalId: string;
  passed: boolean;
  checks: {
    typescript: { passed: boolean; output: string };
    build: { passed: boolean; output: string };
    tests: { passed: boolean; output: string };
  };
  reverted: boolean;
  timestamp: Date;
}

/**
 * Run full verification pipeline on an applied change
 */
export async function verifyAppliedChange(
  proposalId: string,
  userId: string,
): Promise<VerificationResult> {
  const result: VerificationResult = {
    proposalId,
    passed: false,
    checks: {
      typescript: { passed: false, output: '' },
      build: { passed: false, output: '' },
      tests: { passed: false, output: '' },
    },
    reverted: false,
    timestamp: new Date(),
  };

  try {
    // Step 1: TypeScript check
    console.log(`[Verification] Running TypeScript check for proposal ${proposalId}...`);
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit 2>&1', {
        cwd: process.cwd(),
        timeout: 120_000,
      });
      result.checks.typescript = {
        passed: !stderr.includes('error TS'),
        output: (stdout + stderr).substring(0, 2000),
      };
    } catch (err: any) {
      result.checks.typescript = {
        passed: false,
        output: (err.stdout || '' + err.stderr || '').substring(0, 2000),
      };
    }

    // Step 2: Build check
    console.log(`[Verification] Running build check for proposal ${proposalId}...`);
    try {
      const { stdout, stderr } = await execAsync('npm run build 2>&1', {
        cwd: process.cwd(),
        timeout: 300_000,
      });
      const buildOutput = stdout + stderr;
      result.checks.build = {
        passed: !buildOutput.includes('Build error') && !buildOutput.includes('Failed to compile'),
        output: buildOutput.substring(0, 2000),
      };
    } catch (err: any) {
      result.checks.build = {
        passed: false,
        output: (err.stdout || '' + err.stderr || '').substring(0, 2000),
      };
    }

    // Step 3: Test check
    console.log(`[Verification] Running tests for proposal ${proposalId}...`);
    try {
      const { stdout, stderr } = await execAsync('npm test -- --passWithNoTests 2>&1', {
        cwd: process.cwd(),
        timeout: 180_000,
      });
      const testOutput = stdout + stderr;
      result.checks.tests = {
        passed: !testOutput.includes('FAIL') && !testOutput.includes('failed'),
        output: testOutput.substring(0, 2000),
      };
    } catch (err: any) {
      result.checks.tests = {
        passed: false,
        output: (err.stdout || '' + err.stderr || '').substring(0, 2000),
      };
    }

    // Determine overall result
    result.passed =
      result.checks.typescript.passed &&
      result.checks.build.passed &&
      result.checks.tests.passed;

    if (result.passed) {
      // Mark as verified
      await logImprovementAction(userId, { id: proposalId } as any, 'applied');
      console.log(`[Verification] ✅ All checks passed for proposal ${proposalId}`);
    } else {
      // Auto-revert
      console.log(`[Verification] ❌ Checks failed, initiating auto-revert for ${proposalId}`);
      await autoRevert(proposalId, userId, result);
      result.reverted = true;
    }

    // Persist verification result
    await prisma.learningEvent.create({
      data: {
        type: 'verification_result',
        userId,
        data: {
          proposalId,
          passed: result.passed,
          checks: {
            typescript: result.checks.typescript.passed,
            build: result.checks.build.passed,
            tests: result.checks.tests.passed,
          },
          reverted: result.reverted,
          timestamp: result.timestamp.toISOString(),
        },
        processed: true,
      },
    }).catch(() => {});

    return result;
  } catch (err) {
    console.error('[Verification] Fatal error:', err);
    return result;
  }
}

/**
 * Auto-revert a failed change and notify Steve
 */
async function autoRevert(
  proposalId: string,
  userId: string,
  result: VerificationResult,
): Promise<void> {
  try {
    // Use git to revert the change (execAsync already available from top-level import)

    // Revert using git checkout on the specific file
    const event = await prisma.learningEvent.findUnique({ where: { id: proposalId } });
    const data = event?.data as any;
    const filePath = data?.filePath;

    if (filePath) {
      try {
        await execAsync(`git checkout HEAD -- ${filePath}`, {
          cwd: process.cwd(),
          timeout: 30_000,
        });
        console.log(`[Verification] Reverted file: ${filePath}`);
      } catch {
        console.error(`[Verification] Could not revert file: ${filePath}`);
      }
    }

    // Mark as reverted
    await logImprovementAction(userId, { id: proposalId } as any, 'rolled_back');

    // Notify Steve
    await prisma.notification.create({
      data: {
        type: 'evolution_reverted',
        title: 'Self-Improvement Auto-Reverted',
        message: `Proposal "${data?.title || proposalId}" was automatically reverted because verification failed. TypeScript: ${result.checks.typescript.passed ? '✅' : '❌'}, Build: ${result.checks.build.passed ? '✅' : '❌'}, Tests: ${result.checks.tests.passed ? '✅' : '❌'}`,
        category: 'self_improvement',
        priority: 'high',
        status: 'unread',
        userId,
        clerkUserId: '',
        actionData: {
          proposalId,
          action: 'auto_reverted',
          failedChecks: {
            typescript: !result.checks.typescript.passed,
            build: !result.checks.build.passed,
            tests: !result.checks.tests.passed,
          },
        } as any,
      },
    });
  } catch (err) {
    console.error('[Verification] Auto-revert failed:', err);
  }
}

/**
 * Quick TypeScript-only check (lightweight, for pre-flight)
 */
export async function quickTypeCheck(): Promise<boolean> {
  try {
    const { stdout, stderr } = await execAsync('npx tsc --noEmit 2>&1', {
      cwd: process.cwd(),
      timeout: 120_000,
    });
    return !stderr.includes('error TS');
  } catch {
    return false;
  }
}