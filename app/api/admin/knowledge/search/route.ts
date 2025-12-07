// PHASE 2: REAL Knowledge Base Search
// Searches through stored documents and conversations
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { query, userId, limit = 10 } = await req.json();

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'query required' },
        { status: 400 }
      );
    }

    const searchTerm = `%${query.toLowerCase()}%`;

    // Search in conversation messages
    const messageResults = await prisma.message.findMany({
      where: {
        content: {
          contains: query,
          mode: 'insensitive'
        },
        ...(userId && { conversation: { userId } })
      },
      include: {
        conversation: {
          select: { id: true, title: true, createdAt: true }
        }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    // Search in file uploads
    const fileResults = await prisma.fileUpload.findMany({
      where: {
        OR: [
          { fileName: { contains: query, mode: 'insensitive' } },
          { mimeType: { contains: query, mode: 'insensitive' } }
        ],
        ...(userId && { userId })
      },
      take: limit,
      orderBy: { uploadedAt: 'desc' }
    });

    // Calculate relevance scores (simple keyword matching)
    const results = messageResults.map((msg, index) => {
      const content = msg.content.toLowerCase();
      const occurrences = (content.match(new RegExp(query.toLowerCase(), 'g')) || []).length;
      return {
        id: msg.id,
        type: 'message',
        title: msg.conversation.title || 'Conversation',
        excerpt: msg.content.substring(0, 200) + '...',
        relevance: Math.min(0.9, 0.5 + (occurrences * 0.1)),
        source: 'conversations',
        createdAt: msg.createdAt,
        conversationId: msg.conversation.id
      };
    });

    // Add file results
    fileResults.forEach(file => {
      results.push({
        id: file.id,
        type: 'file',
        title: file.fileName,
        excerpt: `File: ${file.fileName} (${file.mimeType})`,
        relevance: 0.7,
        source: 'files',
        createdAt: file.uploadedAt,
        url: file.publicUrl
      });
    });

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    const finalResults = {
      success: true,
      query,
      results: results.slice(0, limit),
      totalResults: results.length,
      sources: {
        messages: messageResults.length,
        files: fileResults.length
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(finalResults);
  } catch (error: any) {
    console.error('Knowledge search error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
