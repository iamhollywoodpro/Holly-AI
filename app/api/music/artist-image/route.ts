import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs';


interface ArtistImageRequest {
  name: string
  style?: string
  bio?: string
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      )
    }

    const body: ArtistImageRequest = await req.json() as any
    const { name, style = 'musician', bio = '' } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Artist name is required' },
        { status: 400 }
      )
    }

    console.log('🎨 Generating artist portrait for:', name)

    // Build detailed prompt for artist portrait
    let imagePrompt = `Professional studio portrait photograph of ${name}, a ${style} artist. `
    
    // Add bio context if provided
    if (bio) {
      imagePrompt += `${bio}. `
    }
    
    // Add style-specific descriptions
    const styleDescriptions: Record<string, string> = {
      'pop': 'Modern pop star with vibrant energy, fashionable attire, confident expression',
      'rock': 'Rock musician with edgy style, leather jacket, intense gaze, stage presence',
      'hip-hop': 'Hip-hop artist with urban style, contemporary streetwear, charismatic pose',
      'jazz': 'Jazz musician with sophisticated style, elegant attire, thoughtful expression',
      'classical': 'Classical musician with formal attire, refined posture, artistic elegance',
      'electronic': 'Electronic music producer with modern aesthetic, tech-inspired style',
      'country': 'Country artist with authentic western style, warm personality',
      'r&b': 'R&B artist with smooth style, soulful expression, contemporary fashion',
      'reggae': 'Reggae artist with laid-back style, natural vibes, colorful aesthetic',
      'metal': 'Metal musician with powerful presence, dark aesthetic, intense energy',
      'indie': 'Indie artist with alternative style, creative expression, authentic vibe',
      'folk': 'Folk musician with earthy style, acoustic aesthetic, storyteller presence'
    }

    // Find matching style description
    const normalizedStyle = style.toLowerCase()
    const styleDesc = Object.entries(styleDescriptions).find(([key]) => 
      normalizedStyle.includes(key)
    )?.[1]

    if (styleDesc) {
      imagePrompt += `${styleDesc}. `
    } else {
      imagePrompt += `Professional musician style, artistic presence, confident expression. `
    }

    // Add quality and composition requirements
    imagePrompt += 'Professional studio lighting, high quality photography, 4K resolution, magazine cover worthy, photorealistic, highly detailed. Portrait composition with clean background. NO text, NO watermarks.'

    console.log('📝 Generated prompt:', imagePrompt)

    // Generate image with DALL-E 3
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd', // Use HD quality for best results
        style: 'vivid' // Vivid style for more vibrant, lifelike images
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ DALL-E API error:', errorData)
      throw new Error(`DALL-E API failed: ${response.statusText}`)
    }

    const data = await response.json() as any
    const image_url = data.data[0].url

    console.log('✅ Artist portrait generated successfully')

    return NextResponse.json({
      success: true,
      image_url,
      name,
      prompt: imagePrompt,
    })

  } catch (error) {
    console.error('❌ Artist image generation error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
