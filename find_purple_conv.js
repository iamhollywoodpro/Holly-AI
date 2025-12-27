const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findConv() {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        messages: {
          some: {
            content: {
              contains: 'electric purple'
            }
          }
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        user: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${conversations.length} conversations with "electric purple"\n`);
    
    conversations.forEach((conv, i) => {
      console.log(`\n=== Conversation ${i + 1} ===`);
      console.log('ID:', conv.id);
      console.log('User:', conv.user.name);
      console.log('Title:', conv.title);
      console.log('Created:', conv.createdAt);
      console.log('\nMessages:');
      conv.messages.forEach(m => {
        console.log(`  ${m.role}: ${m.content.substring(0, 150)}`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findConv();
