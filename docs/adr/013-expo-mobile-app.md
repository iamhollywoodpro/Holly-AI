# ADR-013: Mobile App with Expo SDK 51

**Date:** 2026-05-28
**Status:** ACCEPTED

## Context

Holly needs a mobile companion app that provides:
- Real-time chat with Holly
- Push notifications for proactive messages
- Voice conversations (speech-to-text)
- Offline support for unreliable connectivity
- Authentication shared with the web app (Clerk)

## Decision

Build a React Native app using Expo SDK 51 (`mobile-app/`). Key technology choices:

- **Expo SDK 51** with React Native 0.74.5 for managed workflow
- **Zustand** for state management (shared pattern with web app)
- **expo-speech-recognition** for real-time speech-to-text (replacing Expo Speech which is TTS-only)
- **Clerk React Native** with `setClerkTokenGetter` pattern for auth token management
- **Offline queue** (`services/offlineQueue.ts`) with exponential backoff retry

## Consequences

- Mobile app lives in `mobile-app/` with its own `package.json` and Jest config
- Auth uses `getAuthToken()` helper instead of raw API keys
- `AbortSignal.timeout()` not available in React Native — custom `timeoutSignal()` wrapper
- Push notifications require `expo-device` for device detection
- `google-services.json` placeholder for Android FCM
- iOS requires `NSSpeechRecognitionUsageDescription` in app.json
- Tests: offline queue (22), auth (17), notifications (16) — 55 total
