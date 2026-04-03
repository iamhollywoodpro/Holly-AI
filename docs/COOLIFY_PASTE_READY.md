# HOLLY — Coolify Environment Variables (PASTE READY)
# ✅ = value known/generated   ← = YOU must fill this from Vercel
# Generated: 2026-04-02

# ════════════════════════════════════════════════════════════
# 🔴 GROUP 1 — CRITICAL
# ════════════════════════════════════════════════════════════

NODE_ENV=production
NEXT_PUBLIC_APP_NAME=HOLLY
NEXT_PUBLIC_APP_URL=http://40.233.70.207:3000
DATABASE_URL=postgresql://neondb_owner:npg_8vybX2qBuDEe@ep-morning-unit-ad2ywa27-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
INTERNAL_API_SECRET=75264cc49ec75e0b3d815ff231344d38151d2875e53d609a383347995f8de911
CRON_SECRET=4384c1dbf73c34cef0ddade9bb3e088e491dcef254da95450660a3e615628e52

# ════════════════════════════════════════════════════════════
# 🔴 GROUP 2 — CLERK AUTH  ← copy from Vercel
# ════════════════════════════════════════════════════════════

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=← FROM VERCEL
CLERK_SECRET_KEY=← FROM VERCEL
CLERK_WEBHOOK_SECRET=← FROM VERCEL
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# ════════════════════════════════════════════════════════════
# 🟠 GROUP 3 — LLM PROVIDERS  ← copy from Vercel
# ════════════════════════════════════════════════════════════

GROQ_API_KEY=← FROM VERCEL
OPENROUTER_API_KEY=← FROM VERCEL
NVIDIA_API_KEY=← FROM VERCEL
CF_ACCOUNT_ID_CF_AI_TOKEN=← FROM VERCEL  (format: accountId|cfApiToken)
HUGGINGFACE_API_KEY=← FROM VERCEL
OPENAI_API_KEY=← FROM VERCEL (optional)
OLLAMA_ENABLED=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# ════════════════════════════════════════════════════════════
# 🟠 GROUP 4 — VOICE / TTS
# ════════════════════════════════════════════════════════════

KOKORO_TTS_URL=https://8880-i15zr19pqhr00nepi3nir-ea026bf9.sandbox.novita.ai
KOKORO_VOICE=af_heart
HOLLY_VOICE_DESCRIPTION=Female voice in her 30s with an American accent. Confident, intelligent, warm tone with clear diction. Professional yet friendly, conversational pacing with emotional depth.
CHATTERBOX_TTS_URL=
HOLLY_TTS_API_KEY=

# ════════════════════════════════════════════════════════════
# 🟠 GROUP 5 — MUSIC
# ════════════════════════════════════════════════════════════

SUNO_API_KEY=← FROM VERCEL
SUNO_BASE_URL=https://api.sunoapi.org/api/v1

# ════════════════════════════════════════════════════════════
# 🟠 GROUP 6 — IMAGE & VIDEO
# ════════════════════════════════════════════════════════════

FAL_KEY=← FROM VERCEL
REPLICATE_API_KEY=← FROM VERCEL
RUNWAY_API_KEY=← FROM VERCEL
HAILUO_API_KEY=
KLING_API_KEY=
LUMA_API_KEY=
PIKA_API_KEY=

# ════════════════════════════════════════════════════════════
# 🟠 GROUP 7 — SEARCH
# ════════════════════════════════════════════════════════════

SERPER_API_KEY=← FROM VERCEL

# ════════════════════════════════════════════════════════════
# 🟡 GROUP 8 — STORAGE
# ════════════════════════════════════════════════════════════

BLOB_READ_WRITE_TOKEN=← FROM VERCEL
KV_REST_API_URL=← FROM VERCEL (if you have Upstash KV)
KV_REST_API_TOKEN=← FROM VERCEL (if you have Upstash KV)

# ════════════════════════════════════════════════════════════
# 🟡 GROUP 9 — GITHUB
# ════════════════════════════════════════════════════════════

GITHUB_TOKEN=← FROM VERCEL
GITHUB_CLIENT_ID=← FROM VERCEL
GITHUB_CLIENT_SECRET=← FROM VERCEL
HOLLY_GITHUB_TOKEN=← FROM VERCEL (same as GITHUB_TOKEN if only one)
HOLLY_GITHUB_OWNER=iamhollywoodpro
HOLLY_GITHUB_REPO=Holly-AI

