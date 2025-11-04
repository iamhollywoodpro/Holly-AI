# SunoAPI.org Integration Guide

## ⚠️ IMPORTANT: We Use SunoAPI.org, NOT Official Suno.ai

**Correct Service:** https://sunoapi.org  
**Dashboard:** https://sunoapi.org/dashboard  
**API Docs:** https://sunoapi.org/docs  
**Base URL:** `https://api.sunoapi.org/api/v1`

**❌ We do NOT use:** Official Suno.ai API (`https://api.suno.ai`)

---

## API Configuration

### Environment Variables (.env.local)

```bash
SUNO_API_KEY=c3367b96713745a2de3b1f8e1dde4787
SUNO_BASE_URL=https://api.sunoapi.org/api/v1
```

---

## API Endpoints

### 1. Generate Song

**Endpoint:** `POST /api/v1/generate`

**Headers:**
```json
{
  "Authorization": "Bearer c3367b96713745a2de3b1f8e1dde4787",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "title": "My Song Title",
  "prompt": "Write a song about...",
  "tags": "pop, upbeat, electronic",
  "make_instrumental": false,
  "custom_mode": false
}
```

**Response:** Returns array of clip objects
```json
[
  {
    "id": "clip-id-123",
    "status": "submitted",
    "title": "My Song Title",
    "created_at": "2024-11-04T00:00:00Z"
  }
]
```

### 2. Query Generation Status

**Endpoint:** `GET /api/v1/query?ids=clip-id-1,clip-id-2`

**Headers:**
```json
{
  "Authorization": "Bearer c3367b96713745a2de3b1f8e1dde4787",
  "Content-Type": "application/json"
}
```

**Response:** Returns array of clips with status
```json
[
  {
    "id": "clip-id-123",
    "status": "complete",
    "title": "My Song Title",
    "audio_url": "https://cdn.sunoapi.org/...",
    "image_url": "https://cdn.sunoapi.org/...",
    "image_large_url": "https://cdn.sunoapi.org/...",
    "video_url": "https://cdn.sunoapi.org/...",
    "duration": 180.5,
    "created_at": "2024-11-04T00:00:00Z"
  }
]
```

**Status Values:**
- `submitted` - Initial state
- `processing` - Currently generating
- `complete` - Generation finished successfully
- `error` - Generation failed

---

## Implementation Details

### Async Generation Flow

1. **Submit Generation Request**
   - POST to `/generate` endpoint
   - Receive array of clip IDs
   - Store clip IDs in database

2. **Poll for Status**
   - GET `/query?ids=clip-id-1,clip-id-2`
   - Check every 5 seconds
   - Maximum 60 attempts (5 minutes total)

3. **Handle Completion**
   - Extract `audio_url`, `image_url`, `duration`
   - Update database with final URLs
   - Mark status as `complete` or `failed`

### Code Example

```typescript
// Generate song
const response = await fetch('https://api.sunoapi.org/api/v1/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer c3367b96713745a2de3b1f8e1dde4787',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'My Song',
    prompt: 'A happy pop song about coding',
    tags: 'pop, upbeat',
    make_instrumental: false,
    custom_mode: false,
  }),
});

const clips = await response.json();
const clipIds = clips.map(clip => clip.id);

// Poll for completion
const pollStatus = async () => {
  const statusResponse = await fetch(
    `https://api.sunoapi.org/api/v1/query?ids=${clipIds.join(',')}`,
    {
      headers: {
        'Authorization': 'Bearer c3367b96713745a2de3b1f8e1dde4787',
      },
    }
  );
  
  const updatedClips = await statusResponse.json();
  return updatedClips;
};
```

---

## HOLLY Integration

### File Locations

- **API Route:** `app/api/music/generate/route.ts`
- **Types:** `src/types/music.ts`
- **Hook:** `src/hooks/use-music-generation.ts`

### Features Implemented

✅ **Async Generation with Polling**
- Automatically polls SunoAPI.org every 5 seconds
- Maximum 5-minute timeout
- Returns completed audio URLs

✅ **Database Integration**
- Stores generation status in Supabase
- Updates with final URLs when complete
- Tracks multiple clips per generation

✅ **Error Handling**
- Catches API errors gracefully
- Updates database with failed status
- Returns detailed error messages

✅ **Custom Mode Support**
- Instrumental vs. vocal tracks
- Custom prompts and tags
- Title customization

---

## Testing the Integration

### 1. Check API Key

```bash
curl -X POST https://api.sunoapi.org/api/v1/generate \
  -H "Authorization: Bearer c3367b96713745a2de3b1f8e1dde4787" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Song",
    "prompt": "A short test song",
    "tags": "pop",
    "make_instrumental": true
  }'
```

### 2. Test via HOLLY API

```bash
curl -X POST http://localhost:3000/api/music/generate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "title": "My First Song",
    "lyrics": "This is a test song",
    "style": "pop",
    "language": "en"
  }'
```

### 3. Check Status

```bash
curl http://localhost:3000/api/music/generate?song_id=YOUR_SONG_ID
```

---

## Common Issues & Solutions

### Issue: "Invalid API Key"
**Solution:** Verify key is correct in `.env.local`:
```bash
SUNO_API_KEY=c3367b96713745a2de3b1f8e1dde4787
```

### Issue: "Generation Timeout"
**Solution:** SunoAPI.org can take 2-5 minutes per song. Increase polling timeout:
```typescript
const maxAttempts = 60; // 5 minutes
const delayMs = 5000; // 5 seconds
```

### Issue: "No clips returned"
**Solution:** Check request body format matches SunoAPI.org spec:
- ✅ Use `tags` not `style`
- ✅ Use `prompt` not `lyrics`
- ✅ Include `title`, `make_instrumental`, `custom_mode`

### Issue: Wrong API Being Used
**Solution:** Verify base URL:
```typescript
// ✅ CORRECT
const SUNO_BASE_URL = 'https://api.sunoapi.org/api/v1';

// ❌ WRONG
const SUNO_BASE_URL = 'https://api.suno.ai/v1';
```

---

## Dashboard & Credits

**Dashboard URL:** https://sunoapi.org/dashboard

Monitor:
- API key status
- Credit balance
- Generation history
- Usage statistics

---

## Next Steps

1. ✅ API integration complete
2. ⏳ Test with real generation request
3. ⏳ Connect UI to backend
4. ⏳ Add progress indicators
5. ⏳ Implement error handling in UI

---

**Last Updated:** Day 4 - November 4, 2024  
**Status:** ✅ Integration Complete - Ready for Testing
