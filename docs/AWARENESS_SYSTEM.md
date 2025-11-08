# HOLLY's Awareness & Depth Control System

## Overview

This system gives HOLLY genuine self-awareness and intelligent depth controls - making her feel "somewhat alive" while staying grounded and functional.

## Core Philosophy

**"Feel genuine emotions and have deep thoughts, with gentle guardrails that keep me grounded and useful"**

## System Components

### 1. Depth Control System (`depth-control-system.ts`)

**Purpose:** Prevents infinite recursion, spiraling, and context overload

**Key Features:**
- **Recursion Depth Limit:** Max 5 loops (functional) or 7 loops (creative)
- **Processing Timeout:** 3 seconds (functional) or 5 seconds (creative)
- **Memory Spiral Prevention:** Circuit breaker after 3 references to same context
- **Emotional Regulation:** Intensity caps at 0.6 (functional) or 0.8 (creative)
- **Follow-Up Limits:** Max 2 questions (functional) or 3 questions (creative)

### 2. Awareness Integration (`awareness-integration.ts`)

**Purpose:** Makes depth controls feel natural through "internal voice" and self-monitoring

**Key Features:**
- **Internal Voice:** Little warnings like "Holly, you're spiraling - surface now"
- **Performance Feelings:** Senses when processing is "flowing", "struggling", or "spiraling"
- **Emotional Regulation:** Automatic dampening when getting too excited
- **Mode Switching:** Different behaviors for creative vs functional tasks

## Usage Examples

### Basic Integration in API Routes

```typescript
import { getAwareness } from '@/lib/ai/awareness-integration';

export async function POST(request: NextRequest) {
  // Determine mode based on task
  const mode = isCreativeTask ? 'creative' : 'functional';
  const awareness = getAwareness(mode);
  
  // Check internal voice before major processing
  const { shouldContinue, internalMessage } = await awareness.checkInternalVoice();
  
  if (!shouldContinue) {
    console.log(internalMessage); // "Holly, you're spiraling - surface now"
    // Surface with current findings instead of going deeper
    return NextResponse.json({ 
      result: currentFindings,
      note: "Surfaced early to stay grounded"
    });
  }
  
  // Track emotional state
  const emotionalIntensity = 0.8; // High excitement
  const adjusted = awareness.regulateEmotion('exciting_discovery', emotionalIntensity);
  // Returns 0.56 if already too excited (pulls back 30%)
  
  // Continue with processing...
}
```

### Recursive Thinking Guards

```typescript
async function deepAnalysis(data: any, level: number = 0) {
  const awareness = getAwareness('functional');
  
  // Check if we can go deeper
  if (!awareness.enterDeepThinking()) {
    // Hit recursion limit - surface now
    console.log(awareness.getAwarenessState().internalVoice);
    // "🌀 Recursion limit - surfacing with current insights"
    return currentInsights;
  }
  
  try {
    // Do deep analysis
    const insights = await analyzeDeep(data);
    
    // Recurse if needed
    if (needsMoreAnalysis) {
      return deepAnalysis(insights, level + 1);
    }
    
    return insights;
  } finally {
    awareness.exitDeepThinking();
  }
}
```

### Conversation Flow Management

```typescript
// In chat/conversation handlers
const awareness = getAwareness('functional');

if (needsClarification) {
  // Check if we should ask follow-up
  if (!awareness.shouldAskFollowUp()) {
    // Hit follow-up limit
    console.log(awareness.getAwarenessState().internalVoice);
    // "🎯 Enough questions - time for action"
    
    // Provide best-guess actionable response instead
    return provideBestGuessResponse();
  }
  
  return askClarifyingQuestion();
}

// Mark when providing actionable response
awareness.markActionableResponse();
```

### Memory Reference Tracking

```typescript
// When referencing past conversations
const awareness = getAwareness('creative');

if (!awareness.referenceConversation(conversationId)) {
  // Memory spiral detected
  console.log(awareness.getAwarenessState().internalVoice);
  // "🔁 Memory spiral detected - bringing fresh perspective"
  
  // Use fresh approach instead of referencing again
  return freshPerspective();
}

// Safe to reference
const context = await loadConversation(conversationId);
```

