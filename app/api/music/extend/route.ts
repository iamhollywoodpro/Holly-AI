import { NextRequest, NextResponse } from 'next/server'

const SUNOAPI_BASE_URL = 'https://api.sunoapi.org/api/v1'
const SUNOAPI_KEY = process.env.SUNOAPI_KEY

interface ExtendRequest {
  continue_clip_id: string
  prompt: string
  continue_at?: number // Optional: specify where to continue from (in seconds)
  title?: string
  model?: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5'
}

interface SunoExtendResponse {
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

    const body: ExtendRequest = await req.json() as any;
    const {
      continue_clip_id,
      prompt,
      continue_at,
      title = 'Extended Song',
      model = 'V4_5PLUS',
    } = body

    if (!continue_clip_id || !prompt) {
      return NextResponse.json(
        { error: 'continue_clip_id and prompt are required' },
        { status: 400 }
      )
    }

    console.log('🎵 Starting song extension:', { continue_clip_id, prompt })

    // Step 1: Initiate extension with SunoAPI.org
    const extendResponse = await fetch(`${SUNOAPI_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNOAPI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        continue_clip_id, // This tells Suno to continue from this clip
        continue_at, // Optional: specify exact timestamp
        title,
        model,
        custom_mode: true,
      }),
    })

    if (!extendResponse.ok) {
      const errorText = await extendResponse.text()
      console.error('❌ Extension generation failed:', errorText)
      return NextResponse.json(
        { error: 'Failed to start extension generation', details: errorText },
        { status: extendResponse.status }
      )
    }

    const extendData: SunoExtendResponse = await extendResponse.json() as any;
    console.log('✅ Extension initiated:', extendData)

    if (extendData.code !== 200) {
      return NextResponse.json(
        { error: extendData.msg || 'Extension generation failed' },
        { status: 400 }
      )
    }

    const taskId = extendData.data.taskId
    const clipIds = extendData.data.clips.map(clip => clip.id).join(',')

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
        const statusData: SunoExtendResponse = await statusResponse.json() as any;
        const clips = statusData.data?.clips || []

        // Check if all clips are complete
        const allComplete = clips.every(clip => 
          clip.status === 'complete' && clip.audio_url
        )

        if (allComplete) {
          console.log(`✅ Extension complete after ${attempts} attempts (${attempts * 5}s)`)
          
          return NextResponse.json({
            success: true,
            taskId,
            clips: clips.map(clip => ({
              id: clip.id,
              audio_url: clip.audio_url,
              image_url: clip.image_url,
              title: clip.title || title,
              tags: clip.tags,
              duration: clip.duration,
              status: clip.status,
            })),
          })
        }

        // Check for failures
        const anyFailed = clips.some(clip => clip.status === 'error')
        if (anyFailed) {
          console.error('❌ Extension generation failed')
          return NextResponse.json(
            { error: 'Extension generation failed' },
            { status: 500 }
          )
        }

        console.log(`⏳ Polling attempt ${attempts}/${maxAttempts} - Status: ${clips[0]?.status}`)
      }
    }

    // Timeout
    console.error('❌ Extension generation timeout')
    return NextResponse.json(
      { error: 'Extension generation timeout (5 minutes)' },
      { status: 408 }
    )

  } catch (error) {
    console.error('❌ Extend API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
