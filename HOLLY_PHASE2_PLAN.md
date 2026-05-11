# HOLLY AI - Phase 2 Implementation Plan

**Date:** May 11, 2026  
**Status:** 🔄 Ready to Start  
**Previous:** Phase 1 Complete (Infrastructure)

---

## Phase 2 Focus: Connect Infrastructure to User-Facing Features

**Goal:** Transform Phase 1 infrastructure into visible user improvements and autonomous capabilities.

**Target Metrics:**
- **Production Readiness:** 6/10 → 8/10 (+2)
- **User Experience:** 6/10 → 8/10 (+2)
- **Autonomy:** 3/10 → 5/10 (+2)
- **Self Modification:** 6/10 (unchanged - Phase 3)

---

## Phase 2 Deliverables

### 1. ✅ Integrate Error States into Chat UI

**Problem:** Error state components exist but aren't connected to chat UI
**Solution:** Update chat components to use error states

**Files to Modify:**
- `app/chat/page.tsx` - Main chat interface
- `src/components/chat/chat-container.tsx` - Chat container (if exists)

**Changes Required:**
```typescript
// Import error states
import { 
  ConnectionError, 
  ProviderError, 
  RateLimitError, 
  GenericError,
  StreamingIndicator,
  ToolUsageDisplay 
} from '@/components/chat/error-states';

// Add error state tracking
const [errorState, setErrorState] = useState<{
  type: 'connection' | 'provider' | 'rate-limit' | 'generic' | null;
  message: string;
  retryable: boolean;
}>({ type: null, message: '', retryable: false });

// Listen for SSE error events
useEffect(() => {
  // Parse SSE error messages
  // Update error state accordingly
}, [stream]);

// Render appropriate error component
{errorState.type === 'connection' && <ConnectionError onRetry={handleRetry} />}
{errorState.type === 'provider' && <ProviderError providers={failedProviders} />}
{errorState.type === 'rate-limit' && <RateLimitError retryAfter={retryAfter} />}
{errorState.type === 'generic' && <GenericError onRetry={handleRetry} />}
```

**Expected Impact:**
- Users see helpful error messages instead of blank screens
- Clear retry options when applicable
- Reduced user frustration

---

### 2. ✅ Add Provider Health to Routing Logic (Autonomous Failover)

**Problem:** Smart router doesn't consider provider health
**Solution:** Integrate `provider-health.ts` into smart routing

**Files to Modify:**
- `src/lib/ai/smart-router.ts` - Core routing logic

**Changes Required:**
```typescript
import { providerHealthMonitor } from '@/lib/ai/provider-health';

// Modify waterfall generation
export function smartRoute(input: string, options: any): RoutingResult {
  const healthSummary = providerHealthMonitor.getHealthSummary();
  
  // Filter out unhealthy providers from waterfall
  const healthyWaterfall = waterfall.filter(provider => {
    const providerHealth = healthSummary.providers[provider.id];
    return providerHealth?.status === 'healthy';
  });
  
  // If all providers unhealthy, log warning but still return fallback
  if (healthyWaterfall.length === 0) {
    logger.warn('SmartRouter', 'All providers unhealthy, using degraded waterfall');
  }
  
  return {
    primary: healthyWaterfall[0] || waterfall[0],
    waterfall: healthyWaterfall.length > 0 ? healthyWaterfall : waterfall,
    taskType,
  };
}
```

**Expected Impact:**
- Autonomous failover to healthy providers
- Reduced failed requests
- Better uptime

---

### 3. ✅ Implement Graceful Degradation

**Problem:** System fails completely when providers are down
**Solution:** Create degraded mode that provides limited functionality

**Files to Create:**
- `src/lib/consciousness/graceful-degradation.ts` - Already exists, needs enhancement

**Changes Required:**
```typescript
// Enhance existing graceful-degradation.ts
export class GracefulDegradationManager {
  private currentMode: 'full' | 'reduced' | 'minimal' | 'offline';
  
  determineMode(healthSummary: ProviderHealthSummary): DegradationMode {
    const healthyCount = Object.values(healthSummary.providers)
      .filter(p => p.status === 'healthy').length;
    
    if (healthyCount === 0) return 'minimal';
    if (healthyCount < 3) return 'reduced';
    return 'full';
  }
  
  getAvailableCapabilities(mode: DegradationMode): CapabilitySet {
    switch(mode) {
      case 'full':
        return ALL_CAPABILITIES;
      case 'reduced':
        return {
          chat: true,
          tools: ['memory_read', 'web_search'], // Limited tools
          media: false, // No image/video generation
          music: true,
        };
      case 'minimal':
        return {
          chat: true,
          tools: [], // No tools
          media: false,
          music: false,
        };
      case 'offline':
        return {
          chat: false,
          tools: [],
          media: false,
          music: false,
        };
    }
  }
}
```

**Expected Impact:**
- System continues working in reduced capacity
- Better user experience during outages
- Prevents complete system failure

---

### 4. ✅ Add Real-Time Error Feedback

**Problem:** Errors appear silently or late in the stream
**Solution:** Send error events early in SSE stream

**Files to Modify:**
- `app/api/chat/route.ts` - Add early error detection and reporting

