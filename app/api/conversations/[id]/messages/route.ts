// HOLLY Phase 2B: Messages API Route
// Handles message operations within conversations

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
    const { data: messages, error } = await supabase
      .from('holly_messages')
      .select('*')
      .eq('conversation_id', params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { role, content, emotion, model } = body;

    // Save the message
    const { data: message, error: messageError } = await supabase
      .from('holly_messages')
      .insert({
        conversation_id: params.id,
        role,
        content,
        emotion: emotion || null,
        model: model || 'llama-3.3-70b-versatile',
        metadata: {}
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Update conversation's updated_at timestamp
    await supabase
      .from('holly_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', params.id);

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}
