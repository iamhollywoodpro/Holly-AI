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

    // 4. (Optional) Auto-PR Logic
    // In this phase, we stop at "Proposing" to allow the user to review the PR in the dashboard
    // unless the anomaly is "CRITICAL".
    
    logger.info(`[Autonomous Fixer] ✅ Fix proposed for ${anomaly.id}. Improvement ID: ${improvement.id}`);
    
    return { 
      success: true, 
      improvementId: improvement.id, 
      proposal: fixProposal 
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