**Changes Required:**
```typescript
// Add error detection before streaming
async function detectEarlyErrors(waterfall: Provider[], messages: Message[]): ErrorInfo | null {
  // Check for empty waterfall
  if (!waterfall || waterfall.length === 0) {
    return {
      type: 'provider',
      message: 'No AI providers available',
      retryable: true,
    };
  }
  
  // Check provider health
  const health = providerHealthMonitor.getHealthSummary();
  const healthyProviders = waterfall.filter(p => 
    health.providers[p.id]?.status === 'healthy'
  );
  
  if (healthyProviders.length === 0) {
    return {
      type: 'provider',
      message: 'All AI providers are currently experiencing issues',
      retryable: true,
    };
  }
  
  return null;
}

// In POST handler, before streaming
const earlyError = await detectEarlyErrors(waterfall, messages);
if (earlyError) {
  // Send error immediately via SSE
  sendError(controller, earlyError);
  return;
}
```

**Expected Impact:**
- Users see errors immediately, not after waiting
- Better perceived performance
- Clear communication of issues

---

### 5. ✅ Create User-Facing Error Reports

**Problem:** No visibility into error patterns or system health
**Solution:** Create error reporting endpoint and UI

**Files to Create:**
- `app/api/error-report/route.ts` - Error reporting API
- `src/components/system/error-report.tsx` - Error report UI component

**Implementation:**
```typescript
// app/api/error-report/route.ts
export async function GET(req: NextRequest) {
  const logs = logger.query({
    level: 'error',
    limit: 100,
    timeRange: '1h',
  });
  
  const health = providerHealthMonitor.getHealthSummary();
  
  const errorCounts = logs.reduce((acc, log) => {
    acc[log.module] = (acc[log.module] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return NextResponse.json({
    errors: logs,
    errorCounts,
    providerHealth: health,
    timestamp: new Date().toISOString(),
  });
}

// src/components/system/error-report.tsx
export function ErrorReport() {
  const [report, setReport] = useState<ErrorReport | null>(null);
  
  useEffect(() => {
    fetch('/api/error-report')
      .then(r => r.json())
      .then(setReport);
  }, []);
  
  return (
    <div className="error-report">
      <h2>System Status</h2>
      <ProviderHealthSummary health={report?.providerHealth} />
      <ErrorStats counts={report?.errorCounts} />
      <ErrorList errors={report?.errors} />
    </div>
  );
}
```

**Expected Impact:**
- Visibility into system health
- Better debugging for developers
- Trust through transparency

---

## Implementation Order

### Priority 1 (Critical User Experience):
1. **Integrate Error States into Chat UI** - Immediate user benefit
2. **Add Real-Time Error Feedback** - Faster error communication

### Priority 2 (Autonomous Capabilities):
3. **Add Provider Health to Routing Logic** - Autonomous failover
4. **Implement Graceful Degradation** - System resilience

### Priority 3 (Visibility):
5. **Create User-Facing Error Reports** - Developer/Admin visibility

---

## Testing Strategy

### 1. Error State Integration
- Test each error state component in isolation
- Test SSE error event handling
- Test retry functionality
- Test error state transitions

### 2. Provider Health Routing
- Simulate provider failures
- Verify waterfall excludes unhealthy providers
- Test fallback to degraded providers
- Log routing decisions

### 3. Graceful Degradation
- Test each degradation mode
- Verify capability sets are correct
- Test mode transitions
- Verify user notifications

### 4. Real-Time Error Feedback
- Test early error detection
- Measure time-to-error-display
- Test error message clarity
- Verify retry options

### 5. Error Reports
- Test error aggregation
- Verify health data accuracy
- Test UI rendering
- Test time range filtering

---

## Success Criteria

### Phase 2 Complete When:
- [ ] Error states display in chat UI for all error types
- [ ] Smart router excludes unhealthy providers
- [ ] Graceful degradation modes work correctly
- [ ] Errors display within 1 second of detection
- [ ] Error report endpoint returns accurate data
- [ ] No regressions in existing functionality
- [ ] All tests pass
- [ ] Deployment succeeds

### Metric Targets:
- **Production Readiness:** 8/10
  - ✅ Error handling UI integrated
  - ✅ Graceful degradation active
  - ✅ Real-time error feedback
  - ✅ Error reports available

- **User Experience:** 8/10
  - ✅ Clear error messages
  - ✅ Fast error feedback
  - ✅ System remains usable during issues
  - ✅ Retry options available

- **Autonomy:** 5/10
  - ✅ Provider health aware routing
  - ✅ Automatic failover to healthy providers
  - ✅ Degraded mode activation
  - ⏳ Self-healing (Phase 3)

---

## Files to Create/Modify

### Create (2 files):
1. `app/api/error-report/route.ts` - Error reporting API
2. `src/components/system/error-report.tsx` - Error report UI

### Modify (4 files):
1. `app/chat/page.tsx` - Integrate error states
2. `src/lib/ai/smart-router.ts` - Add health-aware routing
3. `src/lib/consciousness/graceful-degradation.ts` - Enhance degradation logic
4. `app/api/chat/route.ts` - Add early error detection

---

## Risks & Mitigations

### Risk 1: Breaking Chat UI
- **Mitigation:** Test error state integration thoroughly
- **Fallback:** Keep old error handling as backup

### Risk 2: Routing Too Aggressive
- **Mitigation:** Always keep at least 1 provider in waterfall
- **Fallback:** If all excluded, use original waterfall

### Risk 3: Degradation Too Restrictive
- **Mitigation:** Start with generous capability sets
- **Adjust:** Monitor and refine based on usage

### Risk 4: Error Report Performance
- **Mitigation:** Cache error reports (30s)
- **Limit:** Return max 100 recent errors

---

## Next Steps

1. ✅ Create this plan
2. Start with Priority 1: Error State Integration
3. Test each change before proceeding
4. Deploy to staging for full testing
5. Monitor metrics and adjust

---

**Phase 2 Estimated Time:** 2-3 hours  
**Phase 3 Preview:** Self-Modification and Autonomous Learning