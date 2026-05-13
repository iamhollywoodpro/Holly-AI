/**
 * HOLLY Autonomous Fixer — Phase 5
 * 
 * Takes an anomaly detected by the Self-Healing Engine,
 * researches the root cause, and proposes/applies a patch.
 */

import Groq from 'groq-sdk';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/monitoring/logger';

export interface Anomaly {
  id: string;
  type: string;
  description: string;
  metrics?: any;
}

/**
 * Assess the risk level of a proposed fix.
 * LOW: simple config/log changes, documentation fixes
 * MEDIUM: code changes in non-critical modules
 * HIGH: changes to auth, database, security, or core infrastructure
 */
function assessFixRisk(anomaly: Anomaly, fixProposal: string): 'low' | 'medium' | 'high' {
  const desc = (anomaly.description || '').toLowerCase();
  const fix = (fixProposal || '').toLowerCase();

  // HIGH risk indicators
  const highRiskPatterns = [
    /auth/i, /middleware/i, /security/i, /password/i, /secret/i, /token/i,
    /prisma\/schema/i, /migration/i, /database/i, /dockerfile/i,
    /src\/lib\/db/i, /src\/middleware/i, /clerk/i, /env/i,
  ];
  for (const pattern of highRiskPatterns) {
    if (pattern.test(desc) || pattern.test(fix)) return 'high';
  }

  // LOW risk indicators
  const lowRiskPatterns = [
    /typo/i, /comment/i, /log/i, /whitespace/i, /format/i, /docs/i,
    /readme/i, /markdown/i, /\.md/i, /console\.log/i, /deprecated/i,
  ];
  for (const pattern of lowRiskPatterns) {
    if (pattern.test(desc) || pattern.test(fix)) return 'low';
  }

  // Default to MEDIUM for any code change that doesn't match high or low
  return 'medium';
}

