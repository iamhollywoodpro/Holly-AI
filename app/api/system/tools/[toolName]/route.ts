/**
 * PHASE 7: Tool Registry API - Dynamic Tool Endpoint
 * GET /api/system/tools/[toolName] - Get tool by name
 * PATCH /api/system/tools/[toolName] - Update tool
 * DELETE /api/system/tools/[toolName] - Delete tool
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateTool, unregisterTool } from '@/lib/system/tool-registry';

export const runtime = 'nodejs';


interface RouteParams {
  params: {
    toolName: string;
  };
}

// GET: Retrieve tool by name
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toolName } = params;

    // Get tool from database directly
    const { prisma } = await import('@/lib/db');
    const tool = await prisma.toolDefinition.findUnique({
      where: { name: toolName }
    });
    
    const result = tool 
      ? { success: true, tool }
      : { success: false, error: 'Tool not found' };

    if (result.success) {
      return NextResponse.json({
        success: true,
        tool: result.tool
      });
    } else {
      return NextResponse.json(
        { error: 'Tool not found', details: result.error },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('[API] Get tool error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve tool',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH: Update tool
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toolName } = params;
    const updates = await request.json();

    // Update tool
    const result = await updateTool(toolName, updates);

    if (result.success) {
      return NextResponse.json({
        success: true,
        toolId: result.toolId,
        message: 'Tool updated successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to update tool', details: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[API] Update tool error:', error);
    return NextResponse.json(
      { 
        error: 'Tool update failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove tool
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toolName } = params;

    // Delete tool
    const result = await unregisterTool(toolName);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Tool deleted successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete tool', details: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[API] Delete tool error:', error);
    return NextResponse.json(
      { 
        error: 'Tool deletion failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
