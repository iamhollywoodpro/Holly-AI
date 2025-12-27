import Groq from 'groq-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

async function extractMemories(conversationId, messages) {
  try {
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    console.log('Calling Groq API for memory extraction...\n');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a memory extraction system. Analyze the conversation and extract:
1. Key facts about the user
2. User preferences and work style
3. Projects or goals mentioned
4. Important context or technical details

Return a JSON object with arrays: facts, preferences, projects, context.
Keep each item concise (1-2 sentences max).`,
        },
        {
          role: 'user',
          content: conversationText,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      console.log('❌ No response from Groq');
      return;
    }

    // Strip markdown code blocks if present
    let jsonText = response.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    console.log('Cleaned JSON:');
    console.log(jsonText);
    console.log('\n');

    const memories = JSON.parse(jsonText);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    });

    if (!conversation) {
      console.log('❌ Conversation not found');
      return;
    }

    await prisma.conversationSummary.upsert({
      where: { conversationId },
      create: {
        conversationId,
        userId: conversation.userId,
        summary: `Conversation about: ${memories.projects.join(', ')}`,
        keyPoints: [...memories.facts, ...memories.preferences],
        keyTopics: memories.projects,
        topics: memories.context,
        messageCount: messages.length,
        cached: true,
      },
      update: {
        keyPoints: [...memories.facts, ...memories.preferences],
        keyTopics: memories.projects,
        topics: memories.context,
        messageCount: messages.length,
        updatedAt: new Date(),
      },
    });

    console.log('✅ Memory saved to database');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testMemoryExtraction() {
  try {
    const conversationId = 'cmjn9mrdn00014ddp84ik2x33';
    
    console.log('Fetching conversation messages...\n');
    
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        content: true
      }
    });
    
    console.log(`Found ${messages.length} messages\n`);
    
    await extractMemories(conversationId, messages);
    
    const summary = await prisma.conversationSummary.findUnique({
      where: { conversationId }
    });
    
    if (summary) {
      console.log('\n✅ Memory retrieved from database:');
      console.log('  Summary:', summary.summary);
      console.log('  Key Points:', summary.keyPoints);
      console.log('  Topics:', summary.keyTopics);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMemoryExtraction();
