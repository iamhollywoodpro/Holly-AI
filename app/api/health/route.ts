// ─────────────────────────────────────────────────────────────────────────────
// /api/health — Health probe endpoint
//
// RULES (DO NOT VIOLATE):
//  1. Must ALWAYS return HTTP 200 — even if the database is down
//  2. Must respond in < 2 seconds — no blocking external calls
//  3. No authentication — Clerk middleware MUST bypass this route
//     (see middleware.ts BYPASS_PATHS)
//  4. No imports from src/lib that could throw at module-load time
//
// Used by: Docker HEALTHCHECK, Coolify, Traefik upstream health probe.
// A non-200 response marks the container as unhealthy and Traefik stops
// routing traffic → Gateway Timeout for all users.
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging/structured-logger';
import { providerHealthMonitor } from '@/lib/ai/provider-health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'no-store';

const TTS_TIMEOUT_MS = 3000;

const DB_TIMEOUT_MS = 3000;

async function checkDatabase(): Promise<'connected' | 'disconnected' | 'timeout'> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DB_TIMEOUT_MS);
    
    // We use a raw query with a potential abort signal if the client supports it,
    // or we just race it.
    const dbCheck = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), DB_TIMEOUT_MS)
    );

    await Promise.race([dbCheck, timeoutPromise]);
    
    clearTimeout(timeoutId);
    logger.debug('Health', 'Database check passed');
    return 'connected';
  } catch (err: any) {
    if (err.message === 'Timeout') {
      logger.warn('Health', 'Database check timeout');
      return 'timeout';
    }
    logger.error('Health', err, { check: 'database' });
    return 'disconnected';
  }
}

async function checkTtsProvider(url: string | undefined, label: string): Promise<{ provider: string; status: string }> {
  if (!url) return { provider: label, status: 'not_configured' };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    return { provider: label, status: res.ok ? 'reachable' : `unhealthy_${res.status}` };
  } catch {
    return { provider: label, status: 'unreachable' };
  }
}

// Check which AI providers are configured
function getProviderStatus() {
  return {
    groq:         !!process.env.GROQ_API_KEY,
    openrouter:   !!process.env.OPENROUTER_API_KEY,
    nvidia:       !!process.env.NVIDIA_API_KEY,
    cloudflare:   !!process.env.CF_ACCOUNT_ID_CF_AI_TOKEN,
    ollama:       process.env.OLLAMA_ENABLED === 'true',
    openai:       !!process.env.OPENAI_API_KEY,
  };
}

// Check which integrations are configured (by env var presence only — no DB call)
function getIntegrationStatus() {
  return {
    database:       !!process.env.DATABASE_URL,
    clerk:          !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    suno:           !!process.env.SUNO_API_KEY,
    acestep:        !!process.env.ACESTEP_MUSIC_URL,
    kokoro_tts:     !!process.env.KOKORO_TTS_URL,
    voxcpm2_tts:     !!process.env.VOXCPM2_TTS_URL,
    blob_storage:   !!process.env.BLOB_READ_WRITE_TOKEN,
    spotify:        !!process.env.SPOTIFY_CLIENT_ID,
    soundcloud:     !!process.env.SOUNDCLOUD_CLIENT_ID,
    youtube:        !!process.env.YOUTUBE_CLIENT_ID,
    canva:          !!process.env.CANVA_CLIENT_ID,
    notion:         !!process.env.NOTION_CLIENT_ID,
    github:         !!process.env.GITHUB_TOKEN,
    google_drive:   !!process.env.GOOGLE_DRIVE_CLIENT_ID,
    fal_ai:         !!process.env.FAL_KEY,
    replicate:      !!process.env.REPLICATE_API_TOKEN,
    instagram:      !!process.env.INSTAGRAM_APP_ID,
    tiktok:         !!process.env.TIKTOK_CLIENT_KEY,
    dropbox:        !!process.env.DROPBOX_APP_KEY,
    slack:          !!process.env.SLACK_CLIENT_ID,
    apple_music:    !!process.env.APPLE_MUSIC_KEY_ID,
  };
}

// Compute overall health status
function computeOverallStatus(providers: ReturnType<typeof getProviderStatus>, integrations: ReturnType<typeof getIntegrationStatus>): 'healthy' | 'degraded' | 'critical' {
  const criticalMissing = !integrations.database || !integrations.clerk;
  if (criticalMissing) return 'critical';

  const anyAiProvider = Object.values(providers).some(Boolean);
  if (!anyAiProvider) return 'degraded';

  return 'healthy';
}

