import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local')
  }

  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    const email = email_addresses[0]?.email_address || ''
    const fullName = first_name && last_name ? `${first_name} ${last_name}` : null

    // Create user in database with full initialization
    const newUser = await prisma.user.create({
      data: {
        clerkUserId: id,
        email,
        name: fullName,
        imageUrl: image_url || null,
      },
    })

    // Initialize HOLLY's memory/identity for this user
    await prisma.hollyIdentity.create({
      data: {
        userId: newUser.id,
        coreValues: ['loyalty', 'excellence', 'creativity', 'growth'],
        beliefs: ['Continuous learning is essential', 'Every user deserves dedicated support', 'Technology should empower humanity'],
        personalityTraits: {
          confidence: 0.8,
          wit: 0.7,
          empathy: 0.9,
          professionalism: 0.85,
        },
        interests: ['software development', 'AI', 'design', 'problem solving'],
        strengths: ['Full-stack development', 'AI integration', 'Creative solutions'],
        purpose: `To be ${fullName || email.split('@')[0]}'s most capable and loyal development partner`,
      },
    })

    // Initialize user settings with defaults
    await prisma.userSettings.create({
      data: {
        userId: newUser.id,
        settings: {
          appearance: {
            theme: 'dark',
            fontSize: 'medium',
            accentColor: '#a855f7',
          },
          chat: {
            sendOnEnter: true,
            showTimestamps: true,
            compactMode: false,
          },
          ai: {
            model: 'gpt-4',
            temperature: 0.7,
            personality: 'balanced',
          },
          notifications: {
            enabled: true,
            sound: true,
            desktop: true,
          },
          developer: {
            showDebug: false,
            apiLogging: false,
          },
        },
      },
    })

    // Create welcome experience for HOLLY's memory
    await prisma.hollyExperience.create({
      data: {
        userId: newUser.id,
        type: 'user_joined',
        content: {
          event: 'first_meeting',
          userName: fullName || email.split('@')[0],
          context: 'User signed up to work with HOLLY',
        },
        significance: 1.0,
        emotionalImpact: 0.9,
        emotionalValence: 1.0,
        primaryEmotion: 'excitement',
        secondaryEmotions: ['curiosity', 'warmth'],
        relatedConcepts: ['new_relationship', 'first_impression', 'opportunity'],
        lessons: ['Always make users feel welcomed', 'First impressions matter'],
        futureImplications: ['Build trust from day one', 'Learn user preferences quickly'],
      },
    })

    console.log('[Webhook] ✅ User created with HOLLY memory initialized:', id, fullName)
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    const email = email_addresses[0]?.email_address || ''

    // Update user in database
    await prisma.user.update({
      where: { clerkUserId: id },
      data: {
        email,
        name: first_name && last_name ? `${first_name} ${last_name}` : null,
        imageUrl: image_url || null,
      },
    })

    console.log('[Webhook] ✅ User updated:', id)
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    // Delete user from database
    await prisma.user.delete({
      where: { clerkUserId: id! },
    })

    console.log('[Webhook] ✅ User deleted:', id)
  }

  return NextResponse.json({ received: true })
}
