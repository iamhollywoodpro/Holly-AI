/**
 * PHASE 7: Tool Registry API - Register Tool Endpoint
 * POST /api/system/tools/register
 * Registers a new tool or updates existing one
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { registerTool, validateToolSchema } from '@/lib/system/tool-registry';

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { schema, override } = body;

    // Validate schema structure
    if (!schema) {
      return NextResponse.json(
        { error: 'Tool schema is required' },
        { status: 400 }
      );
    }

    // Validate tool schema
    const validation = validateToolSchema(schema);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid tool schema',
          validationErrors: validation.errors
        },
        { status: 400 }
      );
    }

    // Register tool
    const result = await registerTool(schema, { override: override || false });

    if (result.success) {
      return NextResponse.json({
        success: true,
        toolId: result.toolId,
        message: 'Tool registered successfully'
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to register tool',
          details: result.error
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[API] Register tool error:', error);
    return NextResponse.json(
      { 
        error: 'Tool registration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
