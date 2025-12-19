import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

// ============================================================================
// PHASE 5A: CODE TEMPLATES API
// Purpose: Manage reusable code templates and patterns
// Endpoint: /api/admin/builder/templates
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    // LIST: Get all templates
    if (action === 'list') {
      const category = searchParams.get('category');
      const language = searchParams.get('language');
      const framework = searchParams.get('framework');
      const includePublic = searchParams.get('includePublic') === 'true';

      const where: any = {
        OR: [
          { userId },
          ...(includePublic ? [{ isPublic: true }] : []),
        ],
      };

      if (category) where.category = category;
      if (language) where.language = language;
      if (framework) where.framework = framework;

      const templates = await prisma.codeTemplate.findMany({
        where,
        orderBy: [
          { usageCount: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          _count: {
            select: { generatedCodes: true },
          },
        },
      });

      return NextResponse.json({ templates });
    }

    // GET: Get specific template
    if (action === 'get') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
      }

      const template = await prisma.codeTemplate.findUnique({
        where: { id },
        include: {
          generatedCodes: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              purpose: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      if (!template || (template.userId !== userId && !template.isPublic)) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      return NextResponse.json({ template });
    }

    // STATS: Get template statistics
    if (action === 'stats') {
      const [total, byCategory, byLanguage, mostUsed] = await Promise.all([
        prisma.codeTemplate.count({
          where: { OR: [{ userId }, { isPublic: true }] },
        }),
        prisma.codeTemplate.groupBy({
          by: ['category'],
          where: { OR: [{ userId }, { isPublic: true }] },
          _count: true,
        }),
        prisma.codeTemplate.groupBy({
          by: ['language'],
          where: { OR: [{ userId }, { isPublic: true }] },
          _count: true,
        }),
        prisma.codeTemplate.findMany({
          where: { OR: [{ userId }, { isPublic: true }] },
          orderBy: { usageCount: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            category: true,
            usageCount: true,
          },
        }),
      ]);

      return NextResponse.json({
        stats: {
          total,
          byCategory,
          byLanguage,
          mostUsed,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Code Templates API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // CREATE: Create new template
    if (!action || action === 'create') {
      const {
        name,
        description,
        category,
        language,
        templateCode,
        variables,
        placeholders,
        isPublic,
        tags,
        framework,
        requiredContext,
      } = body;

      // Validation
      if (!name || !description || !category || !language || !templateCode) {
        return NextResponse.json(
          { error: 'Name, description, category, language, and template code are required' },
          { status: 400 }
        );
      }

      const template = await prisma.codeTemplate.create({
        data: {
          userId,
          name,
          description,
          category,
          language,
          templateCode,
          variables: variables || [],
          placeholders: placeholders || {},
          isPublic: isPublic || false,
          tags: tags || [],
          framework,
          requiredContext,
          validated: false,
        },
      });

      return NextResponse.json({ success: true, template });
    }

    // USE: Use template to generate code
    if (action === 'use') {
      const { id, variableValues } = body;
      if (!id) {
        return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
      }

      const template = await prisma.codeTemplate.findUnique({
        where: { id },
      });

      if (!template || (template.userId !== userId && !template.isPublic)) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      // Apply variables to template
      let processedCode = template.templateCode;
      if (variableValues) {
        Object.entries(variableValues).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          processedCode = processedCode.replace(regex, String(value));
        });
      }

      // Update usage count
      await prisma.codeTemplate.update({
        where: { id },
        data: {
          usageCount: { increment: 1 },
          lastUsed: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        processedCode,
        template: {
          id: template.id,
          name: template.name,
          category: template.category,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Code Templates API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Verify ownership
    const template = await prisma.codeTemplate.findUnique({
      where: { id },
    });

    if (!template || template.userId !== userId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Update template
    const updatedTemplate = await prisma.codeTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, template: updatedTemplate });
  } catch (error) {
    console.error('Code Templates API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Verify ownership
    const template = await prisma.codeTemplate.findUnique({
      where: { id },
    });

    if (!template || template.userId !== userId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Delete the template
    await prisma.codeTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Code Templates API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
