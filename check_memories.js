const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMemories() {
  try {
    console.log('Checking ConversationSummary table...\n');
    
    const summaries = await prisma.conversationSummary.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        conversation: {
          select: {
            title: true,
            createdAt: true
          }
        }
      }
    });
    
    console.log(`Found ${summaries.length} conversation summaries:\n`);
    
    summaries.forEach((s, i) => {
      console.log(`${i + 1}. Conversation: ${s.conversation?.title || 'Untitled'}`);
      console.log(`   Summary: ${s.summary}`);
      console.log(`   Key Points: ${s.keyPoints.join(', ')}`);
      console.log(`   Topics: ${s.keyTopics.join(', ')}`);
      console.log(`   Updated: ${s.updatedAt}\n`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMemories();
