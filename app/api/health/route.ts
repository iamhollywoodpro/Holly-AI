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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'no-store';

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
    kokoro_tts:     !!process.env.KOKORO_TTS_URL,
    chatterbox_tts: !!process.env.CHATTERBOX_TTS_URL,
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
  const providers = getProviderStatus();
  const integrations = getIntegrationStatus();
  const overallStatus = computeOverallStatus(providers, integrations);

  // Count active providers
  const activeProviders = Object.values(providers).filter(Boolean).length;
  const activeIntegrations = Object.values(integrations).filter(Boolean).length;
  const configuredPlatforms = Object.entries(integrations)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return NextResponse.json(
    {
      status: 'ok', // Always 'ok' — never change to non-200 status code
      health: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? '2.3',
      environment: process.env.NODE_ENV ?? 'production',

      // Summary counters
      summary: {
        activeAiProviders: activeProviders,
        configuredIntegrations: activeIntegrations,
        configuredPlatforms,
      },

      // Detailed provider status
      providers,

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
          providers: ['groq','cloudflare','nvidia','openrouter','ollama','webllm','bytez'],
          modeAware: true,
        },
        // Cron-driven autonomy
        autonomousCrons: [
          { name: 'self-heal',           schedule: '0 0 * * *'    },
          { name: 'evolution',           schedule: '0 2 * * *'    },
          { name: 'architecture-gen',    schedule: '0 3 * * *'    },
          { name: 'identity-evolve',     schedule: '0 4 * * *'    },
          { name: 'model-discovery',     schedule: '0 5 * * *'    },
          { name: 'initiative',          schedule: '0 9 * * *'    },
          { name: 'background-learning', schedule: '30 */2 * * *' },
        ],
        // Music generation
        musicEngine: {
          sunoModel:  'V5_5',
          languages:  13,
          voiceProfiles: 13,
          stemSeparation: true,
          songExtension:  true,
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
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Health-Check': 'true',
        'X-Health-Status': overallStatus,
      },
    },
  );
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
