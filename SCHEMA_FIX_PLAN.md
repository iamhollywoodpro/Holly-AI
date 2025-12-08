# COMPLETE SCHEMA FIX PLAN - ALL REMAINING ERRORS

**Date:** December 8, 2025  
**Status:** SYSTEMATIC FIX - ALL ERRORS AT ONCE

---

## ERRORS FOUND (4 Total)

### ERROR 1: Notification.read → Notification.status
**File:** `app/api/admin/notifications/route.ts:86`  
**Current:** `unread: unreadCount`  
**Issue:** Using 'read' boolean concept when schema uses 'status' string  
**Fix:** Change logic to use status filtering

### ERROR 2: EmotionalState.emotion → EmotionalState.primaryEmotion
**File:** `app/api/chat/stream/route.ts:74`  
**Current:** `emotion: finalResponse.emotion`  
**Issue:** Field is called 'primaryEmotion' not 'emotion'  
**Fix:** Change to `primaryEmotion: finalResponse.emotion || finalResponse.primaryEmotion || 'neutral'`

### ERROR 3: HollyExperience schema mismatch (BLOCKING DEPLOYMENT)
**File:** `app/api/autonomous/experience/record/route.ts`  
**Lines:** 24-27  
**Current:**
```typescript
description: experience,
context: context || {},
learnings: learnings || [],
impact: 'medium',
```

**Schema Actual Fields:**
- `content` (Json) - NOT `description`
- `type` (String) - already correct
- `lessons` (String[]) - NOT `learnings`
- `significance` (Float) - NOT `impact`
- `emotionalImpact` (Float?)
- `emotionalValence` (Float?)
- `relatedConcepts` (String[])
- `futureImplications` (String[])

**Fix:**
```typescript
content: { experience, context: context || {} },
lessons: learnings || [],
significance: 0.5, // Default medium significance
relatedConcepts: [],
futureImplications: [],
```

### ERROR 4: HollyExperience output mapping
**File:** `app/api/autonomous/experience/record/route.ts:37`  
**Current:** `learnings: experienceRecord.learnings`  
**Fix:** `learnings: experienceRecord.lessons`

---

## FIX EXECUTION ORDER

1. Fix HollyExperience (BLOCKS DEPLOYMENT)
2. Fix EmotionalState
3. Fix Notification
4. Run validation script
5. Commit ALL fixes at once
6. Push ONCE

---

## VERIFICATION CHECKLIST

- [ ] All 4 errors fixed
- [ ] Validation script shows 0 errors
- [ ] TypeScript compiles locally (if possible)
- [ ] Commit message documents all fixes
- [ ] Push only after verification
