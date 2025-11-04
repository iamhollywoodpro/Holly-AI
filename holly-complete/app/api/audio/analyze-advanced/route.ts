import { NextRequest, NextResponse } from 'next/server';
import { AdvancedAudioAnalyzer } from '@/lib/audio/advanced-audio-analyzer';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const analysisType = formData.get('type') as string || 'complete';
    const genre = formData.get('genre') as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    const analyzer = new AdvancedAudioAnalyzer();
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let result;

    switch (analysisType) {
      case 'mix':
        result = await analyzer.analyzeMixQuality(buffer);
        break;
      case 'mastering':
        result = await analyzer.checkMastering(buffer);
        break;
      case 'vocals':
        result = await analyzer.analyzeVocals(buffer);
        break;
      case 'hit-factor':
        if (!genre) {
          return NextResponse.json(
            { error: 'Genre is required for hit factor analysis' },
            { status: 400 }
          );
        }
        result = await analyzer.calculateHitFactor(buffer, genre);
        break;
      case 'complete':
      default:
        result = await analyzer.completeAnalysis(buffer);
        break;
    }

    return NextResponse.json({ success: true, analysis: result });
  } catch (error: any) {
    console.error('Advanced audio analysis API error:', error);
    return NextResponse.json(
      { error: error.message || 'Audio analysis failed' },
      { status: 500 }
    );
  }
}
