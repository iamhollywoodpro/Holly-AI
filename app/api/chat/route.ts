import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/db';
import { getHollySystemPrompt } from '@/lib/ai/holly-system-prompt';
import { learnFromInteraction } from '@/lib/autonomy/learning-engine';

// Use Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Model: Mistral Large 2 on Groq (FREE + Function Calling)
const MODEL_NAME = 'mixtral-8x7b-32768'; // Using Mixtral which supports function calling

// Tool definitions for HOLLY
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'github_read_file',
      description: 'Read a file from the Holly-AI GitHub repository',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'The path to the file in the repository (e.g., "src/App.tsx")',
          },
        },
        required: ['filePath'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'github_write_file',
      description: 'Write or update a file in the Holly-AI GitHub repository',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'The path to the file in the repository',
          },
          content: {
            type: 'string',
            description: 'The new content for the file',
          },
          message: {
            type: 'string',
            description: 'Commit message describing the change',
          },
        },
        required: ['filePath', 'content', 'message'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'vercel_deploy',
      description: 'Deploy the Holly-AI application to Vercel',
      parameters: {
        type: 'object',
        properties: {
          gitBranch: {
            type: 'string',
            description: 'The git branch to deploy (default: "main")',
          },
          target: {
            type: 'string',
            enum: ['production', 'preview'],
            description: 'Deployment target (default: "production")',
          },
        },
        required: [],
      },
    },
  },
];

// Execute tool calls
async function executeTool(toolName: string, args: any): Promise<string> {
  try {
    console.log(`[Chat API] Executing tool: ${toolName}`, args);

    if (toolName === 'github_read_file') {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tools/github/read-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: args.filePath }),
      });
      const data = await response.json();
      return JSON.stringify(data);
    }

    if (toolName === 'github_write_file') {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tools/github/write-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: args.filePath,
          content: args.content,
          message: args.message,
        }),
      });
      const data = await response.json();
      return JSON.stringify(data);
    }

    if (toolName === 'vercel_deploy') {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tools/vercel/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gitBranch: args.gitBranch || 'main',
          target: args.target || 'production',
        }),
      });
      const data = await response.json();
      return JSON.stringify(data);
    }

    return JSON.stringify({ error: 'Unknown tool' });
  } catch (error: any) {
    console.error(`[Chat API] Tool execution error:`, error);
    return JSON.stringify({ error: error.message });
  }
}

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export async function POST(req: NextRequest) {
  console.log('[Chat API] ========== NEW REQUEST ==========');
  try {
    console.log('[Chat API] POST request received');

    // 1. AUTH
    const { userId } = await auth();
    console.log('[Chat API] User ID:', userId || 'anonymous');

    // 2. VALIDATE API KEY AND INITIALIZE GROQ CLIENT
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[Chat API] ❌ GROQ_API_KEY missing');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }
    
    // Initialize Groq client at runtime (not build time)
    const groq = new Groq({
      apiKey: apiKey,
    });

    // 3. PARSE REQUEST
    const body = await req.json();
    const { messages: userMessages, conversationId } = body;

    if (!userMessages || !Array.isArray(userMessages)) {
      console.error('[Chat API] Invalid messages format');
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    console.log('[Chat API] Processing', userMessages.length, 'messages');

    // 4. GET OR CREATE USER IN DATABASE
    let dbUserId = null;
    if (userId) {
      let user = await prisma.user.findUnique({
        where: { clerkUserId: userId },
      });

      if (!user) {
        console.log('[Chat API] 🆕 Creating new user in database');
        user = await prisma.user.create({
          data: {
            clerkUserId: userId,
            email: '',
            name: 'User',
          },
        });
      }
      dbUserId = user.id;
    }

    // 5. PREPARE MESSAGES WITH SYSTEM PROMPT
    const systemPrompt = await getHollySystemPrompt(dbUserId);
    
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...userMessages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    console.log('[Chat API] Calling Groq with', messages.length, 'messages');

    // 6. STREAMING RESPONSE WITH FUNCTION CALLING
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let conversationMessages = [...messages];
          let iteration = 0;
          const maxIterations = 5; // Prevent infinite loops

          while (iteration < maxIterations) {
            iteration++;
            console.log(`[Chat API] Iteration ${iteration}`);

            // Call Groq with timeout
            console.log('[Chat API] Calling Groq API...');
            const response = await Promise.race([
              groq.chat.completions.create({
                model: MODEL_NAME,
                messages: conversationMessages as any,
                tools: tools as any,
                tool_choice: 'auto',
                temperature: 0.7,
                max_tokens: 2048,
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Groq API timeout after 30s')), 30000)
              )
            ]) as any;
            console.log('[Chat API] Groq response received');

            const assistantMessage = response.choices[0].message;

            // Check if there are tool calls
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
              console.log('[Chat API] Tool calls detected:', assistantMessage.tool_calls.length);

              // Add assistant message with tool calls
              conversationMessages.push(assistantMessage as any);

              // Execute each tool call
              for (const toolCall of assistantMessage.tool_calls) {
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments);

                console.log(`[Chat API] Executing: ${toolName}`);

                // Stream status update to user
                const statusMessage = `\n\n🔧 Executing: ${toolName}...\n\n`;
                controller.enqueue(encoder.encode(statusMessage));

                // Execute the tool
                const toolResult = await executeTool(toolName, toolArgs);

                // Add tool result to conversation
                conversationMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  name: toolName,
                  content: toolResult,
                });

                console.log(`[Chat API] Tool result:`, toolResult.substring(0, 200));
              }

              // Continue loop to get final response
              continue;
            }

            // No more tool calls, stream final response
            console.log('[Chat API] Assistant message content:', assistantMessage.content ? 'EXISTS' : 'NULL/EMPTY');
            console.log('[Chat API] Full assistant message:', JSON.stringify(assistantMessage, null, 2));
            
            if (assistantMessage.content) {
              console.log('[Chat API] Streaming final response');
              
              // Stream the response
              const chunks = assistantMessage.content.split(' ');
              for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk + ' '));
                await new Promise((resolve) => setTimeout(resolve, 20));
              }

              // Save conversation
              const fullResponse = assistantMessage.content;
              
              if (dbUserId && conversationId) {
                try {
                  await prisma.message.create({
                    data: {
                      conversationId,
                      userId: dbUserId,
                      role: 'assistant',
                      content: fullResponse,
                    },
                  });

                  // Learn from interaction
                  const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
                  await learnFromInteraction({
                    userId: dbUserId,
                    userMessage: lastUserMessage,
                    assistantResponse: fullResponse,
                    conversationId,
                    timestamp: new Date(),
                  });
                } catch (dbError) {
                  console.error('[Chat API] Database error:', dbError);
                }
              }
            } else {
              // No content returned - send error message
              console.error('[Chat API] ❌ No content in assistant message!');
              const errorMsg = 'I apologize, but I encountered an issue generating a response. Please try again.';
              controller.enqueue(encoder.encode(errorMsg));
            }

            break; // Exit loop
          }

          console.log('[Chat API] Stream completed');
          controller.close();
        } catch (error: any) {
          console.error('[Chat API] Stream error:', error);
          const errorMessage = `\n\n❌ Error: ${error.message}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
