import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { saveAsset } from '@/lib/creative/asset-manager';

export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assetData = await req.json();
    
    if (!assetData.type || !assetData.url) {
      return NextResponse.json(
        { error: 'Asset type and URL are required' },
        { status: 400 }
      );
    }

    // saveAsset takes (userId, asset)
    const result = await saveAsset(userId, assetData);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error saving asset:', error);
    return NextResponse.json(
      { error: 'Failed to save asset' },
      { status: 500 }
    );
  }
}
