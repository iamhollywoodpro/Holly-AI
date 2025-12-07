// PHASE 2: REAL A/B Test Management
// Manages actual A/B tests in database
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { testName, variants, userId, action = 'create', distribution } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required' },
        { status: 400 }
      );
    }

    let result: any = {
      success: true,
      action,
      timestamp: new Date().toISOString()
    };

    switch (action) {
      case 'create':
        if (!testName || !variants) {
          return NextResponse.json(
            { success: false, error: 'testName and variants required' },
            { status: 400 }
          );
        }

        // Calculate traffic distribution
        const variantArray = Array.isArray(variants) ? variants : ['A', 'B'];
        const traffic = distribution || `${Math.floor(100 / variantArray.length)}%`;

        // Create A/B test
        const abTest = await prisma.aBTest.create({
          data: {
            name: testName,
            description: `A/B test: ${testName}`,
            variants: variantArray,
            distribution: distribution || { [variantArray[0]]: 50, [variantArray[1]]: 50 },
            status: 'active',
            startDate: new Date(),
            createdBy: userId
          }
        });

        result.test = {
          id: abTest.id,
          name: abTest.name,
          variants: abTest.variants,
          status: abTest.status,
          traffic,
          startDate: abTest.startDate
        };
        break;

      case 'list':
        const tests = await prisma.aBTest.findMany({
          where: { createdBy: userId },
          orderBy: { createdAt: 'desc' }
        });

        result.tests = tests.map(t => ({
          id: t.id,
          name: t.name,
          variants: t.variants,
          status: t.status,
          startDate: t.startDate,
          endDate: t.endDate
        }));
        break;

      case 'results':
        if (!testName) {
          return NextResponse.json(
            { success: false, error: 'testName required' },
            { status: 400 }
          );
        }

        const test = await prisma.aBTest.findFirst({
          where: { name: testName }
        });

        if (!test) {
          return NextResponse.json(
            { success: false, error: 'Test not found' },
            { status: 404 }
          );
        }

        // Get conversions
        const conversions = await prisma.aBTestConversion.groupBy({
          by: ['variant'],
          where: { testId: test.id },
          _count: { id: true }
        });

        result.test = {
          name: test.name,
          status: test.status,
          results: conversions.map(c => ({
            variant: c.variant,
            conversions: c._count.id
          }))
        };
        break;

      case 'stop':
        if (!testName) {
          return NextResponse.json(
            { success: false, error: 'testName required' },
            { status: 400 }
          );
        }

        await prisma.aBTest.updateMany({
          where: { name: testName },
          data: {
            status: 'completed',
            endDate: new Date()
          }
        });

        result.test = {
          name: testName,
          status: 'completed',
          endDate: new Date().toISOString()
        };
        break;

      default:
        // Default to status
        const variantCount = Array.isArray(variants) ? variants.length : 2;
        result.test = {
          name: testName || 'default',
          variants: variants || ['A', 'B'],
          status: 'active',
          traffic: `${Math.floor(100 / variantCount)}% each`
        };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('A/B test management error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
