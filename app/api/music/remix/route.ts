import { NextRequest, NextResponse } from 'next/server'

const SUNOAPI_BASE_URL = 'https://api.sunoapi.org/api/v1'
const SUNOAPI_KEY = process.env.SUNOAPI_KEY

interface RemixRequest {
  audio_url: string
  prompt: string
  style?: string
  title?: string
  instrumental?: boolean
  audio_weight?: number // 0.0 to 1.0 - how much original influences output
  style_weight?: number // 0.0 to 1.0 - how much new style influences output
  model?: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5'
}

interface SunoRemixResponse {
  code: number
  msg: string
  data: {
    taskId: string
    clips: Array<{
      id: string
      status: string
      audio_url?: string
      image_url?: string
      title?: string
      tags?: string
      duration?: number
    }>
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!SUNOAPI_KEY) {
      return NextResponse.json(
        { error: 'SUNOAPI_KEY not configured' },
        { status: 500 }
      )
    }

    const body: RemixRequest = await req.json() as any;
    const {
      audio_url,
      prompt,
      style = '',
      title = 'Remixed Track',
      instrumental = false,
      audio_weight = 0.65, // Default: balanced influence from original
      style_weight = 0.65, // Default: balanced influence from new style
      model = 'V4_5PLUS',
    } = body

    if (!audio_url || !prompt) {
      return NextResponse.json(
        { error: 'audio_url and prompt are required' },
        { status: 400 }
      )
    }

    console.log('🎵 Starting remix generation:', { title, prompt, audio_url })

    // Step 1: Initiate remix with SunoAPI.org
    const remixResponse = await fetch(`${SUNOAPI_BASE_URL}/generate/upload-cover`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNOAPI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadUrl: audio_url,
        prompt,
        style,
        title,
        customMode: true,
        instrumental,
        model,
        audioWeight: audio_weight,
        styleWeight: style_weight,
        weirdnessConstraint: 0.5, // Moderate creativity
      }),
    })

    if (!remixResponse.ok) {
      const errorText = await remixResponse.text()
      console.error('❌ Remix generation failed:', errorText)
      return NextResponse.json(
        { error: 'Failed to start remix generation', details: errorText },
        { status: remixResponse.status }
      )
    }

    const remixData: SunoRemixResponse = await remixResponse.json() as any;
    console.log('✅ Remix initiated:', remixData)

    if (remixData.code !== 200) {
      return NextResponse.json(
        { error: remixData.msg || 'Remix generation failed' },
        { status: 400 }
      )
    }

    const taskId = remixData.data.taskId
    const clipIds = remixData.data.clips.map(clip => clip.id).join(',')

    // Step 2: Poll for completion (max 5 minutes)
    const maxAttempts = 60 // 60 attempts * 5 seconds = 5 minutes
    let attempts = 0

    while (attempts < maxAttempts) {
      attempts++
      
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

      const statusResponse = await fetch(
        `${SUNOAPI_BASE_URL}/query?ids=${clipIds}`,
        {
          headers: {
            'Authorization': `Bearer ${SUNOAPI_KEY}`,
          },
        }
      )

      if (statusResponse.ok) {
        const statusData: SunoRemixResponse = await statusResponse.json() as any;
        const clips = statusData.data?.clips || []

        // Check if all clips are complete
        const allComplete = clips.every(clip => 
          clip.status === 'complete' && clip.audio_url
        )

        if (allComplete) {
          console.log(`✅ Remix complete after ${attempts} attempts (${attempts * 5}s)`)
          
          return NextResponse.json({
            success: true,
            taskId,
            clips: clips.map(clip => ({
              id: clip.id,
              audio_url: clip.audio_url,
              image_url: clip.image_url,
              title: clip.title || title,
              tags: clip.tags || style,
              duration: clip.duration,
              status: clip.status,
            })),
          })
        }

        // Check for failures
        const anyFailed = clips.some(clip => clip.status === 'error')
        if (anyFailed) {
          console.error('❌ Remix generation failed')
          return NextResponse.json(
            { error: 'Remix generation failed' },
            { status: 500 }
          )
        }

        console.log(`⏳ Polling attempt ${attempts}/${maxAttempts} - Status: ${clips[0]?.status}`)
      }
    }

    // Timeout
    console.error('❌ Remix generation timeout')
    return NextResponse.json(
      { error: 'Remix generation timeout (5 minutes)' },
      { status: 408 }
    )

  } catch (error) {
    console.error('❌ Remix API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
