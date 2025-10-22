/**
 * HOLLY Main Chat API Route
 * 
 * Primary endpoint for conversational interaction with HOLLY.
 * Handles emotion detection, context management, and response generation.
 * 
 * @route POST /api/chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { EmotionEngine } from '@/lib/ai/emotion-engine';
import { EthicsFramework } from '@/lib/safety/ethics-framework';

// ============================================================================
// Types
// ============================================================================

interface ChatRequest {
  message: string;
  userId?: string;
  conversationId?: string;
  context?: {
    previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    userPreferences?: Record<string, any>;
  };
}

interface ChatResponse {
  response: string;
  emotion?: {
    primary: string;
    intensity: number;
    confidence: number;
  };
  conversationId: string;
  timestamp: string;
  metadata?: {
    responseTime: number;
    tokensUsed?: number;
  };
}

// ============================================================================
// Initialize Services
// ============================================================================

const emotionEngine = new EmotionEngine();
const ethicsFramework = new EthicsFramework();

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const { message, userId, conversationId, context } = body;

    // Validate input
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check message length
    if (message.length > 10000) {
      return NextResponse.json(
        { error: 'Message too long (max 10,000 characters)' },
        { status: 400 }
      );
    }

    // Ethics check (prevent abuse)
    const ethicsCheck = await ethicsFramework.validateRequest({
      userPrompt: message,
      requestType: 'code_generation',
      userContext: userId ? { userId } : undefined
    });

    if (!ethicsCheck.approved) {
      return NextResponse.json(
        { 
          error: 'Message blocked by ethics framework',
          reason: ethicsCheck.reason,
          violations: ethicsCheck.violations
        },
        { status: 403 }
      );
    }

    // Detect emotion
    const emotion = emotionEngine.analyzeEmotion(message);

    // Generate conversation ID if not provided
    const convId = conversationId || generateConversationId();

    // Build response based on emotion
    const response = buildEmotionalResponse(message, emotion);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Build response
    const chatResponse: ChatResponse = {
      response,
      emotion: {
        primary: emotion.primary.type,
        intensity: emotion.primary.intensity,
        confidence: emotion.primary.confidence
      },
      conversationId: convId,
      timestamp: new Date().toISOString(),
      metadata: {
        responseTime
      }
    };

    return NextResponse.json(chatResponse, { status: 200 });

  } catch (error) {
    console.error('Chat API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function buildEmotionalResponse(message: string, emotion: any): string {
  // This is a simple response builder
  // In production, this would use Claude/GPT for actual conversation
  
  const greetings = ['hey hollywood', 'hi hollywood', 'hello hollywood'];
  const isGreeting = greetings.some(g => message.toLowerCase().includes(g));

  if (isGreeting) {
    switch (emotion.primary.type) {
      case 'excited':
        return "Hollywood! Great to see you so pumped! What are we building today? 🚀";
      case 'frustrated':
        return "Hey Hollywood, I can sense some frustration. Take a breath - I'm here to help work through whatever's got you stuck.";
      case 'happy':
        return "Hey Hollywood! Love the positive energy. What can I help you with today? 😊";
      default:
        return "Hey Hollywood! Ready when you are. What do you need?";
    }
  }

  // Default response acknowledging emotion
  const emotionAcknowledgements: Record<string, string> = {
    frustrated: "I hear your frustration. Let's break this down together.",
    confused: "I can see this is confusing. Let me help clarify.",
    excited: "Love the energy! Let's make this happen!",
    anxious: "No worries, we'll take this step by step.",
    curious: "Great question! Let me explain.",
    impatient: "Got it, let's move quickly.",
    happy: "Awesome! Let's keep this momentum going.",
    neutral: "Understood. Here's what I can do."
  };

  return emotionAcknowledgements[emotion.primary.type] || "I'm here to help!";
}

// ============================================================================
// Export for API route
// ============================================================================

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};
