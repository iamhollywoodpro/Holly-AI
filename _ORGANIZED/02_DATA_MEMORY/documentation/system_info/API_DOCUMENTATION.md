# HOLLY API Documentation

Complete API reference for all HOLLY capability systems.

---

## 🎯 Vision API

### POST `/api/vision/analyze`
Analyze images using GPT-4 Vision.

**Request Body:**
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "analysisType": "design-review" | "ocr" | "art-style" | "general",
  "prompt": "Optional custom analysis prompt"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "analysis": "Detailed analysis text",
    "confidence": 0.95
  }
}
```

### POST `/api/vision/compare`
Compare two images side-by-side.

**Request Body:**
```json
{
  "imageUrl1": "https://example.com/image1.jpg",
  "imageUrl2": "https://example.com/image2.jpg",
  "comparisonPrompt": "Optional comparison focus"
}
```

---

## 🎤 Voice API

### POST `/api/voice/transcribe`
Convert speech to text using Whisper.

**Request:** Multipart form data
- `audio`: Audio file (File)
- `language`: Language code (string, default: "en")

**Response:**
```json
{
  "success": true,
  "transcription": {
    "text": "Transcribed text here",
    "language": "en",
    "duration": 12.5
  }
}
```

### POST `/api/voice/speak`
Convert text to speech using OpenAI TTS.

**Request Body:**
```json
{
  "text": "Text to speak",
  "voice": "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
  "speed": 1.0
}
```

**Response:**
```json
{
  "success": true,
  "audio": "base64_encoded_audio_data",
  "mimeType": "audio/mpeg"
}
```

### POST `/api/voice/command`
Process voice commands.

**Request:** Multipart form data
- `audio`: Audio file (File)

**Response:**
```json
{
  "success": true,
  "command": {
    "intent": "create_project",
    "parameters": {...},
    "confidence": 0.92
  }
}
```

---

## 🎬 Video API

### POST `/api/video/generate`
Generate videos using Zeroscope and Stable Video Diffusion.

**Request Body:**
```json
{
  "prompt": "A cinematic shot of...",
  "type": "text-to-video" | "image-to-video" | "music-video" | "social-reel",
  "imageUrl": "Optional for image-to-video",
  "duration": 3,
  "fps": 24
}
```

**Response:**
```json
{
  "success": true,
  "video": {
    "url": "https://storage.url/video.mp4",
    "duration": 3,
    "resolution": "512x512"
  }
}
```

---

## 🔍 Research API

### POST `/api/research/web`
Perform web research using Brave Search API.

**Request Body:**
```json
{
  "query": "Research topic",
  "type": "general" | "trend" | "competitor",
  "depth": "quick" | "comprehensive"
}
```

**Response:**
```json
{
  "success": true,
  "research": {
    "summary": "Research summary",
    "sources": [...],
    "insights": [...],
    "recommendations": [...]
  }
}
```

---

## 🎵 Audio Analysis API

### POST `/api/audio/analyze-advanced`
Professional A&R audio analysis using Librosa.

**Request:** Multipart form data
- `audio`: Audio file (File)
- `type`: "complete" | "mix" | "mastering" | "vocals" | "hit-factor"
- `genre`: Required for hit-factor analysis

**Response:**
```json
{
  "success": true,
  "analysis": {
    "overall_score": 8.5,
    "mix_quality": {...},
    "mastering": {...},
    "vocals": {...},
    "hit_factor": {...}
  }
}
```

---

## 🧠 Learning - Contextual Intelligence

### POST `/api/learning/contextual/track`
Track project updates for context building.

**Request Body:**
```json
{
  "projectId": "project-123",
  "update": {
    "type": "milestone" | "decision" | "blocker",
    "description": "Update details",
    "timestamp": "2025-11-03T10:30:00Z"
  }
}
```

### POST `/api/learning/contextual/context`
Retrieve complete project context.

**Request Body:**
```json
{
  "projectId": "project-123"
}
```

**Response:**
```json
{
  "success": true,
  "context": {
    "projectId": "project-123",
    "timeline": [...],
    "decisions": [...],
    "patterns": [...]
  }
}
```

### POST `/api/learning/contextual/patterns`
Detect patterns in project history.

**Request Body:**
```json
{
  "projectId": "project-123"
}
```

---

## 🎨 Learning - Taste Learning

### POST `/api/learning/taste/track`
Track user preferences implicitly.

**Request Body:**
```json
{
  "itemId": "design-456",
  "category": "design" | "music" | "writing" | "code",
  "userAction": "approved" | "rejected" | "modified" | "saved",
  "context": {...}
}
```

### POST `/api/learning/taste/predict`
Predict user preference for new items.

**Request Body:**
```json
{
  "itemId": "new-design-789",
  "category": "design",
  "context": {...}
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "willLike": true,
    "confidence": 0.87,
    "reasoning": "Based on similar preferences..."
  }
}
```

### GET `/api/learning/taste/profile?category=design`
Get complete taste profile.

**Response:**
```json
{
  "success": true,
  "profile": {
    "preferences": {...},
    "patterns": [...],
    "evolution": [...]
  }
}
```

---

## 🔮 Learning - Predictive Creativity

### POST `/api/learning/predictive/generate`
Generate proactive creative concepts.

**Request Body:**
```json
{
  "projectId": "project-123",
  "currentContext": {...}
}
```

**Response:**
```json
{
  "success": true,
  "concepts": [
    {
      "idea": "Concept description",
      "reasoning": "Why this makes sense",
      "confidence": 0.82
    }
  ]
}
```

### POST `/api/learning/predictive/needs`
Predict next project needs.

**Request Body:**
```json
{
  "projectHistory": [...],
  "currentStage": "design" | "development" | "testing"
}
```

### POST `/api/learning/predictive/blockers`
Anticipate potential blockers.

**Request Body:**
```json
{
  "projectData": {...},
  "timeline": {...}
}
```

---

## 📈 Learning - Self Improvement

### POST `/api/learning/self-improvement/analyze`
Analyze HOLLY's own performance.

**Request Body:**
```json
{
  "timeRange": "7d" | "30d" | "90d"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "strengths": [...],
    "weaknesses": [...],
    "improvements_made": [...],
    "next_focus": [...]
  }
}
```

### POST `/api/learning/self-improvement/learn`
Learn new skill autonomously.

**Request Body:**
```json
{
  "skillArea": "new_framework" | "design_pattern" | "optimization_technique"
}
```

### POST `/api/learning/self-improvement/optimize`
Optimize existing workflows.

**Request Body:**
```json
{
  "workflowName": "code_generation",
  "performanceData": {...}
}
```

---

## 🤝 Learning - Collaboration

### POST `/api/learning/collaboration/detect`
Detect user confidence level.

**Request Body:**
```json
{
  "userMessage": "I'm not sure about...",
  "conversationHistory": [...]
}
```

**Response:**
```json
{
  "success": true,
  "mode": {
    "confidence": "low" | "medium" | "high",
    "recommendedApproach": "lead" | "guide" | "follow"
  }
}
```

### POST `/api/learning/collaboration/adapt`
Adapt leadership style dynamically.

**Request Body:**
```json
{
  "userConfidence": 0.65,
  "taskComplexity": "high"
}
```

---

## 🔗 Learning - Cross-Project

### POST `/api/learning/cross-project/patterns`
Find patterns across different domains.

**Request Body:**
```json
{
  "domain1": "music_production",
  "domain2": "web_development"
}
```

**Response:**
```json
{
  "success": true,
  "patterns": [
    {
      "pattern": "Iterative refinement works in both",
      "applications": [...]
    }
  ]
}
```

### POST `/api/learning/cross-project/transfer`
Transfer successful approaches between domains.

**Request Body:**
```json
{
  "sourceProject": "music-album-launch",
  "targetDomain": "app_launch"
}
```

---

## 🔓 Uncensored Router

### POST `/api/uncensored/route`
Route requests to appropriate model (censored/uncensored).

**Request Body:**
```json
{
  "prompt": "User request",
  "context": "adult_content" | "general" | "educational"
}
```

**Response:**
```json
{
  "success": true,
  "recommendation": {
    "useUncensored": true,
    "model": "stable_diffusion_xl",
    "reasoning": "Adult content detected"
  }
}
```

---

## 🔑 Authentication

All API endpoints require authentication via:
- **Header:** `Authorization: Bearer YOUR_API_KEY`
- **Environment Variable:** `HOLLY_API_KEY`

---

## 🚨 Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Descriptive error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

**Common Error Codes:**
- `400` - Bad Request (missing parameters)
- `401` - Unauthorized (invalid API key)
- `500` - Internal Server Error
- `429` - Rate Limit Exceeded

---

## 📊 Rate Limits

- **Free Tier:** 100 requests/hour per endpoint
- **All endpoints:** Combined 1000 requests/day
- **Video generation:** 10 videos/hour (resource intensive)

---

## 🎯 Usage Examples

### JavaScript/TypeScript
```typescript
const response = await fetch('/api/vision/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    imageUrl: 'https://example.com/design.png',
    analysisType: 'design-review',
    prompt: 'Review this UI design for accessibility'
  })
});

const result = await response.json();
console.log(result.result.analysis);
```

### Python
```python
import requests

response = requests.post(
    'https://holly.app/api/voice/transcribe',
    files={'audio': open('recording.wav', 'rb')},
    data={'language': 'en'},
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)

transcription = response.json()['transcription']['text']
print(transcription)
```

---

## 📝 Notes

- All file uploads limited to 50MB
- Audio files: MP3, WAV, M4A, OGG supported
- Image files: JPG, PNG, WebP supported
- Video generation: 3-10 seconds optimal duration
- Web research: Costs 1 Brave API credit per request

---

**Last Updated:** November 3, 2025  
**Version:** 1.0.0  
**Status:** ✅ All 24 API routes operational
