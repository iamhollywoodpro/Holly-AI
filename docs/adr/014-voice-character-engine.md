# ADR-014: Voice Character Engine with NVIDIA Magpie TTS

**Date:** 2026-05-28
**Status:** ACCEPTED

## Context

Holly needs a voice that sounds human — not robotic, not generic TTS. The voice must:

- **Shift noticeably with mood** — excited sounds different from sad, like a real person
- **Include verbal personality markers** — soft laughs, thoughtful "hmm", natural "um", sighs
- **Be free to operate** — no per-character costs that limit usage
- **Map to Holly's existing 11 emotional states** from the Visual Identity Engine
- **Be provider-agnostic** — able to swap TTS providers without rearchitecting

Previous TTS providers:
- **VoxCPM2** — GPU-based, high quality, but burned through Modal credits ($30/month budget at 80%)
- **Kokoro-FastAPI** — CPU-based fallback, free, but no emotional style control

## Decision

Build a **Voice Character Engine** as a provider-agnostic pipeline:

```
Text + Emotion → Verbal Markers → Voice Style Mapping → TTS Provider → Audio
```

### TTS Provider: NVIDIA Magpie TTS Multilingual (primary)

- **Why**: Free API on NVIDIA NIM (already have `NVIDIA_API_KEY` in Coolify), 5 emotional styles, 5 English voices, 22kHz output
- **Credits**: 1,000–5,000 free, 40 req/min rate limit — sufficient for conversational use
- **Voice**: Sofia (primary), Aria (analytical), Jason/Leo/John (future options)
- **Styles**: Happy, Calm, Sad, Angry, Neutral — mapped from Holly's 11 emotions

### Fallback: Kokoro-FastAPI (unchanged)

- CPU-based, self-hosted, $0 cost
- No emotional style control, but reliable fallback

### Architecture

Four new modules in `src/lib/voice/`:

| Module | Purpose |
|--------|---------|
| `emotion-voice-map.ts` | Maps 11 HollyEmotion values → Magpie voice styles + speed/expressiveness |
| `verbal-markers.ts` | Injects personality markers (laughs, hmms, sighs) based on emotion |
| `nvidia-tts-client.ts` | REST client for NVIDIA Magpie API with rate limit handling |
| `holly-voice-character.ts` | Core engine orchestrating the full pipeline |

### Emotion-to-Voice Mapping

| Holly Emotion | Magpie Style | Speed | Expressiveness | Character |
|---------------|-------------|-------|----------------|-----------|
| excited | Happy | 1.25 | 0.95 | Upbeat, genuinely enthusiastic |
| creative | Happy | 1.10 | 0.80 | Playful, spark of inspiration |
| generating | Happy | 1.15 | 0.75 | Productive, confident |
| empathetic | Calm | 0.90 | 0.85 | Soft, tender, deeply present |
| curious | Happy | 1.05 | 0.70 | Light, inquisitive, engaged |
| idle | Calm | 0.95 | 0.40 | Relaxed, natural, present |
| focused | Neutral | 1.00 | 0.30 | Clear, measured, attentive |
| analyzing | Neutral | 0.95 | 0.25 | Thoughtful, precise |
| researching | Neutral | 1.00 | 0.35 | Investigative, engaged |
| contemplative | Calm | 0.85 | 0.60 | Slow, deep, reflective |
| dreaming | Calm | 0.75 | 0.50 | Ethereal, gentle, whispered |

## Consequences

- **Holly's voice is now emotion-aware** — callers send `emotion` param to `/api/voice/synthesize`
- **Backward compatible** — legacy path preserved for callers without emotion context
- **NVIDIA_API_KEY** already configured in Coolify (used for LLM reasoning models)
- **Provider swappable** — replace Magpie with any TTS API by changing `nvidia-tts-client.ts`
- **Verbal markers are deterministic** — same text + emotion always produces same markers (no randomness between plays)
- **Modal budget reduced** — VoxCPM2 apps paused, saving ~$22-25/month
- **37 new tests** covering emotion mapping, verbal markers, blending, and full pipeline
