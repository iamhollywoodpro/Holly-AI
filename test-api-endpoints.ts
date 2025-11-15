/**
 * API Endpoint Test Script
 * Tests all failing endpoints with detailed error logging
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testDatabaseConnection() {
  console.log('\n=== TESTING DATABASE CONNECTION ===');
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    const userCount = await prisma.user.count();
    console.log(`✅ User count: ${userCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function testUserCreation() {
  console.log('\n=== TESTING USER CREATION ===');
  try {
    const testClerkId = 'test_' + Date.now();
    const testEmail = `test${Date.now()}@test.com`;
    
    const user = await prisma.user.create({
      data: {
        clerkId: testClerkId,
        email: testEmail,
        name: 'Test User',
      },
    });
    
    console.log('✅ User created:', user.id);
    
    // Clean up
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ Test user cleaned up');
    
    return true;
  } catch (error) {
    console.error('❌ User creation failed:', error);
    return false;
  }
}

async function testHollyExperienceQuery() {
  console.log('\n=== TESTING HOLLY EXPERIENCE QUERY ===');
  try {
    const experiences = await prisma.hollyExperience.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
    });
    
    console.log(`✅ Found ${experiences.length} experiences`);
    return true;
  } catch (error) {
    console.error('❌ Experience query failed:', error);
    return false;
  }
}

async function testHollyGoalsQuery() {
  console.log('\n=== TESTING HOLLY GOALS QUERY ===');
  try {
    const goals = await prisma.hollyGoal.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    
    console.log(`✅ Found ${goals.length} goals`);
    return true;
  } catch (error) {
    console.error('❌ Goals query failed:', error);
    return false;
  }
}

async function testConversationsQuery() {
  console.log('\n=== TESTING CONVERSATIONS QUERY ===');
  try {
    const conversations = await prisma.conversation.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });
    
    console.log(`✅ Found ${conversations.length} conversations`);
    return true;
  } catch (error) {
    console.error('❌ Conversations query failed:', error);
    return false;
  }
}

async function main() {
  console.log('🔍 HOLLY API ENDPOINTS DIAGNOSTIC TEST');
  console.log('=====================================\n');
  
  const results = {
    database: await testDatabaseConnection(),
    userCreation: await testUserCreation(),
    experiences: await testHollyExperienceQuery(),
    goals: await testHollyGoalsQuery(),
    conversations: await testConversationsQuery(),
  };
  
  console.log('\n=== TEST SUMMARY ===');
  console.log('Database Connection:', results.database ? '✅' : '❌');
  console.log('User Creation:', results.userCreation ? '✅' : '❌');
  console.log('Experiences Query:', results.experiences ? '✅' : '❌');
  console.log('Goals Query:', results.goals ? '✅' : '❌');
  console.log('Conversations Query:', results.conversations ? '✅' : '❌');
  
  const allPassed = Object.values(results).every(r => r === true);
  console.log('\n' + (allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'));
  
  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

main();
