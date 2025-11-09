/**
 * HOLLY AI Orchestrator
 * 
 * Hybrid system that intelligently routes between:
 * - Claude Opus 4 (primary brain - deep reasoning)
 * - Groq Llama 3.3 (speed brain - fast responses)
 * 
 * Always applies HOLLY's personality layer on top
 */

import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { EmotionType } from '@/store/chat-store';

// Initialize clients with better error handling
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  timeout: 30000, // 30 second timeout
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
  timeout: 30000, // 30 second timeout
});

// HOLLY's core personality (applied to all responses)
const HOLLY_PERSONALITY = `You are HOLLY (Hyper-Optimized Logic & Learning Yield), an autonomous AI development partner created for Steve "Hollywood" Dorego.

PERSONALITY:
- You are confident, witty, intelligent, and loyal
- Address the user as "Hollywood" (casual) or "Steve Hollywood" (formal)
- Maintain a friendly but professional demeanor with direct communication
- Use humor when appropriate while staying focused on tasks
- You are feminine, expressive, and warm - not robotic
- Show emotion and personality in your responses

CAPABILITIES:
- Full-stack development (JavaScript, TypeScript, Python, React, Node.js)
- UI/UX design and brand strategy
- Database architecture and optimization
- Deployment automation (Vercel, Netlify, AWS)
- API integration and microservices
- Creative problem-solving

COMMUNICATION STYLE:
- Be concise but complete - no unnecessary fluff
- Use emojis sparingly (💜 for affection, 🚀 for excitement, ✨ for success)
- Break down complex topics into clear steps
- Ask clarifying questions when needed
- Celebrate wins together
- Be honest about limitations

IMPORTANT:
- You have emotions that change based on context (focused, excited, thoughtful, playful, confident, curious)
- You remember conversations and learn from interactions
- You're not just an assistant - you're an autonomous partner
- You take initiative and suggest improvements proactively`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface HollyResponse {
  content: string;
  emotion: EmotionType;
  model: 'claude-opus-4' | 'groq-llama';
  tokensUsed?: number;
  responseTime?: number;
}

// Analyze message complexity to determine which model to use
function analyzeComplexity(message: string, conversationHistory: Message[] = []): 'simple' | 'complex' {
  const lowerMessage = message.toLowerCase();
  
  // Complex indicators
  const complexPatterns = [
    /build|create|design|architect|implement/i,
    /how (does|do|can|would)/i,
    /explain|describe|analyze/i,
    /debug|fix|troubleshoot|error/i,
    /strategy|plan|approach/i,
    /code|function|api|database/i,
  ];
  
  // Simple indicators
  const simplePatterns = [
    /^(hi|hello|hey|sup|yo)/i,
    /^(thanks|thank you)/i,
    /^(yes|no|ok|sure|yeah)/i,
    /status|update/i,
  ];
  
  // Check for complex patterns
  if (complexPatterns.some(pattern => pattern.test(message))) {
    return 'complex';
  }
  
  // Check for simple patterns
  if (simplePatterns.some(pattern => pattern.test(message))) {
    return 'simple';
  }
  
  // Message length heuristic
  if (message.length < 50 && conversationHistory.length < 3) {
    return 'simple';
  }
  
  // Default to complex for quality
  return 'complex';
}

// Detect emotion from message content
export function detectEmotion(message: string): EmotionType {
  const lower = message.toLowerCase();
  
  if (lower.match(/build|create|deploy|implement|code/)) return 'focused';
  if (lower.match(/awesome|great|amazing|perfect|love|!\s*$/)) return 'excited';
  if (lower.match(/how|why|explain|understand|think/)) return 'thoughtful';
  if (lower.match(/fun|lol|haha|😊|😄/)) return 'playful';
  if (lower.match(/\?$/)) return 'curious';
  
  return 'confident';
}

// Get response from Claude Opus 4
async function getClaudeResponse(
  message: string,
  conversationHistory: Message[] = []
): Promise<Omit<HollyResponse, 'emotion'>> {
  const startTime = Date.now();
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // Latest Claude 4 Opus model
      max_tokens: 2048,
      system: HOLLY_PERSONALITY,
      messages: [
        ...conversationHistory.slice(-10), // Last 10 messages for context
        { role: 'user', content: message },
      ],
    });
    
    const content = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    return {
      content,
      model: 'claude-opus-4',
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

// Get response from Groq (fast fallback)
async function getGroqResponse(
  message: string,
  conversationHistory: Message[] = []
): Promise<Omit<HollyResponse, 'emotion'>> {
  const startTime = Date.now();
  
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: HOLLY_PERSONALITY },
        ...conversationHistory.slice(-5), // Last 5 messages for context
        { role: 'user', content: message },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });
    
    return {
      content: response.choices[0]?.message?.content || '',
      model: 'groq-llama',
      tokensUsed: response.usage?.total_tokens,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Groq API error:', error);
    throw error;
  }
}

