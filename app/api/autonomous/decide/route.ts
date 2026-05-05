import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      scenario,
      options = [],
      context = {},
      urgency = 'MEDIUM',
    } = await req.json();

    if (!scenario) {
      return NextResponse.json({ error: 'Missing scenario description' }, { status: 400 });
    }

    // Get user's historical preferences and patterns
    const recentExperiences = await prisma.hollyExperience.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    const decisionPrompt = `You are HOLLY AI making an autonomous decision.

Scenario: ${scenario}

${options.length > 0
  ? `Available Options:\n${options.map((opt: unknown, i: number) => `${i + 1}. ${typeof opt === 'string' ? opt : (opt as { description?: string; name?: string })?.description || (opt as { name?: string })?.name}`).join('\n')}`
  : ''}

Context: ${JSON.stringify(context, null, 2)}

Urgency: ${urgency}

Historical Context:
${recentExperiences.slice(0, 3).map(exp => `- ${exp.type}: ${String(exp.content).substring(0, 50)}`).join('\n')}

Instructions:
1. Analyze the scenario thoroughly
2. Consider all available options
3. Evaluate risks and benefits
4. Make a clear, reasoned decision
5. Explain your reasoning
6. Suggest a confidence level (0-100%)

Provide your decision in this exact format:
DECISION: [Your chosen option or course of action]
CONFIDENCE: [0-100]%
REASONING: [Detailed explanation]
RISKS: [Potential risks]
BENEFITS: [Expected benefits]`;

    // Route to 'reasoning' task — NVIDIA Qwen3-235B → Groq DeepSeek-R1 → NVIDIA DeepSeek-R1 → CF Kimi
    const routeResult = smartRoute(decisionPrompt, { taskHint: 'reasoning' });
    console.log(`[Autonomous Decide] Routing via ${routeResult.taskType}: ${routeResult.reason}`);

    const { text: decisionText, model: usedModel } = await cascadeCollect(
      routeResult.waterfall,
      [{ role: 'user', content: decisionPrompt }],
      { temperature: 0.3, maxTokens: 1024 },
    );

    // Parse AI decision
    const decisionMatch   = decisionText.match(/DECISION:\s*(.+?)(?:\n|$)/);
    const confidenceMatch = decisionText.match(/CONFIDENCE:\s*(\d+)/);
    const reasoningMatch  = decisionText.match(/REASONING:[\s\S]*?(.+?)(?=\nRISKS:|$)/);

    const decision   = decisionMatch   ? decisionMatch[1].trim()   : 'Unable to determine';
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
    const reasoning  = reasoningMatch  ? reasoningMatch[1].trim()  : decisionText;

    // Record the decision
    await prisma.hollyExperience.create({
      data: {
        userId,
        type:    'AUTONOMOUS_DECISION',
        content: JSON.stringify({
          scenario, options, urgency, decision, confidence,
          model: usedModel.displayName,
          timestamp: new Date().toISOString(),
        }),
        significance:     confidence / 100,
        emotionalImpact:  0.7,
        emotionalValence: confidence > 70 ? 0.5 : 0,
        primaryEmotion:   'determined',
        lessons:          [reasoning],
        relatedConcepts:  ['decision-making', 'autonomy', scenario.substring(0, 30)],
      },
    });

    return NextResponse.json({
      success: true,
      decision: {
        scenario,
        chosen:   decision,
        confidence,
        reasoning,
        urgency,
        model:                 usedModel.displayName,
        timestamp:             new Date().toISOString(),
        requiresHumanApproval: confidence < 70 || urgency === 'HIGH',
      },
    });

  } catch (error: unknown) {
    console.error('Decision error:', error);
    return NextResponse.json(
      { error: 'Autonomous decision failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
