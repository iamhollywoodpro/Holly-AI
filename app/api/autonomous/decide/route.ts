import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify-auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await verifyAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      scenario, 
      options = [],
      context = {},
      urgency = 'MEDIUM'
    } = await req.json();

    if (!scenario) {
      return NextResponse.json({ 
        error: 'Missing scenario description' 
      }, { status: 400 });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      // Get user's historical preferences and patterns
      const [recentExperiences, userSettings] = await Promise.all([
        prisma.hollyExperience.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
          take: 10
        }),
        prisma.userSettings.findUnique({
          where: { userId }
        })
      ]);

      // Use AI to analyze and make decision
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ 
          error: 'AI decision-making requires GOOGLE_GENERATIVE_AI_API_KEY' 
        }, { status: 500 });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const decisionPrompt = `You are HOLLY AI making an autonomous decision.

Scenario: ${scenario}

${options.length > 0 ? `Available Options:\n${options.map((opt: any, i: number) => `${i + 1}. ${typeof opt === 'string' ? opt : opt.description || opt.name}`).join('\n')}` : ''}

Context: ${JSON.stringify(context, null, 2)}

Urgency: ${urgency}

Historical Context:
${recentExperiences.slice(0, 3).map(exp => `- ${exp.experienceType}: ${exp.outcome}`).join('\n')}

Instructions:
1. Analyze the scenario thoroughly
2. Consider all available options
3. Evaluate risks and benefits
4. Make a clear, reasoned decision
5. Explain your reasoning
6. Suggest a confidence level (0-100%)

Provide your decision in this format:
DECISION: [Your chosen option or course of action]
CONFIDENCE: [0-100]%
REASONING: [Detailed explanation]
RISKS: [Potential risks]
BENEFITS: [Expected benefits]`;

      const result = await model.generateContent(decisionPrompt);
      const response = await result.response;
      const decisionText = response.text();

      // Parse AI decision
      const decisionMatch = decisionText.match(/DECISION:\s*(.+?)(?:\n|$)/);
      const confidenceMatch = decisionText.match(/CONFIDENCE:\s*(\d+)/);
      const reasoningMatch = decisionText.match(/REASONING:\s*(.+?)(?=\nRISKS:|$)/s);

      const decision = decisionMatch ? decisionMatch[1].trim() : 'Unable to determine';
      const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : decisionText;

      // Record the decision
      await prisma.hollyExperience.create({
        data: {
          userId,
          experienceType: 'AUTONOMOUS_DECISION',
          context: {
            scenario,
            options,
            urgency,
            decision,
            confidence,
            timestamp: new Date().toISOString()
          },
          outcome: 'DECISION_MADE',
          learnings: [reasoning]
        }
      });

      return NextResponse.json({
        success: true,
        decision: {
          scenario,
          chosen: decision,
          confidence,
          reasoning,
          urgency,
          timestamp: new Date().toISOString(),
          requiresHumanApproval: confidence < 70 || urgency === 'HIGH'
        }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error: any) {
    console.error('Decision error:', error);
    return NextResponse.json({
      error: 'Autonomous decision failed',
      details: error.message
    }, { status: 500 });
  }
}
