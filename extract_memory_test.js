const { extractMemories } = require('./src/lib/memory-service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    
    console.log(`Found ${messages.length} messages`);
    console.log('Messages:');
    messages.forEach(m => console.log(`  ${m.role}: ${m.content.substring(0, 100)}...`));
    
    console.log('\n🧠 Extracting memories...\n');
    
    await extractMemories(conversationId, messages);
    
    console.log('✅ Memory extraction complete!\n');
    
    // Check if memory was saved
    const summary = await prisma.conversationSummary.findUnique({
      where: { conversationId }
    });
    
    if (summary) {
      console.log('✅ Memory saved to database:');
      console.log('  Summary:', summary.summary);
      console.log('  Key Points:', summary.keyPoints);
      console.log('  Topics:', summary.keyTopics);
    } else {
      console.log('❌ No memory found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testMemoryExtraction();
