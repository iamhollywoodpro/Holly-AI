import { NextRequest, NextResponse } from 'next/server';

/**
 * SUNO API Callback Endpoint
 * Receives notifications when music generation is complete
 * 
 * Callback stages:
 * - "text": Text/lyrics generation complete
 * - "first": First track complete
 * - "complete": All tracks complete
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('[Music Callback] Received:', JSON.stringify(body, null, 2));
    
    // The callback body structure from SUNO API:
    // {
    //   "taskId": "5c79****be8e",
    //   "stage": "complete",  // "text" | "first" | "complete"
    //   "data": {
    //     "recordId": "abc123",
    //     "audioUrl": "https://...",
    //     "imageUrl": "https://...",
    //     "duration": 180,
    //     "status": "complete"
    //   }
    // }
    
    const { taskId, stage, data } = body;
    
    // Log the callback for debugging
    console.log(`[Music Callback] Task ${taskId} - Stage: ${stage}`);
    
    // In a production system, you would:
    // 1. Store the result in a database
    // 2. Notify the user via WebSocket/SSE
    // 3. Update the task status
    
    // For now, we're using polling on the frontend, so we just acknowledge the callback
    
    return NextResponse.json({
      success: true,
      message: 'Callback received',
      taskId,
      stage,
    });
    
  } catch (error: any) {
    console.error('[Music Callback] Error:', error);
    
    // Return 200 even on error to prevent SUNO from retrying
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 200 });
  }
}
