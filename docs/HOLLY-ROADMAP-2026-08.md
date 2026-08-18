# HOLLY AI — Roadmap v2.1 (2026-08-12, evening)
> Built from 6 verification/research sweeps of the live codebase — every status
> is file:line evidence-backed. Supersedes v2.0 (morning) and the open items
> of HOLLY-PHASE-PLAN.md.
>
> **Steve's standing rules:** NO FAKE DATA — anything not real says so or is deleted.
> Verify before claiming done. Smallest viable change.

---

## ═══ VERIFIED CURRENT STATE (2026-08-12 evening sweep) ═══

| System | State | Evidence |
|---|---|---|
| Chat + identity injection | ✅ WIRED every completion | prompt-builder.ts:148-151 unconditional |
| Memory (embed + store + retrieve) | ✅ WIRED every exchange | chat route:1938 → background-tasks:146 |
| Image gen (Klein + LoRAs) | ✅ Live, Steve-verified | comfyui_klein.py + action-registry.ts |
| Video gen Wan2.2-TI2V-**5B** | ⚠️ Works but PINNED (face deforms on expressions) | video_generate.py:40 |
| Message speaker button (TTS read-aloud) | ✅ BUILT — SpeakButton → /api/voice/synthesize → NVIDIA Magpie | holly-chat-interface.tsx:434 + auto-speak:2787. Needs live API-key verification |
| Music Studio (Suno + Sonauto) | ✅ WIRED — external APIs, NOT Modal | hybrid-studio route:8. **Missing age gate** |
| Chat + image age gate | ✅ WIRED | chat route:333, image routes requireAdult |
| HPRF portability | 🟡 API only, no UI | /api/memory/export|import, zero UI callers |
| Onboarding | 🟡 Engine complete, **users never routed to it** | signup URL config wrong (layout.tsx:123), OnboardingCheck dead+neutered |
| Extensions | 🔴 Install = DB row nothing reads. No activation, no UI | registry.ts:228, no tool registration consumes it |
| Consciousness worker | 🟡 Built, never started | src/workers/consciousness-worker.ts, no scheduler |
| Real-time voice (LiveKit) | 🟡 Component built, imported by nothing, no env, no server | holly2/LiveKitVoiceConversation.tsx |
| Mobile (Expo) / Desktop (Electron) | 🟡 Exist, hardcoded prod URL, never published | mobile-app/services/api.ts:5, desktop-app/main.js:16 |

---

## ═══ PHASE A: TRUTH & SECURITY FINISH ✅ COMPLETE (2026-08-12) ═══
> code/generate|optimize|review deleted (0 callers, fake). suggestions + admin testing/run + architecture/docs → honest 504. Video labels → Wan2.2-TI2V-5B. 8 admin routes identity-fixed. HOLLY-DEPLOY-2024 removed. requireAdmin dead code removed. Terminal: curl/wget dropped, git-subcommand allowlist, rm path safety, force-push block. Music routes age-gated.

### A1 ✅ (2026-08-12) Kill remaining stub routes
- code/generate, code/optimize, code/review (canned), suggestions/generate (silent empty), conversations/summarize (dead duplicate)
- Fix: honest 504s / delete duplicate.

### A2 ✅ (2026-08-12) Fix video metadata labels
- media-generator.ts:186,915 claims "HunyuanVideo 1.5"; endpoint runs Wan2.2-TI2V-5B. Labels → Wan2.2-TI2V-5B (pinned).

