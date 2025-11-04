import { NextRequest, NextResponse } from 'next/server';
import { advancedAudioAnalyzer } from '@/lib/audio/advanced-audio-analyzer';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const analysisType = (formData.get('analysisType') as string) || 'quick';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    let result;

    switch (analysisType) {
      case 'mix':
        result = await advancedAudioAnalyzer.analyzeMixQuality(arrayBuffer);
        break;
      case 'quick':
        // Create a temporary URL for the audio file
        const blob = new Blob([arrayBuffer]);
        const url = URL.createObjectURL(blob);
        result = await advancedAudioAnalyzer.quickMixCheck(url);
        URL.revokeObjectURL(url);
        break;
      default:
        result = await advancedAudioAnalyzer.quickMixCheck('audio-file');
    }

    return NextResponse.json({
      success: true,
      analysis: result,
    });

  } catch (error: any) {
    console.error('Audio analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Audio analysis failed' },
      { status: 500 }
    );
  }
}