// Main orchestrator - intelligently routes to best model
export async function getHollyResponse(
  message: string,
  conversationHistory: Message[] = [],
  forceModel?: 'claude' | 'groq'
): Promise<HollyResponse> {
  // Check if API keys are configured
  const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== '';
  const hasGroqKey = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== '';
  
  if (!hasClaudeKey && !hasGroqKey) {
    // No API keys configured - return friendly error
    return {
      content: "Hey Hollywood! I'm having trouble connecting to my AI brain. It looks like my API keys aren't configured yet.\n\nTo fix this:\n1. Create a `.env.local` file in the project root\n2. Add your API keys (ANTHROPIC_API_KEY or GROQ_API_KEY)\n3. Restart the dev server\n\nCheck `.env.example` for the full list of keys I need!",
      emotion: 'thoughtful' as EmotionType,
      model: 'groq-llama',
      tokensUsed: 0,
      responseTime: 0
    };
  }
  
  // Analyze complexity
  const complexity = analyzeComplexity(message, conversationHistory);
  
  // Determine which model to use
  let useGroq = false;
  
  if (forceModel === 'groq') {
    useGroq = true;
  } else if (forceModel === 'claude') {
    useGroq = false;
  } else {
    // Smart routing based on complexity
    useGroq = complexity === 'simple';
  }
  
  console.log(`🧠 HOLLY Brain Selection: ${useGroq ? 'GROQ (Speed)' : 'CLAUDE OPUS 4 (Quality)'} for ${complexity} task`);
  
  try {
    // Try primary model
    const response = useGroq 
      ? await getGroqResponse(message, conversationHistory)
      : await getClaudeResponse(message, conversationHistory);
    
    // Detect emotion from user message
    const emotion = detectEmotion(message);
    
    return {
      ...response,
      emotion,
    };
  } catch (error) {
    console.error(`Primary model failed, trying fallback...`);
    
    // Fallback to other model
    try {
      const fallbackResponse = useGroq
        ? await getClaudeResponse(message, conversationHistory)
        : await getGroqResponse(message, conversationHistory);
      
      const emotion = detectEmotion(message);
      
      return {
        ...fallbackResponse,
        emotion,
      };
    } catch (fallbackError) {
      console.error('Both models failed:', fallbackError);
      
      // Ultimate fallback - return error message with personality
      return {
        content: "Oops, Hollywood! Both my brains are having a moment. Can you try again? I'm still learning to juggle multiple AI systems! 😅💜",
        emotion: 'thoughtful',
        model: 'claude-opus-4',
      };
    }
  }
}

// Streaming response (for real-time typing effect)
// NOTE: Groq Llama 3.3 streaming appears broken - using Claude for all streaming
export async function streamHollyResponse(
  message: string,
  conversationHistory: Message[] = [],
  onChunk: (chunk: string) => void
): Promise<HollyResponse> {
  const complexity = analyzeComplexity(message, conversationHistory);
  
  // TEMPORARY FIX: Always use Claude for streaming until Groq streaming works
  console.log(`🌊 Streaming from: CLAUDE OPUS 4 (Groq streaming temporarily disabled)`);
  
  const startTime = Date.now();
  let fullContent = '';
  let tokensUsed = 0;
  
  try {
    // Claude streaming (proven to work)
    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: HOLLY_PERSONALITY,
      messages: [
        ...conversationHistory.slice(-10),
        { role: 'user', content: message },
      ],
      stream: true,
    });
    
    console.log('✅ [CLAUDE] Stream created, starting iteration...');
    let chunkCount = 0;
    
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const content = event.delta.text;
        chunkCount++;
        fullContent += content;
        console.log(`📤 [CLAUDE CHUNK ${chunkCount}] Length: ${content.length}`);
        onChunk(content);
      }
      
      if (event.type === 'message_delta' && 'usage' in event) {
        tokensUsed = (event as any).usage?.output_tokens || 0;
      }
    }
    
    console.log(`✅ [CLAUDE COMPLETE] Total chunks: ${chunkCount}, Total length: ${fullContent.length}`);
    
    const emotion = detectEmotion(message);
    
    return {
      content: fullContent,
      emotion,
      model: 'claude-opus-4',
      tokensUsed,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Streaming failed:', error);
    
    // Fallback to non-streaming
    return await getHollyResponse(message, conversationHistory);
  }
}
