import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  const user = await currentUser();
  const userId = user?.id;
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  
  return NextResponse.json({ 
    success: true, 
    message: 'Feature not yet implemented',
    status: 'stub' 
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  const userId = user?.id;
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  
  return NextResponse.json({ 
    success: true, 
    message: 'Feature not yet implemented',
    status: 'stub' 
  });
}
