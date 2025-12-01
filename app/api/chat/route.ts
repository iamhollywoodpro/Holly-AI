// HOLLY Chat API Route - WITH CONSCIOUSNESS INTEGRATION
// Migrated to Clerk + Prisma

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getHollyResponse } from '@/lib/ai/ai-orchestrator';
import { prisma } from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/settings/default-settings';
import { getUserContext, getPersonalizedSystemPrompt } from '@/lib/memory/user-context';
// Phase 2C: Real-time Learning & Adaptation
import { PatternRecognition } from '@/lib/learning/pattern-recognition';
import { AdaptiveResponseSystem } from '@/lib/learning/adaptive-responses';
// Phase 2E: Deeper Emotional Intelligence
import { EmotionalIntelligence } from '@/lib/emotion/emotional-intelligence';
import { EmpathyEngine } from '@/lib/emotion/empathy-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  fileAttachments?: {
    name: string;
    url: string;
    type: string;
    vision?: {
      description: string;
      summary: string;
      keyElements: string[];
      model: string;
    };
  }[];
}

interface ChatRequest {
  messages: ChatMessage[];
  conversationId?: string;
  userId?: string;
}

// Helper: Get user's recent memories to inject into context
async function getRecentMemories(userId: string, limit: number = 5) {
  try {
    const memories = await prisma.hollyExperience.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return memories || [];
  } catch (error) {
    console.error('Error fetching memories:', error);
    return [];
  }
}

// Helper: Get user's active goals
async function getActiveGoals(userId: string) {
  try {
    const goals = await prisma.hollyGoal.findMany({
      where: {
        userId,
        status: 'active',
      },
      orderBy: { priority: 'desc' },
      take: 3,
    });

    return goals || [];
  } catch (error) {
    console.error('Error fetching goals:', error);
    return [];
  }
}

// Helper: Record conversation experience
async function recordConversationExperience(
  userId: string,
  userMessage: string,
  hollyResponse: string
) {
  try {
    // Determine significance based on conversation characteristics
    const significance = calculateSignificance(userMessage, hollyResponse);
    
    // Record the interaction experience
    const experience = await prisma.hollyExperience.create({
      data: {
        userId,
        type: 'interaction',
        content: {
          what: `Conversation with user`,
          context: `User: "${userMessage}"`,
          actions: ['responded'],
          outcome: hollyResponse.substring(0, 500),
          significance,
        },
        significance,
        emotionalImpact: 0.5,
        timestamp: new Date(),
      },
    });

    return experience;
  } catch (error) {
    console.error('Error recording experience:', error);
    return null;
  }
}

