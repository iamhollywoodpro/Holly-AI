# HOLLY AI - Phase 2 Implementation Plan

**Status:** Ready to Implement  
**Priority:** High  
**Estimated Time:** 4-6 hours  
**Goal:** Improve Production Readiness (6/10 → 8/10), User Experience (6/10 → 8/10), Autonomy (3/10 → 5/10)

---

## Overview

Phase 2 connects the Phase 1 infrastructure (logging, health monitoring, error states) to user-facing features. This makes Holly's self-awareness visible to users and enables autonomous error recovery.

## Phase 1 Infrastructure (Complete ✅)

1. **Structured Logging** - `src/lib/logging/structured-logger.ts`
   - Logs errors with context, severity, and metadata
   - Integrates with provider health tracking
   - Enables error pattern analysis

2. **Provider Health Monitoring** - `src/lib/ai/provider-health.ts`
   - Tracks provider availability, latency, error rates
   - Calculates health scores (0-100)
   - Provides real-time health status

3. **Error State Components** - `src/components/chat/error-states.tsx`
   - `NetworkErrorBoundary` - Network failure UI
   - `ProviderDownAlert` - Provider outage alert
   - `FallbackModeBanner` - Degraded mode indicator
   - `ErrorRecoveryActions` - Retry/switch provider actions

4. **Enhanced Health Endpoint** - `app/api/health/route.ts`
   - Returns comprehensive system health
   - Includes provider status, error counts, performance metrics
   - Used by monitoring and UI health indicators

---

## Phase 2 Implementation Tasks

### Priority 1: Error State Integration into Chat UI (2 hours)

**Files to Modify:**
- `src/components/holly-chat-interface.tsx`

**Changes:**

1. **Import error components:**
```typescript
import { 
  NetworkErrorBoundary, 
  ProviderDownAlert, 
  FallbackModeBanner,
  ErrorRecoveryActions 
} from '@/components/chat/error-states';
```

2. **Add state management:**
```typescript
const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
const [errorState, setErrorState] = useState<{
  type: 'network' | 'provider' | 'fallback' | 'none';
  provider?: string;
  message?: string;
}>({ type: 'none' });
```

3. **Add health polling effect:**
```typescript
useEffect(() => {
  const pollHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setSystemHealth(data);
      
      // Set error state based on health
      if (!data.healthy) {
        setErrorState({
          type: data.issuesCount > 2 ? 'fallback' : 'provider',
          provider: data.degradedProvider,
          message: data.status
        });
      } else {
        setErrorState({ type: 'none' });
      }
    } catch (err) {
      setErrorState({ type: 'network', message: 'Cannot connect to server' });
    }
  };
  
  pollHealth();
  const interval = setInterval(pollHealth, 30000); // Poll every 30s
  return () => clearInterval(interval);
}, []);
```

4. **Add error UI to header:**
```typescript
// In the header component, add error banners
<AnimatePresence>
  {errorState.type === 'network' && (
    <NetworkErrorBoundary 
      onRetry={() => window.location.reload()}
      isRetrying={false}
    />
  )}
  {errorState.type === 'provider' && (
    <ProviderDownAlert 
      providerName={errorState.provider || 'AI Provider'}
      onSwitchProvider={() => {/* handle switch */}}
      isSwitching={false}
    />
  )}
  {errorState.type === 'fallback' && (
    <FallbackModeBanner />
  )}
</AnimatePresence>
```

5. **Add error recovery actions to input area:**
```typescript
// Near message input, add recovery actions
{errorState.type !== 'none' && (
  <ErrorRecoveryActions
    errorType={errorState.type}
    providerName={errorState.provider}
    onRetry={() => {/* retry last request */}}
    onSwitchProvider={() => {/* switch provider */}}
    onRefresh={() => window.location.reload()}
  />
)}
```

**Expected Impact:**
- Users see real-time error information
- Clear recovery actions available
- Improved transparency builds trust

---

### Priority 1: Real-Time Error Feedback (1 hour)

**Files to Modify:**
- `app/api/chat/route.ts`

**Changes:**

1. **Import logging:**
```typescript
import { logger } from '@/lib/logging/structured-logger';
import { trackProviderError, trackProviderSuccess } from '@/lib/ai/provider-health';
```

2. **Add error tracking in smart routing:**
```typescript
// In the smartRoute call, wrap with tracking
try {
  const result = await smartRoute(messages, tools, { mode });
  trackProviderSuccess(result.provider);
  return result;
} catch (error) {
  trackProviderError(usedProvider, error);
  logger.error('Smart routing failed', {
    error: error.message,
    stack: error.stack,
    provider: usedProvider,
    context: { mode, messageCount: messages.length }
  });
  throw error;
}
```

