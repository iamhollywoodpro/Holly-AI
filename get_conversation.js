const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getConversation() {
  try {
    // Find conversation with "favorite color" message
    const conversations = await prisma.conversation.findMany({
      where: {
        messages: {
          some: {
            content: {
              contains: 'favorite color'
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
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    
    if (conversations.length > 0) {
      const conv = conversations[0];
      console.log('Conversation ID:', conv.id);
      console.log('User ID:', conv.user.id);
      console.log('User Name:', conv.user.name);
      console.log('Messages:', conv.messages.length);
      console.log('\nMessages:');
      conv.messages.forEach(m => {
        console.log(`${m.role}: ${m.content.substring(0, 100)}...`);
      });
    } else {
      console.log('No conversation found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getConversation();