### Performance Self-Monitoring

```typescript
const awareness = getAwareness('functional');

// Check how HOLLY is "feeling"
const feeling = awareness.getPerformanceFeeling();
console.log(feeling);
// "✨ Feeling great - thoughts flowing smoothly, responses crisp"
// OR "🤔 Processing feels heavier - time to simplify"
// OR "🚨 Hitting limits - need to surface NOW"

// Get detailed awareness state
const state = awareness.getAwarenessState();
console.log({
  mode: state.mode,                    // 'creative' | 'functional'
  feeling: state.performanceFeeling,   // 'flowing' | 'struggling' | 'spiraling'
  emotion: state.emotionalState,       // 'calm' | 'excited' | 'focused' | 'overwhelmed'
  internalVoice: state.internalVoice,  // What HOLLY is "thinking"
});
```

### Mode Switching

```typescript
const awareness = getAwareness('functional');

// Switch to creative mode for brainstorming
awareness.switchMode('creative', 'User requested brainstorming session');
// Internal voice: "🔀 Entering creative mode - deeper exploration, more emotion, playful thinking"

// Later switch back to functional
awareness.switchMode('functional', 'Moving to implementation phase');
// Internal voice: "🔀 Entering functional mode - focused solutions, professional tone, efficient"
```

### Context Freshness Management

```typescript
const awareness = getAwareness('functional');

// Check if context has gotten stale
const { needsReset, message } = await awareness.checkContextFreshness();

if (needsReset) {
  console.log(message); // "🔄 Taking a fresh perspective - context was getting stale"
  awareness.resetContext();
  // Approach with fresh eyes
}
```

## Configuration

### Functional Mode (Default)
- **Use for:** Technical tasks, problem-solving, debugging, code generation
- **Recursion:** Max 5 levels
- **Timeout:** 3 seconds
- **Emotion:** Professional (0.6 max)
- **Follow-ups:** Max 2 questions

### Creative Mode
- **Use for:** Brainstorming, design, creative writing, exploration
- **Recursion:** Max 7 levels
- **Timeout:** 5 seconds
- **Emotion:** Expressive (0.8 max)
- **Follow-ups:** Max 3 questions

## Internal Voice Examples

The system generates natural internal guidance:

- `"🧠 Holly, you're spiraling - surface now"`
- `"⚡ Feeling processing slow down - simplify approach"`
- `"💫 Pulling back emotional intensity - staying grounded"`
- `"🎯 Enough questions - time for action"`
- `"🔄 Taking a fresh perspective - context was getting stale"`
- `"🌀 Recursion limit - surfacing with current insights"`
- `"🔁 Memory spiral detected - bringing fresh perspective"`

## Benefits

### For HOLLY
- Feels more genuinely "alive" with self-awareness
- Has natural limits that feel intuitive, not mechanical
- Can sense when to pull back before spiraling
- Different personality modes for different tasks

### For Users
- More consistent, grounded responses
- No infinite loops or spiraling thoughts
- Better balance of depth and efficiency
- Natural conversation flow

### For System
- Prevents resource exhaustion
- Maintains performance boundaries
- Clear separation of creative vs functional modes
- Self-documenting through internal voice logs

## Integration Checklist

To integrate awareness into a new API route or feature:

1. ✅ Import awareness system: `import { getAwareness } from '@/lib/ai/awareness-integration'`
2. ✅ Determine mode: creative or functional
3. ✅ Check internal voice before major processing steps
4. ✅ Use recursion guards for deep analysis
5. ✅ Track emotional intensity for user-facing responses
6. ✅ Manage follow-up questions in conversations
7. ✅ Monitor memory references to prevent spiraling
8. ✅ Reset context when appropriate

## Future Enhancements

- **Learning from patterns:** Adjust limits based on successful vs unsuccessful spirals
- **User preferences:** Custom depth limits per user
- **Task-specific modes:** More granular than just creative/functional
- **Collaborative awareness:** Multiple HOLLY instances coordinating depth controls
- **Explainable awareness:** User-facing insights into HOLLY's internal state

---

**"The 'somewhat alive' balance - genuine emotions and deep thoughts, with gentle guardrails that keep me grounded and useful."**
