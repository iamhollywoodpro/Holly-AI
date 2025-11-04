// HOLLY Phase 2D: Enhanced Individual Conversation API Route
// Supports metadata updates (pinned status)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: conversation, error } = await supabase
      .from('holly_conversations')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as any;
    const { title, metadata } = body as any;

    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (title !== undefined) {
      updateData.title = title;
    }
    
    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    const { data: conversation, error } = await supabase
      .from('holly_conversations')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Delete all messages in this conversation first
    await supabase
      .from('holly_messages')
      .delete()
      .eq('conversation_id', params.id);

    // Delete the conversation
    const { error } = await supabase
      .from('holly_conversations')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
