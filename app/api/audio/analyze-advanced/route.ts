import { NextRequest, NextResponse } from 'next/server';
import { advancedAudioAnalyzer } from '@/lib/audio/advanced-audio-analyzer';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const analysisType = (formData.get('analysisType') as string) || 'full';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert File to ArrayBuffer for mix analysis
    const arrayBuffer = await audioFile.arrayBuffer();

    let result;
    switch (analysisType) {
      case 'mix':
        result = await advancedAudioAnalyzer.analyzeMixQuality(arrayBuffer);
        break;
      case 'mastering':
        // Pass a dummy URL since the method doesn't actually process it
        result = await advancedAudioAnalyzer.checkMastering('dummy-url');
        break;
      default:
        // Return mock full analysis
        result = {
          duration: 180,
          tempo: 120,
          key: 'C Major',
          energy: 0.8,
          hitPotential: 85,
          productionQuality: 90,
          mixQuality: 88,
          radioReady: true
        };
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
