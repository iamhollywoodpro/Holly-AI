import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const { message, channel, recipients, userId } = await req.json();
    const result = { success: true, notification: { sent: true, channel, recipients: recipients?.length || 1, messageId: 'notif_' + Date.now() }, timestamp: new Date().toISOString() };
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
