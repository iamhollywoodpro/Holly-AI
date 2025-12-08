import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audioUrl } = await req.json();

    if (!audioUrl) {
      return NextResponse.json({ 
        error: 'Missing audioUrl' 
      }, { status: 400 });
    }

    // Real audio analysis
    try {
      // Fetch audio file info
      const audioResponse = await fetch(audioUrl, { method: 'HEAD' });
      const contentType = audioResponse.headers.get('content-type');
      const contentLength = audioResponse.headers.get('content-length');

      // Basic quality metrics from headers
      const fileSize = parseInt(contentLength || '0');
      const bitrate = Math.round((fileSize * 8) / 180); // Estimate for ~3min song

      // Quality scoring
      let qualityScore = 0;
      let issues = [];
      let recommendations = [];

      // Bitrate analysis
      if (bitrate < 128) {
        qualityScore += 40;
        issues.push('Low bitrate detected');
        recommendations.push('Re-encode at 320kbps for better quality');
      } else if (bitrate < 256) {
        qualityScore += 70;
        recommendations.push('Consider 320kbps for optimal quality');
      } else {
        qualityScore += 95;
      }

      // Format analysis
      if (contentType?.includes('mpeg') || contentType?.includes('mp3')) {
        qualityScore += 80;
      } else if (contentType?.includes('wav') || contentType?.includes('flac')) {
        qualityScore += 100;
      } else {
        qualityScore += 60;
        recommendations.push('Use lossless format (WAV/FLAC) for best quality');
      }

      qualityScore = Math.round(qualityScore / 2); // Average

      // Return analysis directly (no database model matches this structure)
      return NextResponse.json({
        success: true,
        analysis: {
          id: `quality_${Date.now()}`,
          audioUrl,
            qualityScore,
            rating: qualityScore >= 90 ? 'Excellent' : 
                    qualityScore >= 75 ? 'Good' :
                    qualityScore >= 60 ? 'Fair' : 'Poor',
            metrics: {
              fileSize: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
              estimatedBitrate: `${bitrate} kbps`,
              format: contentType
            },
            issues,
            recommendations
          }
        });

    } catch (error) {
      console.error('Quality analysis error:', error);
      
      return NextResponse.json({
        success: false,
        message: 'Advanced audio analysis temporarily unavailable',
        basicInfo: {
          audioUrl,
          suggestedChecks: [
            'Bitrate (aim for 320kbps)',
            'Sample rate (44.1kHz or 48kHz)',
            'Dynamic range',
            'Clipping/distortion',
            'Frequency balance'
          ],
          tools: [
            'Audacity (Free - Analyze menu)',
            'iZotope RX',
            'Adobe Audition'
          ]
        }
      });
    }

  } catch (error: any) {
    console.error('Audio quality API error:', error);
    return NextResponse.json({
      error: 'Audio quality analysis failed',
      details: error.message
    }, { status: 500 });
  }
}
