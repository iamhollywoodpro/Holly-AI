import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      prompt, 
      genre = 'pop', 
      mood = 'upbeat',
      language = 'english',
      structure = 'verse-chorus-verse-chorus-bridge-chorus'
    } = await req.json();

    if (!prompt) {
      return NextResponse.json({ 
        error: 'Missing lyrics prompt' 
      }, { status: 400 });
    }

    // Use Gemini AI for lyrics generation
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'AI API key not configured' 
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const lyricsPrompt = `Generate professional ${genre} song lyrics in ${language} with a ${mood} mood.

Song Topic/Theme: ${prompt}

Structure: ${structure}

Requirements:
- Follow the specified structure
- Include verse/chorus/bridge labels
- Make lyrics cohesive and meaningful
- Match the ${mood} mood throughout
- Use ${genre} genre conventions
- ${language === 'english' ? 'Use natural, contemporary English' : `Write in ${language} language`}

Format:
[Verse 1]
...lyrics...

[Chorus]
...lyrics...

etc.

Generate complete, professional song lyrics:`;

    const result = await model.generateContent(lyricsPrompt);
    const response = await result.response;
    const lyrics = response.text();

    // Save to database
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const track = await prisma.musicTrack.create({
        data: {
          userId,
          artistName: 'HOLLY AI',
          trackTitle: prompt.substring(0, 100),
          fileName: `lyrics-${Date.now()}.txt`,
          fileSize: lyrics.length,
          fileType: 'text',
          blobUrl: '',
          status: 'analyzed'
        }
      });

      return NextResponse.json({
        success: true,
        lyrics: {
          id: track.id,
          content: lyrics,
          genre,
          mood,
          language,
          structure,
          metadata: {
            wordCount: lyrics.split(/\s+/).length,
            lineCount: lyrics.split('\n').length,
            sections: (lyrics.match(/\[.*?\]/g) || []).length
          }
        }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error: any) {
    console.error('Lyrics generation error:', error);
    return NextResponse.json({
      error: 'Lyrics generation failed',
      details: error.message
    }, { status: 500 });
  }
}
