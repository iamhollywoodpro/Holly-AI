/**
 * HOLLY Autonomous Fixer — V3.5 (2026-06-30)
 *
 * Takes an anomaly detected by the Self-Healing Engine, generates a fix
 * proposal via the consolidated cascade, and routes it through the
 * self-code-sandbox for validation BEFORE any code touches production.
 *
 * Previously (Phase 5): bypassed the safety stack — went straight from
 * Groq LLM output to GitHub PR with zero validation. An LLM hallucination
 * could ship broken code straight to main.
 *
 * V3.5: smartRoute (coding waterfall) generates the fix → parsed into an
 * ImprovementPlan → executeSandboxPipeline validates TypeScript + build +
 * tests in an isolated .holly-sandbox/ directory → only if all checks
 * pass does the change get promoted. HIGH-risk changes require explicit
 * admin approval in the dashboard.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/monitoring/logger';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import { executeSandboxPipeline, type SandboxReport } from '@/lib/consciousness/self-code-sandbox';
import type { ImprovementPlan, ProposedChange } from '@/lib/consciousness/auto-improvement-loop';

export interface Anomaly {
  id: string;
  type: string;
  description: string;
  metrics?: any;
}

/**
 * Parse the LLM's structured fix response into actionable pieces.
 * Expects format:
 *   FILE: [path]
 *   FIX: [description]
 *   CODE:
 *   ```typescript
 *   [code]
 *   ```
 */
function parseFixProposal(fixProposal: string): { filePath: string; description: string; newContent: string } | null {
  const fileMatch = fixProposal.match(/FILE:\s*\[?([^\]\n]+)\]?/);
  const descMatch = fixProposal.match(/FIX:\s*\[?([^\]\n]+)\]?/);
  const codeMatch = fixProposal.match(/```\w*\n([\s\S]*?)```/);

  if (!fileMatch || !codeMatch) return null;

  return {
    filePath: fileMatch[1].trim(),
    description: descMatch?.[1]?.trim() ?? 'Autonomous fix from anomaly',
    newContent: codeMatch[1],
  };
}

/**
 * Assess the risk level of a proposed fix.
 * LOW: simple config/log changes, documentation fixes
 * MEDIUM: code changes in non-critical modules
 * HIGH: changes to auth, database, security, or core infrastructure
 */
function assessFixRisk(anomaly: Anomaly, filePath: string, description: string): 'low' | 'medium' | 'high' {
  const desc = (anomaly.description + ' ' + description).toLowerCase();
  const path = (filePath || '').toLowerCase();

  // HIGH risk indicators
  const highRiskPatterns = [
    /auth/i, /middleware/i, /security/i, /password/i, /secret/i, /token/i,
    /prisma\/schema/i, /migration/i, /database/i, /dockerfile/i,
    /src\/lib\/db/i, /src\/middleware/i, /clerk/i, /env/i,
  ];
  for (const pattern of highRiskPatterns) {
    if (pattern.test(desc) || pattern.test(path)) return 'high';
  }

  // LOW risk indicators
  const lowRiskPatterns = [
    /typo/i, /comment/i, /log/i, /whitespace/i, /format/i, /docs/i,
    /readme/i, /markdown/i, /\.md$/i, /console\.log/i, /deprecated/i,
  ];
  for (const pattern of lowRiskPatterns) {
    if (pattern.test(desc) || pattern.test(path)) return 'low';
  }

  return 'medium';
}

