import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

// Use Groq (free tier) — no Gemini, no paid APIs
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

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

    if (!groq) {
      return NextResponse.json(
        { error: 'AI decision-making requires GROQ_API_KEY' },
        { status: 500 }
      );
    }

    // Get user's historical preferences and patterns
    const [recentExperiences] = await Promise.all([
      prisma.hollyExperience.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
    ]);

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

    const completion = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: decisionPrompt }],
      temperature: 0.3,
      max_tokens:  1024,
      stream:      false,
    });

    const decisionText = completion.choices[0]?.message?.content ?? '';

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