// Calculate significance of conversation
function calculateSignificance(userMessage: string, hollyResponse: string): number {
  let significance = 0.3; // Base significance
  
  // Longer conversations are more significant
  if (userMessage.length > 200) significance += 0.1;
  if (hollyResponse.length > 500) significance += 0.1;
  
  // Emotional keywords increase significance
  const emotionalKeywords = ['feel', 'think', 'believe', 'important', 'love', 'hate', 'amazing', 'terrible'];
  const hasEmotionalContent = emotionalKeywords.some(
    keyword => userMessage.toLowerCase().includes(keyword)
  );
  if (hasEmotionalContent) significance += 0.2;
  
  // Questions are more significant
  if (userMessage.includes('?')) significance += 0.1;
  
  // Cap at 1.0
  return Math.min(significance, 1.0);
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate with Clerk
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: clerkUserId },
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse request body
    const body: ChatRequest = await request.json();
    const { messages } = body;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get last user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return new Response(
        JSON.stringify({ error: 'Last message must be from user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get comprehensive user context for personalization
    const userContext = await getUserContext(clerkUserId);
    
    // Get context from memories and goals
    const memories = await getRecentMemories(userId, 3);
    const goals = await getActiveGoals(userId);

    // Build context string
    let contextString = '';
    
    if (memories.length > 0) {
      contextString += '\n\n[Recent Memories]:\n';
      memories.forEach(m => {
        const content = typeof m.content === 'object' && (m.content as any)?.what 
          ? (m.content as any).what 
          : String(m.content);
        contextString += `- ${content}\n`;
      });
    }

    if (goals.length > 0) {
      contextString += '\n[Active Goals]:\n';
      goals.forEach((g: any) => {
        contextString += `- ${g.description || g.title} (${Math.round((g.progress || 0) * 100)}% complete)\n`;
      });
    }

    // 👁️  VISION CONTEXT - Add image descriptions if attachments exist
    if (lastMessage.fileAttachments && lastMessage.fileAttachments.length > 0) {
      const imageAttachments = lastMessage.fileAttachments.filter(f => 
        f.type.startsWith('image/') && f.vision
      );
      
      if (imageAttachments.length > 0) {
        contextString += '\n[Attached Images - What HOLLY Sees]:\n';
        imageAttachments.forEach((img, idx) => {
          contextString += `\nImage ${idx + 1} (${img.name}):\n`;
          contextString += `  Summary: ${img.vision!.summary}\n`;
          if (img.vision!.keyElements.length > 0) {
            contextString += `  Key Elements: ${img.vision!.keyElements.join(', ')}\n`;
          }
          contextString += `  Full Description: ${img.vision!.description}\n`;
        });
      }
    }

    // Add context to user's message
    const messageWithContext = contextString
      ? `${contextString}\n\n${lastMessage.content}`
      : lastMessage.content;

    // Load user settings for AI behavior
    let userSettings = DEFAULT_SETTINGS;
    if (userId && userId !== 'anonymous') {
      const settingsRecord = await prisma.userSettings.findUnique({
        where: { userId },
      });
      if (settingsRecord) {
        userSettings = { ...DEFAULT_SETTINGS, ...settingsRecord.settings as any };
      }
    }

    // 💖 PHASE 2E: Emotional Intelligence
    let emotionalContext = null;
    let empathyResponse = null;
    if (userId && userId !== 'anonymous') {
      try {
        // Detect user's emotional state
        const emotionalIntelligence = new EmotionalIntelligence(userId);
        const detectedEmotion = await emotionalIntelligence.detectEmotion(
          lastMessage.content,
          { conversationHistory: messages }
        );
        
        // Save emotional state (non-blocking)
        emotionalIntelligence.saveEmotionalState(detectedEmotion, {
          conversationId: conversationId
        }).catch(err => console.error('[Emotion] State save failed:', err));
        
        // Generate empathy response
        const empathyEngine = new EmpathyEngine(userId);
        empathyResponse = await empathyEngine.generateEmpathyResponse(
          detectedEmotion,
          {
            messageContent: lastMessage.content,
            conversationHistory: messages
          }
        );
        
        console.log('[Emotion] Detected:', {
          emotion: detectedEmotion.primaryEmotion,
          intensity: detectedEmotion.intensity,
          empathyType: empathyResponse.type,
          confidence: detectedEmotion.confidence
        });
      } catch (error) {
        console.error('[Emotion] Detection error:', error);
      }
    }
    
    // 🧠 PHASE 2C: Real-time Learning & Adaptation
    let adaptiveContext = null;
    if (userId && userId !== 'anonymous') {
      try {
        // Analyze conversation patterns
        const patternRecognition = new PatternRecognition(userId);
        const detectedPatterns = await patternRecognition.analyzeConversation(messages);
        
        // Save detected patterns (non-blocking)
        patternRecognition.savePatterns(detectedPatterns)
          .catch(err => console.error('[Learning] Pattern save failed:', err));
        
        // Get adaptive response context
        const adaptiveSystem = new AdaptiveResponseSystem(userId);
        adaptiveContext = await adaptiveSystem.getAdaptiveContext({
          userId,
          messageContent: lastMessage.content,
          conversationHistory: messages
        });
        
        console.log('[Learning] Adaptive context:', {
          guidelines: adaptiveContext.responseGuidelines.length,
          strategies: adaptiveContext.activeStrategies.length,
          confidence: adaptiveContext.confidence
        });
      } catch (error) {
        console.error('[Learning] Adaptive context error:', error);
      }
    }
    
    // Get personalized system prompt if user context available
    let systemPromptOverride = userContext 
      ? getPersonalizedSystemPrompt(userContext)
      : undefined;
    
    // Enhance system prompt with empathy context
    if (empathyResponse) {
      const empathyInstructions = [
        `[Emotional Context]:`,
        empathyResponse.promptAddition,
        `Tone Guidelines: ${empathyResponse.toneGuidelines.join(', ')}`,
        `Include: ${empathyResponse.responseElements.join(', ')}`
      ].join('\n');
      
      systemPromptOverride = systemPromptOverride
        ? `${systemPromptOverride}\n\n${empathyInstructions}`
        : empathyInstructions;
    }
    
    // Enhance system prompt with adaptive context
    if (adaptiveContext && adaptiveContext.systemPromptAdditions.length > 0) {
      const adaptiveInstructions = adaptiveContext.systemPromptAdditions.join('\n');
      systemPromptOverride = systemPromptOverride
        ? `${systemPromptOverride}\n\n[Learned Preferences & Patterns]:\n${adaptiveInstructions}`
        : `[Learned Preferences & Patterns]:\n${adaptiveInstructions}`;
    }
    
    // Get HOLLY's response with user's AI preferences and personalized context
    const hollyResponse = await getHollyResponse(
      messageWithContext,
      messages.slice(0, -1),
      {
        responseStyle: userSettings.ai.responseStyle,
        creativity: userSettings.ai.creativity,
        contextWindow: userSettings.ai.contextWindow,
        systemPrompt: systemPromptOverride,
        userName: userContext?.firstName || user.name?.split(' ')[0] || 'there',
      }
    );

    // Record conversation experience (non-blocking)
    if (userId && userId !== 'anonymous') {
      recordConversationExperience(userId, lastMessage.content, hollyResponse.content)
        .catch(err => console.error('[Memory] Background recording failed:', err));
    }

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send the complete response
          const chunk = encoder.encode(`data: ${JSON.stringify({ content: hollyResponse.content })}\n\n`);
          controller.enqueue(chunk);
          
          // Send done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      message: 'HOLLY Chat API',
      version: '5.0 - Clerk + Prisma',
      endpoints: {
        POST: 'Send messages to HOLLY'
      }
    }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