### A3 ✅ (2026-08-12) Admin body-trusted userId (~10 subroutes)
- config/update, storage/manage, integrations/manage, testing/run, architecture/*, knowledge/search → use auth().userId.

### A4 ✅ (2026-08-12) Remove 'HOLLY-DEPLOY-2024' hardcoded secret + clean requireAdmin
- migrate route:34; requireAdmin has dead code + weak @nexamusicgroup.com domain fallback.

### A5 ✅ (2026-08-12) Terminal allowlist whole-command validation
- sandbox.ts:206-207 first-token-only today.

### A6 ✅ (2026-08-12) Age gate on music routes
- /api/music/* has auth() but no requireAdult — same standard as chat/images.

---

## ═══ PHASE B: VOICE CLEANUP ✅ B1 DONE (2026-08-12) + REAL-TIME VOICE ═══
> B1 shipped: NVIDIA Magpie sole TTS provider. Deleted: services/kokoro-tts/, 6 orphan voice routes (stream-tts/stream/batch/pipeline/command/personality), 11 dead voice components/libs, Kokoro+VoxCPM2 branches in character engine/synthesize/health/diagnostics/registry, 3 env vars (KOKORO_TTS_URL, KOKORO_VOICE, VOXCPM2_TTS_URL), LiveKit agent now Magpie-backed. Verified: tsc, 2081/2081 Jest, build.
> B2 BLOCKED on live test: NVIDIA_API_KEY only exists in prod env — verify speaker button after next deploy.

### B1 ✅ (2026-08-12) Consolidate TTS on NVIDIA Magpie only
- KEEP (load-bearing chain): enhanced-voice-output.ts → /api/voice/synthesize → holly-voice-character.ts → nvidia-tts-client.ts + emotion-voice-map.ts + verbal-markers.ts
- DELETE: services/kokoro-tts/, voice-handler.ts (0 importers), ambient-synthesizer.ts, voice-personality.ts, bidirectional-controller.ts (with dead enhanced-chat-interface.tsx), stream-tts route (0 callers), VoiceButton/VoiceSettingsModal/VoiceSettingsPanel (0 importers), capabilities/voice-interface.tsx + dashboard
- SIMPLIFY: holly-voice-character.ts (drop kokoro/voxcpm2 branches), synthesize route, health/diagnostic Kokoro+VoxCPM2 checks
- ENV: remove KOKORO_TTS_URL, KOKORO_VOICE, VOXCPM2_TTS_URL from .env.example/docs

### B2 🟠 (blocked: needs prod NVIDIA_API_KEY or local key) Verify Instance 1 live: speaker button reads Holly's messages (NVIDIA key test)

### B3 ⬜ Wire Instance 2: real-time voice call
- Import LiveKitVoiceConversation into chat UI behind "🎙 Voice call" toggle
- Add LIVEKIT_API_KEY/SECRET/URL env (Steve to provision LiveKit server or LiveKit Cloud)
- Verify agent loop: STT → brain-v40 → NVIDIA Magpie → user hears voice, not text

---

## ═══ PHASE C: FIX THE HALF-WIRED SYSTEMS (2–3 days) ═══

### C1 ⬜ Route new users into onboarding (the multiplier)
- Fix signup redirect (CLERK_AFTER_SIGN_UP_URL → /onboarding), revive or delete OnboardingCheck, chat page nudge to /onboarding until complete.

### C2 ⬜ Make extension install REAL
- Install → actually registers the extension's tools/capabilities in the MCP/tool layer (installed = active in chat). This is the difference between a store and a list.

### C3 ⬜ Extensions Store UI (needs C2)
- app/extensions/ browse by suite → install/uninstall → installed panel.

### C4 ⬜ Suggestion engine
- Onboarding answers + behavior → suite suggestions (powers store landing).

### C5 ⬜ Start consciousness worker
- Launch from server.ts (dev) + holly-server.ts (prod). $0 cost — DB only, no LLM calls.
- Persist agent-coordinator in-memory Maps to DB.

### C6 ⬜ HPRF UI
- Settings → "Export my relationship with Holly" / import. 897-line engine already works.

---

## ═══ PHASE D: VIDEO V2 — Wan2.2 I2V-A14B + IDENTITY LORA (researched) ═══

**Decision (researched 2026-08-12): upgrade Wan2.2 TI2V-5B → I2V-A14B, train Holly identity LoRA on I2V-A14B.**
- Our face deformation was the 5B budget variant; A14B high/low-noise split is the community-proven identity path (same LoRA strategy that fixed images).
- Apache 2.0: zero content restrictions, no revenue cap. Largest NSFW video LoRA ecosystem.
- Fits A100 80GB for 5s clips (fp8 + Lightning LoRA; benchmark before committing).
- LTX-2.5 = watch list only (gated weights, $10M revenue threshold, fine-tune-transfer clause, released Aug 11).
- Avoid: HunyuanVideo (EU/UK/KR license ban), Wan 2.5/2.6 (not open-weight).
- **Plan:** D1 deploy A14B test endpoint on Modal → D2 identity comparison vs 5B (Steve's eyes gate) → D3 train identity LoRA on A14B (Civitai, same playbook as combined-v1) → D4 promote or revert.

---

## ═══ PHASE E: DEAD CODE REMOVAL (~½ day) ═══

- E1: 27 dead Prisma models (19/19 spot-checks: zero refs)
- E2: services/modal-training/, gui-test-screenshots/, training-data/, holly-server.js (build artifact)
- E3: env doc cleanup (REPLICATE_API_TOKEN, VERCEL_TOKEN, CF_API_TOKEN unused twins)
- E4 (with B1): voice corpses list

**CANCELLED (July audit myths — do NOT do):** plugins/extensions dedupe, smart-router header, server.ts collapse, VoxCPM2-removal-as-dead-code (it was live — now being removed properly in B1).

---

## ═══ PHASE F: MAKE HOLLY THE GREATEST (post-store) ═══

- F1: 80 extension suite builds (Developer → Music → Business → Social → Web → Creative → Productivity → Research)
- F2: Proactive Holly (morning messages, anniversaries, goal follow-ups — needs C5)
- F3: Memory highlights ("remember when…" callbacks in conversation)
- F4: Mobile/desktop publish (fix hardcoded URLs, iOS submit config)
- F5: Pre-launch hardening: rate-limit backing (currently in-memory Map), k6 load tests, Tier 2/3 age verification (CC/Stripe Identity), independent security audit

---

## ═══ EXECUTION ORDER ═══

```
Phase A (truth+security, 5h) → B1+B2 (voice cleanup + verify speaker, ½ day)
→ C1 (onboarding routing, ½ day) → C2+C3+C4 (extensions real + UI, 2 days)
→ C5 (consciousness, 2h) → B3 (voice call, 1 day) → Phase E (cleanup)
→ Phase D (video v2) → Phase F
```