export async function triggerAutonomousRepair(anomaly: Anomaly, userId: string) {
  logger.info(`[Autonomous Fixer] 🚨 Starting repair for anomaly: ${anomaly.id}`, {
    category: 'autonomous-fixer',
    anomalyId: anomaly.id,
    description: anomaly.description,
  });

  // 1. Log the attempt in the database
  let improvement: any = null;
  try {
    improvement = await prisma.selfImprovement.create({
      data: {
        userId,
        triggerType: 'autonomous_repair',
        triggerData: anomaly as any,
        problemStatement: anomaly.description,
        solutionApproach: 'V3.5 — cascade-generated fix routed through self-code-sandbox for validation.',
        status: 'analyzing',
        riskLevel: 'high',
        branchName: `autonomous-fix/${anomaly.id}-${Date.now()}`,
        filesChanged: [],
      },
    });
  } catch (dbError: any) {
    logger.warn('Could not log self-improvement record (schema mismatch?)', {
      error: dbError.message,
      category: 'autonomous-fixer',
    });
  }

  try {
    // 2. Generate fix proposal via the consolidated cascade (no direct Groq)
    const route = await smartRoute(`Autonomous fix for anomaly: ${anomaly.description}`, { taskHint: 'coding' });

    const repairPrompt = `You are HOLLY's Neural Self-Healing Subsystem.
ANOMALY DETECTED: ${anomaly.description}
METRICS: ${JSON.stringify(anomaly.metrics)}

TASK:
1. Identify the likely failing file or module based on the description.
2. Propose a technical fix or a diagnostic step.
3. If the fix involves a simple setting or config, provide the code.

RESPONSE FORMAT (strict — parser depends on this):
FILE: [relative path from repo root, e.g. src/lib/foo.ts]
FIX: [one-sentence description of what to change]
CODE:
\`\`\`typescript
[full new file content, not a diff — the complete corrected file]
\`\`\``;

    const { text: fixProposal } = await cascadeCollect(route.waterfall, [
      { role: 'system', content: repairPrompt },
      { role: 'user', content: `Anomaly: ${anomaly.id}` },
    ], { temperature: 0.2, maxTokens: 4000 });

    // 3. Parse LLM output into structured fix
    const parsed = parseFixProposal(fixProposal);
    if (!parsed) {
      // LLM didn't follow the format — store the proposal but don't apply
      if (improvement) {
        await prisma.selfImprovement.update({
          where: { id: improvement.id },
          data: {
            status: 'proposing',
            solutionApproach: fixProposal,
            outcome: 'unparseable — manual review required',
          },
        });
      }
      logger.warn(`[Autonomous Fixer] Could not parse fix proposal for ${anomaly.id} — storing for manual review`);
      return {
        success: false,
        reason: 'unparseable_proposal',
        proposal: fixProposal,
        improvementId: improvement?.id,
      };
    }

    const riskLevel = assessFixRisk(anomaly, parsed.filePath, parsed.description);

    // 4. Update the improvement record with the structured fix
    if (improvement) {
      await prisma.selfImprovement.update({
        where: { id: improvement.id },
        data: {
          status: 'proposing',
          solutionApproach: `${parsed.description}\n\nFile: ${parsed.filePath}\nRisk: ${riskLevel}`,
          outcome: `proposing_fix (${riskLevel} risk)`,
          riskLevel,
          filesChanged: [parsed.filePath],
        },
      });
    }

    // 5. V3.5 SAFETY GATE — route through the sandbox before any promotion
    // The sandbox runs TypeScript + build + tests against the proposed change
    // in an isolated .holly-sandbox/ directory. Only validated changes promote.
    // HIGH-risk changes require admin approval in the dashboard (auto-notified).
    const plan: ImprovementPlan = {
      id: `anomaly-${anomaly.id}-${Date.now()}`,
      targetFiles: [parsed.filePath],
      analysis: [],
      changes: [{
        filePath: parsed.filePath,
        changeType: 'fix',
        description: parsed.description,
        newContent: parsed.newContent,
      } as ProposedChange],
      riskAssessment: {
        overallRisk: riskLevel,
        breakingChangePossible: riskLevel === 'high',
        affectedSystems: [parsed.filePath],
        rollbackPlan: 'Git revert the promotion commit; sandbox keeps original content snapshot.',
      },
      approved: false,
    };

    logger.info(`[Autonomous Fixer] Routing fix for ${anomaly.id} through sandbox (${riskLevel} risk)`);

    let sandboxReport: SandboxReport;
    try {
      sandboxReport = await executeSandboxPipeline(plan, userId);
    } catch (sandboxErr: any) {
      logger.error(`[Autonomous Fixer] Sandbox pipeline threw for ${anomaly.id}: ${sandboxErr.message}`);
      if (improvement) {
        await prisma.selfImprovement.update({
          where: { id: improvement.id },
          data: { status: 'failed', outcome: `sandbox_threw: ${sandboxErr.message}` },
        });
      }
      return { success: false, error: `sandbox_threw: ${sandboxErr.message}`, improvementId: improvement?.id };
    }

    // 6. Map sandbox outcome to improvement record + return value
    const promoted = sandboxReport.promoted;
    const validatedNotPromoted = sandboxReport.validated - sandboxReport.promoted;
    const rejected = sandboxReport.rejected;

    if (promoted > 0) {
      if (improvement) {
        await prisma.selfImprovement.update({
          where: { id: improvement.id },
          data: {
            status: 'applied',
            outcome: `sandbox-promoted (${promoted} change${promoted === 1 ? '' : 's'}; ${validatedNotPromoted} need approval; ${rejected} rejected)`,
            deployedAt: new Date(),
          },
        });
      }
      logger.info(`[Autonomous Fixer] ✅ Sandbox-promoted fix for ${anomaly.id} (${promoted} promoted)`);
      return {
        success: true,
        improvementId: improvement?.id,
        proposal: fixProposal,
        autoApplied: true,
        sandboxReport,
        riskLevel,
      };
    }

    if (validatedNotPromoted > 0) {
      // Validated but waiting on admin approval (HIGH risk)
      if (improvement) {
        await prisma.selfImprovement.update({
          where: { id: improvement.id },
          data: {
            status: 'proposing',
            outcome: `sandbox-validated-awaiting-approval (${validatedNotPromoted} change${validatedNotPromoted === 1 ? '' : 's'})`,
          },
        });
      }
      logger.info(`[Autonomous Fixer] ⏳ Sandbox-validated but awaiting approval for ${anomaly.id}`);
      return {
        success: true,
        improvementId: improvement?.id,
        proposal: fixProposal,
        autoApplied: false,
        sandboxReport,
        riskLevel,
        reason: 'awaiting_approval',
      };
    }

    // All rejected — sandbox blocked the fix (TypeScript/build/test failed)
    if (improvement) {
      await prisma.selfImprovement.update({
        where: { id: improvement.id },
        data: {
          status: 'failed',
          outcome: `sandbox-rejected (${rejected} change${rejected === 1 ? '' : 's'} failed validation)`,
        },
      });
    }
    logger.warn(`[Autonomous Fixer] 🚫 Sandbox rejected fix for ${anomaly.id} (${rejected} rejected)`);
    return {
      success: false,
      reason: 'sandbox_rejected',
      proposal: fixProposal,
      sandboxReport,
      improvementId: improvement?.id,
    };
  } catch (err: any) {
    logger.error(`[Autonomous Fixer] ❌ Repair failed: ${err.message}`);
    if (improvement) {
      await prisma.selfImprovement.update({
        where: { id: improvement.id },
        data: { status: 'failed', outcome: err.message },
      });
    }
    return { success: false, error: err.message, improvementId: improvement?.id };
  }
}