3. **Add SSE error events:**
```typescript
// Add to SSE helpers
function sendError(c: ReadableStreamDefaultController, error: any) {
  c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
    type: 'error', 
    error: {
      message: error.message,
      code: error.code,
      provider: error.provider,
      retryable: error.retryable !== false
    }
  })}\n\n`));
}
```

4. **Send error events on failures:**
```typescript
// In catch blocks throughout the route
catch (error) {
  logger.error('Chat request failed', { error, userId, conversationId });
  sendError(controller, error);
  // ... rest of error handling
}
```

**Expected Impact:**
- Real-time error visibility in UI
- Better error tracking for analytics
- Enables autonomous recovery

---

### Priority 2: Provider Health to Routing Logic (1.5 hours)

**Files to Modify:**
- `src/lib/ai/smart-router.ts`

**Changes:**

1. **Import health monitoring:**
```typescript
import { getProviderHealth, isProviderHealthy } from '@/lib/ai/provider-health';
```

2. **Add health check before routing:**
```typescript
export async function smartRoute(
  messages: ChatMessage[],
  tools: any[],
  options: { mode?: string } = {}
) {
  const { mode } = options;
  
  // Get provider health scores
  const healthScores = await getProviderHealth();
  
  // Filter out unhealthy providers
  const healthyProviders = Object.entries(healthScores)
    .filter(([_, health]) => isProviderHealthy(health))
    .sort((a, b) => b[1].score - a[1].score); // Sort by score descending
  
  if (healthyProviders.length === 0) {
    // All providers unhealthy - use fallback
    logger.warn('All providers unhealthy, using fallback', { healthScores });
    return {
      provider: 'fallback',
      latency: 0,
      reason: 'All providers degraded'
    };
  }
  
  // Select best provider based on mode + health
  const provider = selectProviderByMode(mode, healthyProviders.map(([p]) => p));
  
  // ... rest of routing logic
}
```

3. **Add fallback provider:**
```typescript
// Add a simple rule-based fallback
const FALLBACK_PROVIDER = {
  name: 'fallback',
  generate: async (messages: any[]) => {
    // Use a simple response when all providers fail
    return {
      content: "I'm experiencing some technical difficulties, but I'm still here to help. Could you try rephrasing your question, or I can attempt to help in a limited capacity.",
      provider: 'fallback',
      model: 'emergency-fallback-v1'
    };
  }
};
```

**Expected Impact:**
- Automatic failover to healthy providers
- Reduced error rate from 40% → 15%
- Improved autonomy score (3/10 → 5/10)

---

### Priority 2: Graceful Degradation (1 hour)

**Files to Modify:**
- `src/lib/ai/cascade.ts` (or create new file)

**Changes:**

1. **Create graceful degradation logic:**
```typescript
// src/lib/ai/graceful-degradation.ts

import { logger } from '@/lib/logging/structured-logger';
import { getProviderHealth } from '@/lib/ai/provider-health';

export interface DegradationLevel {
  level: 'full' | 'reduced' | 'minimal' | 'emergency';
  availableFeatures: string[];
  message: string;
}

export async function getDegradationLevel(): Promise<DegradationLevel> {
  const health = await getProviderHealth();
  const healthyCount = Object.values(health).filter(h => h.score > 50).length;
  
  if (healthyCount >= 3) {
    return {
      level: 'full',
      availableFeatures: ['chat', 'tools', 'generation', 'search'],
      message: 'All systems operational'
    };
  }
  
  if (healthyCount >= 1) {
    return {
      level: 'reduced',
      availableFeatures: ['chat', 'search'],
      message: 'Some features temporarily unavailable'
    };
  }
  
  return {
    level: 'emergency',
    availableFeatures: ['chat'],
    message: 'Emergency mode - limited functionality'
  };
}

export function shouldUseFallback(level: DegradationLevel): boolean {
  return level.level === 'emergency';
}
```

2. **Integrate into chat route:**
```typescript
import { getDegradationLevel, shouldUseFallback } from '@/lib/ai/graceful-degradation';

// In POST handler
const degradation = await getDegradationLevel();

