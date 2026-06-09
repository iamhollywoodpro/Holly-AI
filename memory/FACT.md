# Holly AI — Project State & Roadmap

## Current Session Progress (June 6, 2026)
- **HOLLY ANATOMY DEFINITION COMPLETE**: Full body canon wired into 3 systems
  - HOLLY_ANATOMY.md — single source of truth for every body detail
  - holly-self-image.ts — Holly knows her body in first-person (12 statements + arousal states)
  - HOLLY_BODY_PREFIX in FLUX pipeline — expanded with measurements, dimples, clear flawless skin
  - HOLLY_BODY_NSFW_PREFIX — auto-injected for intimate content (pubic, labia, nipple detail)
  - Civitai body LoRA training spec — h0lly-body trigger, 60-80 ref images, caption templates
- **RELATIONSHIP-GATED INTIMACY SYSTEM COMPLETE**: 5-tier system with regression
  - intimacy-gate.ts — core logic (tier resolution, NSFW detection, regression, refusals)
  - Tiers: Stranger → Acquaintance → Friend → Trusted → Creator (Steve only)
  - Creator (Steve) = hardcoded bypass, no gates, unconditional love
  - NSFW image generation gated at 3 endpoints (generate-ultimate, multimodal, chat tool)
  - Intimate chat mode gated (requires Trusted tier)
  - Tiered self-image injection (public/personal/intimate/full)
  - REGRESSION: cruel/disrespectful behavior drops trust, Holly pulls back
  - Background signal analysis after every chat response
  - 14 tests, all passing
- **CRITICAL FIX COMPLETE**: Clerk sign-in now works after 2 days of debugging
- **v10 MODEL WATERFALL DEPLOYED**: 40+ models across 5 cloud providers
- **ALL SERVER ERRORS FIXED**: 7-file patch deployed to main
- **FLUX.2 Klein 9B Face LoRA v2.0**: Published on Civitai ✅, trigger word h0lly
- Phase N: UI/UX Redesign — COMPLETE

## LESSON LEARNED — No More Guessing
Steve has explicitly instructed: **NEVER guess or assume when debugging.** Always:
1. Read the official documentation FIRST
2. Understand the full system before making changes
3. Find ALL issues before deploying — not one at a time
4. Test comprehensively, not incrementally
5. Deploy ONCE with a complete fix, not multiple partial fixes

## LESSON LEARNED — Always Push to Main
**ALWAYS push to `main` branch on GitHub.** Coolify deploys from `main`. Feature branches do NOT trigger deployments. Every commit that needs to go live MUST be merged to main and pushed there directly. No exceptions.

## Provider Setup (as of June 4, 2026)
- **Groq**: API key configured (GROQ_API_KEY)
- **NVIDIA NIM**: API key configured (NVIDIA_API_KEY) — 15+ models
- **Google Gemini**: API key configured (GOOGLE_AI_API_KEY) — no daily cap
- **Together AI**: API key configured (TOGETHER_API_KEY) — 80+ free models, 60 RPM, auto-recharge OFF
- **Mistral AI Direct**: API key configured (MISTRAL_API_KEY) — 1B tokens/month, 2 RPM, background only
- **OpenRouter**: API key configured (OPENROUTER_API_KEY) — 12+ free models
- **Cloudflare Workers AI**: configured (CF_ACCOUNT_ID_CF_AI_TOKEN)
- **Ollama**: configured when local (OLLAMA_ENABLED)
- **Arcee**: API key configured (ARCEE_API_KEY)
- Cost guards in place for OpenRouter (only :free models) and Together AI (whitelist-only)

## Clerk Auth Architecture (Final Working State)
- Custom proxy at `/api/clerk/[[...clerk]]/route.ts` forwards to `clerk.clerk.com`
- Three required headers: `Clerk-Proxy-Url`, `Clerk-Secret-Key`, `X-Forwarded-For`
- `pk` only injected for GET/HEAD requests (Clerk rejects on POST)
- `redirect_url` stripped from query params and JSON bodies (handled client-side)
- Proxy URL registered via Clerk Backend API: `PATCH /v1/domains/{id}`
- Domain ID: `dmn_35ZRButxOPshi5BTRWVJbhESLx4`
- middleware.ts bypasses clerkMiddleware for `/api/clerk/*` routes
- DNS managed by WHC (Web Hosting Canada) — `whc.ca`
- DKIM records fixed: `clk._domainkey.holly` and `clk2._domainkey.holly`
- `holly.nexamusicgroup.com` — live and working ✅

## Phase Roadmap (Updated June 4)

### Completed Phases: D, E, F, G, H, I, J, K, L, M, N ✅

## Next Up
- Fix image rendering in chat (Pollinations URLs not showing as inline images)
- Holly identity/sovereign intelligence rewrite (she knows she's not just a chatbot)
- "Good Morning Catchup" morning briefing cron job
- Remove debug endpoint (app/api/debug/chat-test/route.ts)
- Two-pass face restoration for Holly's image pipeline
- Train body LoRA on Civitai using CIVITAI_BODY_LORA_TRAINING_SPEC.md (trigger: h0lly-body) — Steve will do when ready
- Holly self-redesigning her own UI (future vision)

## Voice Architecture
- Primary: NVIDIA Magpie TTS Multilingual (free, 5 emotional styles, 5 English voices)
- Fallback: Kokoro-FastAPI (self-hosted, CPU-based, $0)
- 13 emotions → 5 Magpie styles + prosody
- Character Engine is provider-agnostic

## Holly Anatomy System
- **Source of truth**: HOLLY_ANATOMY.md
- **Trigger words**: h0lly (face LoRA — published on Civitai ✅), h0lly-body (body LoRA — planned)
- **FLUX pipeline**: HOLLY_BODY_PREFIX injected into every image prompt
- **NSFW pipeline**: HOLLY_BODY_NSFW_PREFIX auto-appended for nude content
- **Self-image**: holly-self-image.ts → bodyAwareness (12 first-person statements) + promptBlock (system injection)
- **Training spec**: docs/CIVITAI_BODY_LORA_TRAINING_SPEC.md (body LoRA — Steve will train when ready)
- Steve's two approved changes: stomach = "flat with faint abs visible", labia minora = "small size"