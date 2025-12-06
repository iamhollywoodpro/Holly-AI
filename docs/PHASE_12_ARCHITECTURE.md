# PHASE 12: ADVANCED USER INTERACTION - ARCHITECTURE

## OVERVIEW
Build comprehensive user interaction, personalization, and conversation management using **EXISTING** Prisma models.

## EXISTING PRISMA MODELS (DO NOT CREATE NEW ONES)

### 1. UserPreferences
```prisma
model UserPreferences {
  id String @id @default(cuid())
  userId String
  clerkUserId String @unique
  
  // UI Preferences
  theme String @default("system")
  language String @default("en")
  timezone String?
  dateFormat String @default("MM/DD/YYYY")
  timeFormat String @default("12h")
  
  // Dashboard Layout
  dashboardLayout Json?
  pinnedFeatures String[] @default([])
  hiddenFeatures String[] @default([])
  favoritePages String[] @default([])
  
  // Notifications
  emailNotifications Boolean @default(true)
  pushNotifications Boolean @default(true)
  notificationFrequency String @default("real_time")
  
  // Content Preferences
  contentTypes String[] @default([])
  interests String[] @default([])
  categories String[] @default([])
  
  // Feature Flags
  betaFeatures Boolean @default(false)
  experimentalMode Boolean @default(false)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Prisma Client:** `prisma.userPreferences`

### 2. Conversation & Message
```prisma
model Conversation {
  id String @id @default(cuid())
  userId String
  title String?
  messageCount Int @default(0)
  lastMessagePreview String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages Message[]
}

model Message {
  id String @id @default(cuid())
  conversationId String
  userId String
  role String // 'user' or 'assistant'
  content String @db.Text
  emotion String?
  createdAt DateTime @default(now())
}
```

**Prisma Client:** `prisma.conversation`, `prisma.message`

### 3. ConversationPattern
```prisma
model ConversationPattern {
  id String @id @default(cuid())
  userId String
  patternType String // question_pattern, work_pattern, time_preference, response_style
  pattern String @db.Text
  context Json
  frequency Int @default(1)
  effectiveness Float @default(0.5)
  lastSeen DateTime @default(now())
  firstSeen DateTime @default(now())
  examples String[] @default([])
  relatedPatterns String[] @default([])
}
```

**Prisma Client:** `prisma.conversationPattern`

## LIBRARIES TO BUILD

### 1. src/lib/interaction/user-preferences.ts
**Purpose:** Manage user preferences and settings

**Functions:**
- `getUserPreferences(clerkUserId: string)` → UserPreferences | null
- `updatePreferences(clerkUserId: string, updates: Partial<PreferenceUpdates>)` → { success, preferences? }
- `resetPreferences(clerkUserId: string)` → { success }
- `getPreferencesByCategory(clerkUserId: string, category: string)` → Record<string, any>

**Uses:** `prisma.userPreferences`

### 2. src/lib/interaction/conversation-manager.ts
**Purpose:** Manage conversations and messages

**Functions:**
- `createConversation(userId: string, title?: string)` → { success, conversationId? }
- `addMessage(conversationId: string, userId: string, role: string, content: string, emotion?: string)` → { success, messageId? }
- `getConversation(conversationId: string, includeMessages?: boolean)` → Conversation with optional messages
- `listConversations(userId: string, limit?: number)` → Conversation[]
- `deleteConversation(conversationId: string)` → { success }
- `getConversationContext(conversationId: string, messageLimit?: number)` → { messages, summary }

**Uses:** `prisma.conversation`, `prisma.message`

### 3. src/lib/interaction/pattern-tracker.ts
**Purpose:** Track and analyze user behavior patterns

**Functions:**
- `recordPattern(userId: string, patternType: string, pattern: string, context: Record<string, any>)` → { success, patternId? }
- `updatePatternEffectiveness(patternId: string, effectiveness: number)` → { success }
- `getUserPatterns(userId: string, patternType?: string)` → ConversationPattern[]
- `getPatternInsights(userId: string)` → { patterns, recommendations }

**Uses:** `prisma.conversationPattern`

### 4. src/lib/interaction/personalization-engine.ts
**Purpose:** Personalize responses and recommendations

**Functions:**
- `getPersonalization(userId: string)` → { preferences, patterns, recommendations }
- `generatePersonalizedResponse(userId: string, context: Record<string, any>)` → { response, reasoning }
- `updateUserProfile(userId: string, interactions: Record<string, any>)` → { success }
- `predictUserNeeds(userId: string)` → { predictions, confidence }

**Uses:** `prisma.userPreferences`, `prisma.conversationPattern`

## API ENDPOINTS TO BUILD

### User Preferences (4 endpoints)
1. `GET /api/interaction/preferences` - Get user preferences
2. `PATCH /api/interaction/preferences` - Update preferences
3. `POST /api/interaction/preferences/reset` - Reset to defaults
4. `GET /api/interaction/preferences/:category` - Get specific category

### Conversation Management (6 endpoints)
5. `POST /api/interaction/conversation` - Create conversation
6. `GET /api/interaction/conversation/:id` - Get conversation
7. `GET /api/interaction/conversations` - List user conversations
8. `DELETE /api/interaction/conversation/:id` - Delete conversation
9. `POST /api/interaction/conversation/:id/message` - Add message
10. `GET /api/interaction/conversation/:id/context` - Get conversation context

### Pattern Tracking (3 endpoints)
11. `POST /api/interaction/pattern` - Record pattern
12. `GET /api/interaction/patterns` - Get user patterns
13. `GET /api/interaction/patterns/insights` - Get pattern insights

### Personalization (2 endpoints)
14. `GET /api/interaction/personalization` - Get personalization data
15. `POST /api/interaction/personalization/predict` - Predict user needs

**TOTAL: 15 API endpoints**

## IMPLEMENTATION STEPS

1. ✅ Audit existing code and models
2. ✅ Design architecture (this document)
3. **Document ACTUAL Prisma fields before coding**
4. Build 4 libraries with verified Prisma field names
5. Build 15 API endpoints with verified function signatures
6. Test everything
7. Deploy

## CRITICAL REMINDERS

**BEFORE WRITING ANY CODE:**
1. READ the actual Prisma schema fields
2. LIST all field names and types
3. VERIFY against what you're about to write
4. ONLY THEN write code

**NO ASSUMPTIONS. NO GUESSING. READ FIRST.**