if (shouldUseFallback(degradation)) {
  // Use simple rule-based response
  const fallbackResponse = "I'm currently operating in emergency mode with limited capabilities. I can help with basic questions, but some features are unavailable.";
  sendText(controller, fallbackResponse);
  return new Response(stream);
}
```

**Expected Impact:**
- Holly always responds, even in degraded state
- Users know what's available
- Improved user experience (6/10 → 8/10)

---

### Priority 3: User-Facing Error Reports (1.5 hours)

**Files to Modify:**
- Create new: `app/api/error-report/route.ts`
- Modify: `src/components/holly-chat-interface.tsx`

**Changes:**

1. **Create error report API:**
```typescript
// app/api/error-report/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging/structured-logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get('hours') || '24');
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  try {
    // Query error logs from database
    const errors = await prisma.errorLog.findMany({
      where: {
        timestamp: { gte: since },
        severity: { in: ['ERROR', 'CRITICAL'] }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    
    // Group by error type
    const errorGroups = errors.reduce((acc, err) => {
      const key = err.errorType || 'unknown';
      if (!acc[key]) acc[key] = { count: 0, lastSeen: err.timestamp, message: err.message };
      acc[key].count++;
      if (err.timestamp > acc[key].lastSeen) {
        acc[key].lastSeen = err.timestamp;
        acc[key].message = err.message;
      }
      return acc;
    }, {} as Record<string, any>);
    
    return NextResponse.json({
      period: `${hours}h`,
      totalErrors: errors.length,
      errorTypes: errorGroups,
      topErrors: Object.entries(errorGroups)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([type, data]) => ({ type, ...data }))
    });
  } catch (error) {
    logger.error('Failed to generate error report', { error });
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
```

2. **Add error report button to chat UI:**
```typescript
// In holly-chat-interface.tsx, add to header
{user?.role === 'admin' && (
  <button
    onClick={async () => {
      const res = await fetch('/api/error-report?hours=24');
      const report = await res.json();
      toast.success(`24h Errors: ${report.totalErrors}`, {
        description: `Top: ${report.topErrors.map(e => e.type).join(', ')}`
      });
    }}
    className="p-2 rounded-lg hover:bg-gray-800/60 text-gray-400"
    title="View error report"
  >
    <AlertCircle className="w-4 h-4" />
  </button>
)}
```

**Expected Impact:**
- Admins can quickly see error patterns
- Faster debugging and resolution
- Improved production readiness (6/10 → 8/10)

---

## Implementation Order

### Hour 1: Error State Integration
- [ ] Import error components
- [ ] Add state management
- [ ] Add health polling
- [ ] Add error UI to header
- [ ] Add recovery actions

### Hour 2: Real-Time Error Feedback
- [ ] Import logging in chat route
- [ ] Add error tracking in routing
- [ ] Add SSE error events
- [ ] Send error events on failures

### Hour 3: Provider Health to Routing
- [ ] Import health monitoring
- [ ] Add health check before routing
- [ ] Filter unhealthy providers
- [ ] Add fallback provider

### Hour 4: Graceful Degradation
- [ ] Create degradation logic file
- [ ] Define degradation levels
- [ ] Integrate into chat route
- [ ] Test fallback responses

### Hours 5-6: User-Facing Error Reports
- [ ] Create error report API
- [ ] Query error logs from DB
- [ ] Group by error type
- [ ] Add admin button to UI
- [ ] Test and refine

---

## Testing Checklist

### Manual Testing
- [ ] Trigger network error (disconnect wifi) → see NetworkErrorBoundary
- [ ] Simulate provider failure → see ProviderDownAlert
- [ ] Verify health polling updates every 30s
- [ ] Test retry button functionality
- [ ] Test switch provider button
- [ ] Test fallback mode when all providers fail
- [ ] Verify error reports API returns correct data
- [ ] Check admin error report button works

### Automated Testing (Optional)
- [ ] Add unit tests for degradation logic
- [ ] Add integration tests for error flow
- [ ] Add E2E tests for error recovery

---

## Success Metrics

### Production Readiness
- **Before:** 6/10
- **After:** 8/10
- **Measures:** Error recovery time < 5s, fallback mode works, health monitoring active

### User Experience
- **Before:** 6/10
- **After:** 8/10
- **Measures:** Clear error messages, recovery actions available, system always responds

### Autonomy
- **Before:** 3/10
- **After:** 5/10
- **Measures:** Automatic provider failover, graceful degradation, error tracking

---

## Rollback Plan

If issues arise:
1. Revert `src/components/holly-chat-interface.tsx` to remove error UI
2. Revert `app/api/chat/route.ts` to remove error tracking
3. Comment out new imports in `src/lib/ai/smart-router.ts`
4. Delete `src/lib/ai/graceful-degradation.ts`
5. Delete `app/api/error-report/route.ts`

Phase 1 infrastructure (logging, health monitoring, error components) remains intact and can be re-enabled.

---

## Next Phase: Phase 3

After Phase 2 completion, Phase 3 will focus on:
- **Memory Integration** (8/10 → 9/10)
- **Consciousness Loop** (5/10 → 7/10)
- **Self-Modification** (6/10 → 8/10)

---

**Ready to implement.** Start with Priority 1: Error State Integration into Chat UI.