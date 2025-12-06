# PHASE 9: CREATIVE ENGINE - ARCHITECTURE

## OVERVIEW
Build comprehensive creative content generation system using **EXISTING** Prisma models for image/video/audio generation, templates, and asset management.

## EXISTING PRISMA MODELS (DO NOT CREATE NEW ONES)

### 1. CreativeAsset
Stores generated creative assets (images, videos, audio).

**Prisma Client:** `prisma.creativeAsset`

**Key Fields:**
- Asset details: type, category, title, description
- Generation: prompt, negativePrompt, model, generationId
- File: url, thumbnailUrl, fileSize, duration, width, height, format
- Parameters: parameters (Json), seed, steps, guidance, sampler
- Status: status, isPublic, isFavorite, tags
- Provider: provider, cost
- Timestamps: createdAt, updatedAt

### 2. CreativeTemplate
Reusable templates for content generation.

**Prisma Client:** `prisma.creativeTemplate`

**Key Fields:**
- Template details: name, description, type, category
- Configuration: prompt, negativePrompt, model, parameters (Json)
- Metadata: thumbnailUrl, isPublic, isDefault, usageCount, tags
- Timestamps: createdAt, updatedAt

### 3. GenerationJob
Tracks async generation jobs with progress.

**Prisma Client:** `prisma.generationJob`

**Key Fields:**
- Job details: type, status, priority
- Request: prompt, negativePrompt, model, parameters (Json), templateId
- Progress: progress, currentStep, totalSteps
- Result: resultUrl, thumbnailUrl, errorMessage
- Performance: provider, cost, estimatedTime, actualTime
- Timestamps: createdAt, updatedAt, startedAt, completedAt

## LIBRARIES TO BUILD

### 1. src/lib/creative/image-generator.ts
**Purpose:** Generate images using various AI models

**Functions:**
- `generateImage(userId: string, prompt: string, options: ImageGenOptions)` → { success, jobId?, assetId?, error? }
- `getImageStatus(jobId: string)` → GenerationJob with progress
- `regenerateImage(assetId: string, modifications: ImageModifications)` → { success, jobId? }
- `listUserImages(userId: string, filters?: ImageFilters)` → CreativeAsset[]

**External APIs:** DALL-E 3, Stable Diffusion, Midjourney (if available)
**Uses:** `prisma.creativeAsset`, `prisma.generationJob`

### 2. src/lib/creative/content-creator.ts
**Purpose:** Generate text content, copy, ideas

**Functions:**
- `generateContent(userId: string, type: string, prompt: string, options: ContentOptions)` → { success, content?, error? }
- `improveCopy(original: string, goal: string)` → { improved, suggestions }
- `generateIdeas(topic: string, count: number)` → { ideas: string[] }
- `createFromTemplate(templateId: string, variables: Record<string, any>)` → { success, content? }

**Uses:** GPT-4, Claude (via existing AI integrations)

### 3. src/lib/creative/template-manager.ts
**Purpose:** Manage creative templates

**Functions:**
- `createTemplate(userId: string, template: TemplateInput)` → { success, templateId?, error? }
- `getTemplate(templateId: string)` → CreativeTemplate | null
- `listTemplates(filters?: TemplateFilters)` → CreativeTemplate[]
- `updateTemplate(templateId: string, updates: Partial<TemplateInput>)` → { success, error? }
- `deleteTemplate(templateId: string)` → { success, error? }
- `useTemplate(templateId: string)` → { success } (increments usageCount)

**Uses:** `prisma.creativeTemplate`

### 4. src/lib/creative/asset-manager.ts
**Purpose:** Manage generated assets

**Functions:**
- `saveAsset(userId: string, asset: AssetInput)` → { success, assetId?, error? }
- `getAsset(assetId: string)` → CreativeAsset | null
- `listAssets(userId: string, filters?: AssetFilters)` → CreativeAsset[]
- `updateAsset(assetId: string, updates: AssetUpdates)` → { success, error? }
- `deleteAsset(assetId: string)` → { success, error? }
- `toggleFavorite(assetId: string)` → { success, isFavorite }
- `addTags(assetId: string, tags: string[])` → { success }

**Uses:** `prisma.creativeAsset`

## API ENDPOINTS TO BUILD

### Image Generation (4 endpoints)
1. `POST /api/creative/image/generate` - Generate new image
2. `GET /api/creative/image/:jobId/status` - Check generation status
3. `POST /api/creative/image/:assetId/regenerate` - Regenerate with modifications
4. `GET /api/creative/images` - List user images

### Content Creation (4 endpoints)
5. `POST /api/creative/content/generate` - Generate content
6. `POST /api/creative/content/improve` - Improve existing copy
7. `POST /api/creative/content/ideas` - Generate ideas
8. `POST /api/creative/content/from-template` - Create from template

### Template Management (5 endpoints)
9. `POST /api/creative/template` - Create template
10. `GET /api/creative/template/:id` - Get template
11. `GET /api/creative/templates` - List templates
12. `PATCH /api/creative/template/:id` - Update template
13. `DELETE /api/creative/template/:id` - Delete template

### Asset Management (6 endpoints)
14. `GET /api/creative/asset/:id` - Get asset
15. `GET /api/creative/assets` - List assets
16. `PATCH /api/creative/asset/:id` - Update asset
17. `DELETE /api/creative/asset/:id` - Delete asset
18. `POST /api/creative/asset/:id/favorite` - Toggle favorite
19. `POST /api/creative/asset/:id/tags` - Add tags

**TOTAL: 19 API endpoints**

## IMPLEMENTATION STEPS

1. ✅ Audit existing creative code and models
2. ✅ Design architecture (this document)
3. **Document ACTUAL Prisma fields before coding**
4. Build 4 libraries with verified Prisma field names
5. Build 19 API endpoints with verified function signatures
6. Test everything
7. Deploy

## CRITICAL REMINDERS

**BEFORE WRITING ANY CODE:**
1. READ the actual Prisma schema fields
2. LIST all field names and types
3. VERIFY against what you're about to write
4. ONLY THEN write code

**NO ASSUMPTIONS. NO GUESSING. READ FIRST.**
