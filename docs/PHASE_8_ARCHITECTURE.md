# PHASE 8: EXTERNAL INTELLIGENCE - Architecture Document

**Status:** In Development  
**Dependencies:** Phase 7 (File System & Tool Registry)  
**Estimated Time:** 4-5 hours

---

## OVERVIEW

Phase 8 provides HOLLY with external intelligence capabilities:
- **Web Browser**: Browse, scrape, and extract data from websites
- **API Integration Hub**: Connect to external APIs dynamically
- **Web Search**: Search the web for information and trends

---

## EXISTING IMPLEMENTATION AUDIT

### ✅ ALREADY EXISTS:

**Library:** `src/lib/research/web-researcher.ts`
- Class: `WebResearcher`
- Search Provider: Brave Search API (free tier: 2000 queries/month)
- Functions:
  - `search(query: ResearchQuery): Promise<ResearchResult[]>`
  - `researchTopic(topic: string, context?: string): Promise<ResearchSummary>`
  - `researchMusicTrends(genre?: string): Promise<ResearchSummary>`
  - `researchPlaylistCurators(genre: string): Promise<ResearchResult[]>`
  - `researchCompetitors(artistName: string, genre: string): Promise<ResearchSummary>`
  - `findSyncOpportunities(musicStyle: string): Promise<ResearchResult[]>`
  - `researchMarketingStrategies(niche: string): Promise<ResearchSummary>`
  - `findRelevantMedia(topic: string): Promise<ResearchResult[]>`
  - `trackTrendingTopics(category: string): Promise<ResearchResult[]>`
  - `monitorMentions(brandName: string): Promise<ResearchResult[]>`
  - `findCollaborators(type: string, genre?: string): Promise<ResearchResult[]>`
  - `researchKeywords(topic: string): Promise<string[]>`

**API Endpoint:** `app/api/research/web/route.ts`
- POST `/api/research/web`
- Supports: general, trend, competitor research
- Uses WebResearcher class

---

## WHAT'S MISSING FOR PHASE 8:

### 1. **Web Browser/Scraper Module**
**Purpose:** Direct web page access, HTML parsing, data extraction

**New Library:** `src/lib/external/web-browser.ts`
- `browseWeb(url: string, options?): Promise<BrowseResult>`
- `scrapeData(url: string, selectors?): Promise<ScrapedData>`
- `extractContent(url: string, contentType?): Promise<ExtractedContent>`
- `renderJavaScript(url: string): Promise<string>` (for dynamic pages)

### 2. **API Integration Hub**
**Purpose:** Generic API client for connecting to external services

**New Library:** `src/lib/external/api-hub.ts`
- `callAPI(config: APIConfig): Promise<APIResponse>`
- `registerAPI(apiDef: APIDefinition): Promise<void>`
- `listAPIs(filters?): Promise<APIDefinition[]>`
- `testConnection(apiName: string): Promise<boolean>`

### 3. **Enhanced Search Capabilities**
**Extend:** `src/lib/research/web-researcher.ts`
- Add image search
- Add video search
- Add news-specific search
- Add academic/paper search

### 4. **API Endpoints**
- POST `/api/external/browse` - Browse web pages
- POST `/api/external/scrape` - Scrape specific data
- POST `/api/external/api/call` - Call external APIs
- GET `/api/external/api/list` - List registered APIs
- POST `/api/external/api/register` - Register new API
- GET `/api/research/search` - Enhanced search endpoint

---

## PRISMA MODELS

### APIDefinition Model
```prisma
model APIDefinition {
  id          String   @id @default(cuid())
  name        String   @unique
  description String   @db.Text
  baseUrl     String
  authType    String   // 'none', 'api_key', 'oauth', 'bearer'
  headers     Json?    // Default headers
  rateLimit   Int?     // Requests per minute
  status      String   // 'active', 'disabled', 'testing'
  createdBy   String   // 'system', 'holly', 'admin'
  
  // Usage tracking
  callCount   Int      @default(0)
  lastUsed    DateTime?
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([status])
  @@index([createdBy])
  @@map("api_definitions")
}
```

### WebBrowseLog Model (Optional - for tracking)
```prisma
model WebBrowseLog {
  id        String   @id @default(cuid())
  url       String
  action    String   // 'browse', 'scrape', 'extract'
  success   Boolean
  duration  Int      // milliseconds
  error     String?  @db.Text
  createdAt DateTime @default(now())
  
  @@index([createdAt])
  @@map("web_browse_logs")
}
```

---

## IMPLEMENTATION PLAN

### Step 1: Add Prisma Models
- Add `APIDefinition` model
- Add `WebBrowseLog` model (optional)
- Run `prisma db push`

### Step 2: Build Web Browser Module
File: `src/lib/external/web-browser.ts`
- Implement browseWeb function
- Implement scrapeData function
- Implement extractContent function
- Add error handling and timeouts

### Step 3: Build API Hub Module
File: `src/lib/external/api-hub.ts`
- Implement callAPI function
- Implement registerAPI function
- Implement listAPIs function
- Implement testConnection function

### Step 4: Enhance Web Researcher
File: `src/lib/research/web-researcher.ts`
- Add image search method
- Add video search method
- Add news search method
- Keep existing methods intact

### Step 5: Create API Endpoints
- POST `/api/external/browse/route.ts`
- POST `/api/external/scrape/route.ts`
- POST `/api/external/api/call/route.ts`
- GET `/api/external/api/list/route.ts`
- POST `/api/external/api/register/route.ts`
- GET `/api/research/search/route.ts`

### Step 6: Verification
- Verify all function signatures match calls
- Test TypeScript compilation
- Review against this architecture
- Commit and deploy

---

## DEPENDENCIES

**Required Environment Variables:**
- `BRAVE_API_KEY` - Already configured for WebResearcher

**Optional (for enhanced browsing):**
- `PROXY_URL` - For avoiding rate limits
- `USER_AGENT` - Custom user agent string

**NPM Packages (may need to install):**
- `axios` or `node-fetch` - HTTP client
- `cheerio` - HTML parsing
- `puppeteer` (optional) - For JavaScript-heavy pages

---

## SUCCESS CRITERIA

Phase 8 is complete when HOLLY can:
- ✅ Browse any web page and extract content
- ✅ Scrape structured data from websites
- ✅ Call external APIs dynamically
- ✅ Register new API integrations
- ✅ Search the web for general information
- ✅ Search for images, videos, and news
- ✅ Track and log all external interactions

---

## NOTES

- Existing WebResearcher implementation is solid - keep it
- Focus on expanding capabilities, not replacing
- Ensure all functions have proper error handling
- Add rate limiting to prevent API abuse
- Log all external calls for debugging