# ════════════════════════════════════════════════════════════
# 🟡 GROUP 10 — HOLLY INTERNAL
# ════════════════════════════════════════════════════════════

HOLLY_HUB_API_KEY=36c5ba5ab0b17bdd85399657e41baa845ce1f1ac205e11c41396d9dca9291902
AURA_WORKER_URL=← FROM VERCEL (leave blank if not deployed)
AURA_WORKER_TOKEN=← FROM VERCEL (leave blank if not deployed)

# ════════════════════════════════════════════════════════════
# 🟢 GROUP 11 — SPOTIFY
# ════════════════════════════════════════════════════════════

SPOTIFY_CLIENT_ID=← FROM VERCEL
SPOTIFY_CLIENT_SECRET=← FROM VERCEL
SPOTIFY_REDIRECT_URI=http://40.233.70.207:3000/api/spotify/callback

# ════════════════════════════════════════════════════════════
# 🟢 GROUP 12 — YOUTUBE
# ════════════════════════════════════════════════════════════

YOUTUBE_CLIENT_ID=← FROM VERCEL
YOUTUBE_CLIENT_SECRET=← FROM VERCEL
YOUTUBE_REDIRECT_URI=http://40.233.70.207:3000/api/youtube/callback

# ════════════════════════════════════════════════════════════
# 🟢 GROUP 13 — SOUNDCLOUD
# ════════════════════════════════════════════════════════════

SOUNDCLOUD_CLIENT_ID=← FROM VERCEL
SOUNDCLOUD_CLIENT_SECRET=← FROM VERCEL
SOUNDCLOUD_REDIRECT_URI=http://40.233.70.207:3000/api/soundcloud/callback

# ════════════════════════════════════════════════════════════
# 🟢 GROUP 14 — NOTION
# ════════════════════════════════════════════════════════════

NOTION_CLIENT_ID=← FROM VERCEL
NOTION_CLIENT_SECRET=← FROM VERCEL
NOTION_REDIRECT_URI=http://40.233.70.207:3000/api/notion/callback

# ════════════════════════════════════════════════════════════
# 🟢 GROUP 15 — CANVA
# ════════════════════════════════════════════════════════════

CANVA_CLIENT_ID=← FROM VERCEL
CANVA_CLIENT_SECRET=← FROM VERCEL
CANVA_REDIRECT_URI=http://40.233.70.207:3000/api/canva/callback

# ════════════════════════════════════════════════════════════
# 🟢 GROUP 16 — NOTIFICATIONS
# ════════════════════════════════════════════════════════════

RESEND_API_KEY=← FROM VERCEL (if you have one)
SLACK_WEBHOOK_URL=← FROM VERCEL (if you have one)
DISCORD_WEBHOOK_URL=← FROM VERCEL (if you have one)

# ════════════════════════════════════════════════════════════
# 🟢 GROUP 17 — FEATURE FLAGS  ✅ all pre-filled
# ════════════════════════════════════════════════════════════

NEXT_PUBLIC_ENABLE_TRUE_STREAMING=true
NEXT_PUBLIC_ENABLE_MUSIC_GENERATION=true
NEXT_PUBLIC_ENABLE_LYRICS_AI=true
NEXT_PUBLIC_ENABLE_VIDEO_GENERATION=true
NEXT_PUBLIC_ENABLE_ARTIST_CREATION=true
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_MUSIC_STUDIO_VERSION=1.0.0

# ════════════════════════════════════════════════════════════
# 🟢 GROUP 18 — RATE LIMITS  ✅ all pre-filled
# ════════════════════════════════════════════════════════════

RATE_LIMIT_MUSIC_GENERATION=10
RATE_LIMIT_ARTIST_GENERATION=20
RATE_LIMIT_LYRICS_GENERATION=30

# ════════════════════════════════════════════════════════════
# 🟢 GROUP 19 — AUTONOMOUS TUNING  ✅ all pre-filled
# ════════════════════════════════════════════════════════════

ENABLE_AUTONOMOUS_GOALS=true
ENABLE_EMOTIONAL_IMPACT_SCORING=true
ENABLE_MEMORY_STREAM=true
ENABLE_PERSONALITY_EVOLUTION=true
MEMORY_CONSOLIDATION_THRESHOLD=0.7
PERSONALITY_TRAIT_LEARNING_RATE=0.1
GOAL_PATTERN_DETECTION_MIN_OCCURRENCES=3
