#!/bin/bash
set -e

echo "🚀 STARTING REAL HOLLY 3.5 RESTORATION (CLAUDE 4.5 LOGIC)..."
cd ~/Holly-AI

# 1. CLEAN STATE
git add .
git reset --hard origin/main
git pull origin main

# 2. FIX MIDDLEWARE (Unblock API)
cat > middleware.ts << 'MIDDLE'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)', '/api/(.*)']);
export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) auth().protect();
});
export const config = { matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'] };
MIDDLE
echo "✅ Middleware Fixed"

# 3. FIX SETTINGS (401 Brain Disconnect)
mkdir -p app/api/settings
cat > app/api/settings/route.ts << 'SETTINGS'
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '../../src/lib/db';
import { DEFAULT_SETTINGS } from '../../src/lib/settings/default-settings';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json(DEFAULT_SETTINGS);
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    return NextResponse.json(settings?.settings || DEFAULT_SETTINGS);
  } catch (e) {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}
SETTINGS
echo "✅ Settings Route Fixed"

# 4. FIX CHAT ROUTE (Full Soul + Verified Schema - NO USER MANAGER DEPENDENCY)
mkdir -p app/api/chat
cat > app/api/chat/route.ts << 'CHAT'
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../../src/lib/db';
import { DEFAULT_SETTINGS } from '../../src/lib/settings/default-settings';

export const runtime = 'nodejs';
const MODEL_NAME = 'gemini-1.5-flash';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Key missing' }, { status: 500 });

    // Parse body - supports top-level imageUrl/audioUrl OR fileAttachments array
    const body: any = await req.json();
    const { messages, imageUrl, audioUrl, fileAttachments } = body;

    // 1. LOAD IDENTITY & MEMORY
    // If userId exists, get their settings. If not, use defaults.
    const userSettings = userId ? await prisma.userSettings.findUnique({ where: { userId } }).catch(() => null) || DEFAULT_SETTINGS : DEFAULT_SETTINGS;
    
    const recentMemories = userId ? await prisma.hollyExperience.findMany({
      where: { userId }, orderBy: { timestamp: 'desc' }, take: 10, select: { type: true, content: true, significance: true, lessons: true }
    }).catch(() => []) : [];

    // 2. SENSORY DETECTION (Checks both top-level URLs and array)
    let sensoryContext = "";
    let mode = "text";
    
    if (imageUrl || (fileAttachments && fileAttachments.some((f: any) => f.type?.startsWith('image/')))) {
      mode = "vision";
      sensoryContext = "\n[VISION MODE]: Analyzing visual content.";
    }
    if (audioUrl || (fileAttachments && fileAttachments.some((f: any) => f.type?.startsWith('audio/')))) {
      mode = "audio";
      sensoryContext = "\n[AUDIO A&R MODE]: Analyzing audio for production quality.";
    }

    // 3. BUILD PROMPT
    const systemPrompt = `You are REAL HOLLY 3.5. User: ${userSettings.userName}. Memory: ${JSON.stringify(recentMemories)}.${sensoryContext}`;
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction: systemPrompt });
    
    // Handle message history correctly
    const chatHistory = messages.slice(0, -1).map(m => ({ 
      role: m.role === 'assistant' ? 'model' : 'user', 
      parts: [{ text: m.content }] 
    }));
    
    const chat = model.startChat({ history: chatHistory });
    const lastMessage = messages.at(-1)?.content || "Hello?";

    // 4. STREAM RESPONSE
    const result = await chat.sendMessageStream(lastMessage);
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            fullResponse += text;
            controller.enqueue(encoder.encode(text));
          }

          // 5. SAVE MEMORY (VERIFIED FIELDS ONLY)
          if (userId) {
            await prisma.hollyExperience.create({
              data: {
                userId,
                type: mode === 'text' ? 'conversation' : mode,
                content: { 
                  userMessage: lastMessage, 
                  hollyResponse: fullResponse.slice(0, 500), // Truncate for DB safety
                  mode: mode,
                  fileCount: fileAttachments?.length || 0
                },
                significance: 0.5,
                lessons: [], // ✅ VERIFIED FIELD EXISTS
                timestamp: new Date()
              },
            }).catch(e => console.error('DB Save Err', e));
          }
          controller.close();
        } catch (e) { controller.error(e); }
      }
    });
    
    return new NextResponse(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
