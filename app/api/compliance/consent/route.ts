import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPrivacyConsent, updatePrivacyConsent } from '@/lib/security/compliance-manager';

export const runtime = 'nodejs';


// GET /api/compliance/consent - Get privacy consent
export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const consent = await getPrivacyConsent(userId);

    return NextResponse.json(consent);
  } catch (error) {
    console.error('Error fetching privacy consent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch privacy consent' },
      { status: 500 }
    );
  }
}

// PATCH /api/compliance/consent - Update privacy consent
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = await updatePrivacyConsent(userId, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating privacy consent:', error);
    return NextResponse.json(
      { error: 'Failed to update privacy consent' },
      { status: 500 }
    );
  }
}
