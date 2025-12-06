/**
 * HOLLY Speech API Route
 * Handles text-to-speech requests using Oracle AI Speech (MAYA1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSpeech, testConnection, validateOracleConfig } from '@/lib/oracle';

export async function POST(request: NextRequest) {
  try {
    // Validate Oracle configuration
    const configValidation = validateOracleConfig();
    if (!configValidation.valid) {
      return NextResponse.json({
        error: 'Oracle Cloud not configured',
        details: configValidation.errors
      }, { status: 500 });
    }
    
    // Parse request body
    const body = await request.json();
    const { text, voice, languageCode, speakingRate, pitch, volumeGainDb, outputFormat } = body;
    
    if (!text) {
      return NextResponse.json({
        error: 'Missing required field: text'
      }, { status: 400 });
    }
    
    // Generate speech
    const response = await generateSpeech({
      text,
      voice,
      languageCode,
      speakingRate,
      pitch,
      volumeGainDb,
      outputFormat
    });
    
    return NextResponse.json({
      success: true,
      audioContent: response.audioContent,
      contentType: response.contentType,
      duration: response.duration
    });
  } catch (error) {
    console.error('Speech generation error:', error);
    return NextResponse.json({
      error: 'Failed to generate speech',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Test Oracle AI Speech connection
 */
export async function GET(request: NextRequest) {
  try {
    const testResult = await testConnection();
    
    return NextResponse.json({
      status: testResult.success ? 'connected' : 'disconnected',
      message: testResult.message,
      duration: testResult.duration,
      voice: 'MAYA1',
      region: process.env.ORACLE_REGION || 'ca-toronto-1'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