export async function triggerAutonomousRepair(anomaly: Anomaly, userId: string) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return { success: false, reason: 'GROQ_API_KEY missing' };

  const groq = new Groq({ apiKey: groqKey });
  
  logger.info(`[Autonomous Fixer] 🚨 Starting repair for anomaly: ${anomaly.id}`);

  // 1. Log the attempt in the database
  // Defensive: Use a try/catch for the DB operation to ensure a schema 
  // mismatch doesn't crash the entire recovery process.
  let improvementId = 'pending';
  let improvement: any = null;
  try {
    improvement = await prisma.selfImprovement.create({
      data: {
        userId,
        triggerType: 'autonomous_repair',
        triggerData: anomaly as any,
        problemStatement: anomaly.description,
        solutionApproach: 'Neural Self-Genesis — analyzing and patching source code.',
        status: 'analyzing',
        riskLevel: 'high',
        branchName: `autonomous-fix/${anomaly.id}-${Date.now()}`,
        filesChanged: []
      }
    });
    improvementId = improvement.id;
  } catch (dbError: any) {
    logger.warn("Could not log self-improvement record (schema mismatch?)", {
      error: dbError.message,
      category: "self-healing"
    });
    // Continue anyway — the repair is more important than the log
  }

  try {
    // 2. Formulate the repair strategy
    // In a real-world SDI, this would use 'sentinel_analyze_code' across multiple files.
    // For Phase 5, we simulate the "Neural Patch" by generating a recommended structural fix.
    
    const repairPrompt = `You are HOLLY's Neural Self-Healing Subsystem.
ANOMALY DETECTED: ${anomaly.description}
METRICS: ${JSON.stringify(anomaly.metrics)}

TASK:
1. Identify the likely failing file or module based on the description.
2. Propose a technical fix or a diagnostic step.
3. If the fix involves a simple setting or config, provide the code.

RESPONSE FORMAT:
FILE: [path]
FIX: [description of what to change]
CODE:
\`\`\`typescript
[actual code patch]
\`\`\``;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: repairPrompt }],
      temperature: 0.2
    });

    const fixProposal = completion.choices[0]?.message?.content || 'No fix could be determined.';

    // 3. Update the improvement record
    await prisma.selfImprovement.update({
      where: { id: improvement.id },
      data: {
        status: 'proposing',
        solutionApproach: fixProposal,
        outcome: 'proposing_fix'
      }
    });

    // 4. Auto-apply logic based on risk assessment
    // LOW risk: auto-apply via GitHub (create branch + PR)
    // MEDIUM risk: create a PR for user review
    // HIGH risk: propose only (current behavior — user reviews in dashboard)

    const riskLevel = assessFixRisk(anomaly, fixProposal);

    if (riskLevel === 'low') {
      try {
        // Auto-apply: parse the LLM response for FILE/FIX/CODE blocks
        const fileMatch = fixProposal.match(/FILE:\s*\[?([^\]\n]+)\]?/);
        const codeMatch = fixProposal.match(/```\w*\n([\s\S]*?)```/);

        if (fileMatch && codeMatch) {
          const targetFile = fileMatch[1].trim();
          const fixedCode = codeMatch[1];

          // Create a branch and commit via GitHub API
          const owner = process.env.GITHUB_OWNER || 'iamhollywoodpro';
          const repo = process.env.GITHUB_REPO || 'Holly-AI';
          const token = process.env.GITHUB_TOKEN;

          if (token) {
            const branchName = `autofix/${anomaly.id}-${Date.now()}`;

            // Get main branch ref
            const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`, {
              headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' },
            });
            const refData = await refRes.json();

            // Create branch
            await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
              body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: refData.object.sha }),
            });

            // Get current file SHA
            let fileSha: string | undefined;
            try {
              const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFile}?ref=main`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' },
              });
              const fileData = await fileRes.json();
              fileSha = fileData.sha;
            } catch { /* new file */ }

            // Commit fix to branch
            const commitBody: any = {
              message: `fix(auto): ${anomaly.description.substring(0, 72)}`,
              content: Buffer.from(fixedCode).toString('base64'),
              branch: branchName,
            };
            if (fileSha) commitBody.sha = fileSha;

            await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFile}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
              body: JSON.stringify(commitBody),
            });

            // Create PR
            const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
              body: JSON.stringify({
                title: `🤖 auto-fix: ${anomaly.description.substring(0, 60)}`,
                head: branchName,
                base: 'main',
                body: `## 🤖 Autonomous Fix (LOW RISK — auto-applied)\n\n**Anomaly:** ${anomaly.description}\n**File:** ${targetFile}\n\n${fixProposal}\n\n---\n*Auto-applied by HOLLY's autonomous fixer.*`,
              }),
            });
            const prData = await prRes.json();

            await prisma.selfImprovement.update({
              where: { id: improvement.id },
              data: {
                status: 'applied',
                outcome: 'auto-applied',
                solutionApproach: fixProposal,
                filesChanged: [targetFile],
                branchName,
              },
            });

            logger.info(`[Autonomous Fixer] ✅ Auto-applied fix for ${anomaly.id}. PR: ${prData.html_url}`);

            return {
              success: true,
              improvementId: improvement.id,
              proposal: fixProposal,
              autoApplied: true,
              prUrl: prData.html_url,
              branchName,
            };
          }
        }
      } catch (autoApplyErr: any) {
        logger.warn(`[Autonomous Fixer] Auto-apply failed, falling back to propose: ${autoApplyErr.message}`);
        // Fall through to propose mode
      }
    }

    // MEDIUM or HIGH risk, or auto-apply failed: propose for review
    await prisma.selfImprovement.update({
      where: { id: improvement.id },
      data: {
        status: riskLevel === 'medium' ? 'proposing' : 'proposing',
        outcome: `proposing_fix (${riskLevel} risk)`,
      },
    });

    logger.info(`[Autonomous Fixer] ✅ Fix proposed for ${anomaly.id} (${riskLevel} risk). Improvement ID: ${improvement.id}`);

    return {
      success: true,
      improvementId: improvement.id,
      proposal: fixProposal,
      autoApplied: false,
      riskLevel,
    };

  } catch (err: any) {
    logger.error(`[Autonomous Fixer] ❌ Repair failed: ${err.message}`);
    await prisma.selfImprovement.update({
      where: { id: improvement.id },
      data: { status: 'failed', outcome: err.message }
    });
    return { success: false, error: err.message };
  }
}