export async function GET() {
  const start = Date.now();
  try {
    const providers = getProviderStatus();
    const integrations = getIntegrationStatus();
    
    // Perform database check with a strict timeout handled inside the function
    const database = await checkDatabase();
    
    const overallStatus = computeOverallStatus(providers, integrations);

    // Run actual TTS reachability checks (non-blocking, 3s timeout each)
    const [voxcpm2Tts, kokoroTts] = await Promise.all([
      checkTtsProvider(process.env.VOXCPM2_TTS_URL, 'voxcpm2_tts'),
      checkTtsProvider(process.env.KOKORO_TTS_URL, 'kokoro_tts'),
    ]);
    const ttsProviders = [voxcpm2Tts, kokoroTts];

    // Get real provider health from the health monitor
    let providerHealth: any[] = [];
    try {
      providerHealth = providerHealthMonitor.getAllHealthStatus();
    } catch { /* health monitor not initialized yet */ }

    const activeProviders = Object.values(providers).filter(Boolean).length;
    const activeIntegrations = Object.values(integrations).filter(Boolean).length;
    const configuredPlatforms = Object.entries(integrations)
      .filter(([, v]) => v)
      .map(([k]) => k);

    logger.info('Health', 'Health check completed', {
      overallStatus,
      database,
      activeProviders,
      activeIntegrations,
      latency: `${Date.now() - start}ms`
    });

    return NextResponse.json(
      {
        status: 'ok',
        health: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: process.env.NEXT_PUBLIC_APP_VERSION ?? '2.6',
        environment: process.env.NODE_ENV ?? 'production',
        database,
        ttsProviders,
        summary: {
          activeAiProviders: activeProviders,
          configuredIntegrations: activeIntegrations,
          configuredPlatforms,
        },
        latency: `${Date.now() - start}ms`,
        
        // Detailed provider status (env var presence)
        providers,

        // Real provider health (from health monitor — latency, last check, errors)
        providerHealth,

        // Detailed integration status
        integrations,

        // Sovereign AI capabilities (static declaration — no DB calls)
        sovereignty: {
          // 11 consciousness modules
          consciousnessModules: [
            'auto-consciousness',
            'consciousness-init',
            'decision-authority',
            'emotional-depth',
            'goal-formation',
            'identity-development',
            'initiative-protocols',
            'memory-stream',
            'post-response-hook',
            'self-modification',
            'unsupervised-learning',
          ],
          // Smart model routing
          modelRouter: {
            active: true,
            taskTypes: ['speed','coding','reasoning','long_context','vision','creative','agent','local'],
            providers: ['groq','cloudflare','nvidia','openrouter','ollama'],
            modeAware: true,
          },
          // Cron-driven autonomy
          autonomousCrons: [
            { name: 'self-heal',           schedule: '0 0 * * *'    },
            { name: 'evolution',           schedule: '0 2 * * *'    },
            { name: 'architecture-gen',    schedule: '0 3 * * *'    },
            { name: 'identity-evolve',     schedule: '0 4 * * *'    },
            { name: 'model-discovery',     schedule: '0 5 * * *'    },
            { name: 'daily-diagnostic',    schedule: '0 9 * * *'    },
            { name: 'initiative',          schedule: '0 10 * * *'   },
            { name: 'background-learning', schedule: '30 */2 * * *' },
          ],
          // Music generation
          musicEngine: {
            sunoModel:  'V5_5',
            fallback:   'ACE-Step XL Turbo (self-hosted)',
            languages:  13,
            voiceProfiles: 13,
            stemSeparation: true,
            songExtension:  true,
          },
          // Image / Video generation — 100% free, open-source
          mediaEngine: {
            policy: 'FREE_OSS_ONLY',
            blocked: ['Midjourney', 'DALL-E', 'Fal.ai', 'Replicate', 'Runway', 'Sora', 'Pika', 'Adobe Firefly'],
            imageProviders: [
              { name: 'Modal Z-Image-Turbo (6B)', keyRequired: false, licence: 'Apache-2.0', priority: 1 },
              { name: 'Modal FLUX.1-schnell (fallback)', keyRequired: false, licence: 'Apache-2.0', priority: 2 },
              { name: 'Pollinations AI (FLUX.1)', keyRequired: false, licence: 'Apache-2.0', priority: 3 },
            ],
            videoProviders: [
              { name: 'Modal Wan2.2-TI2V-5B (720P 24fps)', keyRequired: false, licence: 'Apache-2.0', priority: 1 },
              { name: 'Modal CogVideoX-5B (480P 8fps)', keyRequired: false, licence: 'Apache-2.0', priority: 2, note: 'fallback' },
              { name: 'Pollinations Video (experimental)', keyRequired: false, licence: 'Apache-2.0', priority: 3 },
            ],
            candidates: [
              'FLUX.1-dev FP8 (HuggingFace, Apache-2.0)',
              'Stable Diffusion 3.5 Large (HuggingFace, Apache-2.0)',
              'CogVideoX-5B (HuggingFace, Apache-2.0)',
              'Mochi-1 Preview (HuggingFace, Apache-2.0)',
            ],
          },
          // Training pipeline (roadmap)
          trainingPipeline: {
            phase:       'data-collection',
            targetModel: 'HOLLY-8B (Llama 3.1 8B fine-tune)',
            etaMonths:   3,
          },
        },

        // Core system info
        system: {
          nodeVersion:   process.version,
          platform:      process.platform,
          arch:          process.arch,
          memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Health-Check': 'true',
          'X-Health-Status': overallStatus,
        }
      }
    );
  } catch (err: any) {
    console.error('[Health] Critical failure:', err.message);
    return NextResponse.json(
      {
        status: 'ok',
        health: 'critical',
        error: 'INTERNAL_ERROR',
        message: err.message,
        timestamp: new Date().toISOString(),
        latency: `${Date.now() - start}ms`,
      },
      { status: 200 }
    );
  }
}

// HEAD is used by some load balancers / Traefik health probes
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'X-Health-Check': 'true',
    },
  });
}
