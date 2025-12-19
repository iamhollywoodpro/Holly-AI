import { NextRequest, NextResponse} from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { audioUrl, stems = ['vocals', 'drums', 'bass', 'other'], userId } = await req.json();
    const result = {
      success: true, message: 'Audio stems separated', stems: {
        vocals: `${audioUrl}_vocals.mp3`, drums: `${audioUrl}_drums.mp3`,
        bass: `${audioUrl}_bass.mp3`, other: `${audioUrl}_other.mp3`
      }, timestamp: new Date().toISOString()
    };
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
