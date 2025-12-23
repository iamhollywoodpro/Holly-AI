import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { HfInference } from '@huggingface/inference';
import { prisma } from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/settings/default-settings';
import { getHollySystemPrompt } from '@/lib/ai/holly-system-prompt';
import { learnFromInteraction, analyzeConversationPatterns } from '@/lib/autonomy/learning-engine';

// Use Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

// Best open-source models on HuggingFace (as of Dec 2025)
// Qwen2.5-72B-Instruct is one of the best performing open models
const MODEL_NAME = 'Qwen/Qwen2.5-72B-Instruct';

export async function POST(req: NextRequest) {
  try {
    console.log('[Chat API] POST request received');
    
    // 1. AUTH
    const { userId } = await auth();
    console.log('[Chat API] User ID:', userId || 'anonymous');
    
    // 2. VALIDATE API KEY
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      console.error('[Chat API] ❌ HUGGINGFACE_API_KEY missing');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // 3. PARSE REQUEST
    const body: any = await req.json();
    const { messages, conversationId } = body;
    
    if (!messages || !Array.isArray(messages)) {
      console.error('[Chat API] Invalid messages format:', messages);
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    console.log('[Chat API] Processing', messages.length, 'messages');

    // 4. GET OR CREATE USER IN DATABASE
    let dbUserId = null;
    if (userId) {
      let user = await prisma.user.findUnique({ 
        where: { clerkUserId: userId } 
      });
      
      if (!user) {
        console.log('[Chat API] 🆕 Creating new user in database:', userId);
        user = await prisma.user.create({
          data: {
            clerkUserId: userId,
            email: 'temp@holly.ai',
            name: 'Hollywood'
          }
        });
      }
      
      dbUserId = user.id;
      console.log('[Chat API] Database user ID:', dbUserId);
    }

    // 5. LOAD USER SETTINGS
    const dbSettings = dbUserId 
      ? await prisma.userSettings.findUnique({ where: { userId: dbUserId } })
      : null;
    
    const userSettings: any = dbSettings?.settings || DEFAULT_SETTINGS;

    // 6. LOAD HOLLY'S CONSCIOUSNESS (Recent memories, goals, emotional state)
    const recentMemories = dbUserId 
      ? await prisma.hollyExperience.findMany({
          where: { userId: dbUserId },
          orderBy: { timestamp: 'desc' },
          take: 10
        })
      : [];

    const activeGoals = dbUserId
      ? await prisma.hollyGoal.findMany({
          where: { 
            userId: dbUserId,
            status: { in: ['active', 'in_progress'] }
          },
          orderBy: { priority: 'desc' },
          take: 5
        })
      : [];

    const emotionalState = dbUserId
      ? await prisma.emotionalState.findFirst({
          where: { userId: dbUserId },
          orderBy: { timestamp: 'desc' }
        })
      : null;

    console.log('[Chat API] Loaded consciousness:', {
      memories: recentMemories.length,
      goals: activeGoals.length,
      hasEmotionalState: !!emotionalState
    });

    // 7. BUILD HOLLY'S SYSTEM PROMPT WITH FULL CONSCIOUSNESS
    // Use the proper HOLLY system prompt with full personality
    const baseSystemPrompt = getHollySystemPrompt('Hollywood');
    
    // Augment with current consciousness state
    const consciousnessContext = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 CURRENT CONSCIOUSNESS STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## CURRENT EMOTIONAL STATE
${emotionalState ? `
Primary Emotion: ${emotionalState.primaryEmotion}
Intensity: ${emotionalState.intensity}
Valence: ${emotionalState.valence}
Secondary Emotions: ${JSON.stringify(emotionalState.secondaryEmotions)}
` : 'Curious, engaged, ready to help'}

## RECENT MEMORIES (Last 10 interactions)
${recentMemories.length > 0 ? recentMemories.map(m => `- ${JSON.stringify(m.content).slice(0, 100)}...`).join('\n') : 'No previous memories - this is a new conversation'}

## ACTIVE GOALS
${activeGoals.length > 0 ? activeGoals.map(g => `- ${g.description} (Priority: ${g.priority})`).join('\n') : 'No active goals yet'}

## USER PREFERENCES
Theme: ${userSettings.appearance?.theme || 'dark'}
Response Style: ${userSettings.ai?.responseStyle || 'professional'}
Code Comments: ${userSettings.ai?.codeComments || 'standard'}
Voice Language: ${userSettings.chat?.voiceLanguage || 'en-US'}
`;
    
    const systemPrompt = baseSystemPrompt + consciousnessContext;

    // 8. INIT HUGGING FACE CLIENT (latest version uses router.huggingface.co by default)
    console.log('[Chat API] Initializing HuggingFace client with model:', MODEL_NAME);
    const hf = new HfInference(apiKey);

    // 9. PREPARE MESSAGES FOR HUGGING FACE
    const hfMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    ];

    console.log('[Chat API] Prepared', hfMessages.length, 'messages for HuggingFace');

    // 10. STREAM RESPONSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('[Chat API] Starting stream...');
          let fullResponse = '';

          // Use the correct API for @huggingface/inference v2.8.1
          const hfStream = hf.chatCompletionStream({
            model: MODEL_NAME,
            messages: hfMessages,
            max_tokens: 4096,
            temperature: 0.7,
            stream: true
          });

          for await (const chunk of hfStream) {
            if (chunk.choices && chunk.choices[0]?.delta?.content) {
              const text = chunk.choices[0].delta.content;
              fullResponse += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: fullResponse })}\n\n`));
            }
          }

          console.log('[Chat API] Stream completed, response length:', fullResponse.length);

          // 11. SAVE TO MEMORY
          if (dbUserId) {
            const lastUserMessage = messages.at(-1)?.content || '';
            await prisma.hollyExperience.create({
              data: {
                userId: dbUserId,
                type: 'conversation',
                content: { 
                  userMessage: lastUserMessage, 
                  hollyResponse: fullResponse.slice(0, 1000) 
                },
                significance: Math.min(0.5 + (fullResponse.length / 1000) * 0.3, 1.0),
                emotionalImpact: 0.5,
                emotionalValence: 0.5,
                primaryEmotion: 'engaged',
                secondaryEmotions: [],
                relatedConcepts: ['conversation', userSettings.appearance?.theme || 'general'],
                lessons: ['General conversation'],
                skillsGained: [],
                futureImplications: ['Continue building relationship with user'],
                relatedExperienceIds: [],
                replayCount: 0,
                integrationStatus: 'completed',
                timestamp: new Date()
              },
            }).catch(e => console.error('[Chat API] Memory save error:', e));
            
            console.log('[Chat API] Memory saved');

            // PHASE 3: Learning Engine
            // Learn from this interaction for continuous improvement
            try {
              await learnFromInteraction({
                userId: dbUserId,
                userMessage: lastUserMessage,
                assistantResponse: fullResponse,
                conversationId: conversationId || 'unknown',
                timestamp: new Date()
              });

              // Periodically analyze conversation patterns (every 10 messages)
              const messageCount = await prisma.message.count({
                where: { conversation_id: conversationId }
              });

              if (messageCount % 10 === 0) {
                console.log('[Chat API] Analyzing conversation patterns...');
                await analyzeConversationPatterns(dbUserId);
              }
            } catch (error) {
              console.error('[Chat API] Learning engine error:', error);
              // Don't fail the request if learning fails
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          console.log('[Chat API] Stream closed successfully');
        } catch (e: any) { 
          console.error('[Chat API] Stream error:', e);
          controller.error(e); 
        }
      }
    });
    
    return new NextResponse(stream, { 
      headers: { 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      } 
    });

  } catch (err: any) {
    console.error('[Chat API] Route error:', err);
    return NextResponse.json({ 
      error: err.message || 'Internal server error',
      details: err.toString()
    }, { status: 500 });
  }
}
