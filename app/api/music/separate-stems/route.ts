import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
// REMOVED: Supabase import (migrated to Prisma)

const execAsync = promisify(exec)
// REMOVED: Supabase client (migrated to Prisma)

interface StemSeparationRequest {
  audio_url: string
  song_id: string
  stems?: string[] // e.g., ['vocals', 'drums', 'bass', 'other']
}

interface StemSeparationResponse {
  success: boolean
  song_id: string
  stems: {
    vocals?: string
    drums?: string
    bass?: string
    other?: string
    accompaniment?: string
  }
  processing_time_seconds: number
}

/**
 * STEM SEPARATION API
 * 
 * Separates audio tracks into individual stems using Demucs.
 * 
 * REQUIREMENTS:
 * 1. Python 3.8+ installed
 * 2. Demucs library: pip install demucs
 * 3. FFmpeg installed (for audio processing)
 * 
 * USAGE:
 * POST /api/music/separate-stems
 * {
 *   "audio_url": "https://...",
 *   "song_id": "song-123",
 *   "stems": ["vocals", "drums", "bass", "other"]
 * }
 * 
 * PROCESSING TIME:
 * - Typical: 30-90 seconds per song
 * - Depends on: Song length, CPU power, model quality
 * 
 * MODELS:
 * - htdemucs: Best quality (4 stems: vocals, drums, bass, other)
 * - htdemucs_ft: Fine-tuned version
 * - htdemucs_6s: 6-stem version (adds piano and guitar)
 */

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check if Demucs is installed
    try {
      await execAsync('python3 -c "import demucs"')
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Demucs not installed', 
          message: 'Please install Demucs: pip install demucs',
          installation_guide: 'https://github.com/facebookresearch/demucs'
        },
        { status: 503 }
      )
    }

    const body: StemSeparationRequest = await req.json() as any;
    const { audio_url, song_id, stems = ['vocals', 'drums', 'bass', 'other'] } = body

    if (!audio_url || !song_id) {
      return NextResponse.json(
        { error: 'audio_url and song_id are required' },
        { status: 400 }
      )
    }

    console.log('🎵 Starting stem separation for song:', song_id)

    // Create temporary directory for processing
    const tempDir = path.join('/tmp', `stems-${song_id}-${Date.now()}`)
    await fs.mkdir(tempDir, { recursive: true })

    // Download audio file
    console.log('⬇️ Downloading audio...')
    const audioResponse = await fetch(audio_url)
    if (!audioResponse.ok) {
      throw new Error('Failed to download audio file')
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const inputPath = path.join(tempDir, 'input.mp3')
    await fs.writeFile(inputPath, Buffer.from(audioBuffer))

    // Run Demucs separation
    console.log('🔧 Processing with Demucs...')
    const outputDir = path.join(tempDir, 'output')
    
    // Use htdemucs model (best quality, 4 stems)
    const demucsCommand = `python3 -m demucs.separate -o "${outputDir}" -n htdemucs "${inputPath}"`
    
    try {
      const { stdout, stderr } = await execAsync(demucsCommand, {
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })
      
      console.log('✅ Demucs processing complete')
      if (stderr) console.log('Demucs stderr:', stderr)
    } catch (error) {
      console.error('❌ Demucs processing failed:', error)
      throw new Error('Stem separation processing failed')
    }

    // Upload stems to Supabase Storage
    console.log('☁️ Uploading stems to storage...')
    const stemFiles = await fs.readdir(path.join(outputDir, 'htdemucs', 'input'))
    const uploadedStems: Record<string, string> = {}

    for (const file of stemFiles) {
      const stemName = path.parse(file).name // e.g., 'vocals', 'drums', 'bass', 'other'
      if (!stems.includes(stemName)) continue // Only upload requested stems

      const stemPath = path.join(outputDir, 'htdemucs', 'input', file)
      const stemBuffer = await fs.readFile(stemPath)

      // Upload to Supabase Storage
      const fileName = `${song_id}/${stemName}.wav`
      // TODO: Migrate storage - const ... = await supabase.storage
        .from('song-stems')
        .upload(fileName, stemBuffer, {
          contentType: 'audio/wav',
          upsert: true
        })

      if (uploadError) {
        console.error(`Failed to upload ${stemName}:`, uploadError)
        continue
      }

      // Get public URL
      // TODO: Migrate storage - const ... = supabase.storage
        .from('song-stems')
        .getPublicUrl(fileName)

      uploadedStems[stemName] = urlData.publicUrl
      console.log(`✅ Uploaded ${stemName} stem`)
    }

    // Cleanup temporary files
    console.log('🧹 Cleaning up temporary files...')
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error)
    }

    const processingTime = (Date.now() - startTime) / 1000

    console.log(`✅ Stem separation complete in ${processingTime.toFixed(2)}s`)

    const response: StemSeparationResponse = {
      success: true,
      song_id,
      stems: uploadedStems,
      processing_time_seconds: processingTime
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Stem separation error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        processing_time_seconds: (Date.now() - startTime) / 1000
      },
      { status: 500 }
    )
  }
}

/**
 * INSTALLATION INSTRUCTIONS
 * 
 * 1. Install Python 3.8+:
 *    - macOS: brew install python3
 *    - Ubuntu: sudo apt install python3 python3-pip
 *    - Windows: Download from python.org
 * 
 * 2. Install Demucs:
 *    pip install demucs
 * 
 * 3. Install FFmpeg:
 *    - macOS: brew install ffmpeg
 *    - Ubuntu: sudo apt install ffmpeg
 *    - Windows: Download from ffmpeg.org
 * 
 * 4. Verify installation:
 *    python3 -c "import demucs; print('Demucs installed!')"
 * 
 * 5. Create Supabase Storage bucket:
 *    - Bucket name: 'song-stems'
 *    - Public access: Yes
 *    - File size limit: 50MB per file
 * 
 * ALTERNATIVE: Use SunoAPI.org's stem separation
 * If you don't want to run Demucs locally, you can use SunoAPI.org:
 * 
 * POST https://api.sunoapi.org/api/v1/generate/stem
 * {
 *   "taskId": "original-song-task-id"
 * }
 * 
 * This is easier but costs credits on SunoAPI.org
 */
