# PHASE 7: FOUNDATION LAYER - ARCHITECTURE DESIGN

## Overview
Phase 7 adds **source code access** and **dynamic tool management** to enable HOLLY's self-modification capabilities. This is separate from existing file upload/storage which handles user files.

---

## 1. FILE SYSTEM ACCESS LAYER

### Purpose
Allow HOLLY to read, write, and search her own source code files safely.

### Location
`src/lib/system/file-system.ts`

### TypeScript Interfaces

```typescript
export interface FileReadResult {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: FileMetadata;
}

export interface FileWriteResult {
  success: boolean;
  path?: string;
  error?: string;
  backup?: string;
}

export interface FileMetadata {
  path: string;
  size: number;
  modified: Date;
  type: string;
  lines: number;
}

export interface SearchResult {
  path: string;
  matches: SearchMatch[];
}

export interface SearchMatch {
  line: number;
  content: string;
  context: string;
}
```

### Functions

```typescript
// Read source file (restricted to project directory)
async function readSourceFile(filepath: string): Promise<FileReadResult>

// Write source file with backup
async function writeSourceFile(
  filepath: string, 
  content: string, 
  options?: { backup: boolean }
): Promise<FileWriteResult>

// List directory contents
async function listDirectory(
  path: string, 
  options?: { recursive: boolean; pattern: string }
): Promise<string[]>

// Search codebase for patterns
async function searchCodebase(
  query: string, 
  options?: { path: string; fileType: string; caseSensitive: boolean }
): Promise<SearchResult[]>

// Get file metadata
async function getFileMetadata(filepath: string): Promise<FileMetadata>
```

### Security Rules
1. **Path Restriction**: Only access files within `/home/user/Holly-AI/`
2. **Backup Required**: Always backup before modifying
3. **Protected Paths**: Cannot modify `.env`, `prisma/schema.prisma` without explicit confirmation
4. **Validation**: All paths must be sanitized to prevent directory traversal

---

## 2. DYNAMIC TOOL REGISTRY

### Purpose
Allow HOLLY to register, update, and remove tool definitions at runtime.

### Location
`src/lib/system/tool-registry.ts`

### Prisma Schema Addition

```prisma
model ToolDefinition {
  id          String   @id @default(cuid())
  name        String   @unique
  description String   @db.Text
  category    String   // 'system', 'creative', 'analysis', 'integration'
  schema      Json     // Tool configuration and parameters
  status      String   // 'active', 'disabled', 'testing'
  createdBy   String   // 'system', 'holly', 'admin'
  version     String
  
  // Metadata
  usageCount  Int      @default(0)
  successRate Float?   // 0-100
  lastUsed    DateTime?
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([status])
  @@index([category])
  @@index([createdBy])
}
```

### TypeScript Interfaces

```typescript
export interface ToolSchema {
  name: string;
  description: string;
  category: 'system' | 'creative' | 'analysis' | 'integration';
  parameters: {
    type: 'object';
    properties: Record<string, ParameterDefinition>;
    required: string[];
  };
  implementation?: string; // Path to implementation file
}

export interface ParameterDefinition {
  type: string;
  description: string;
  enum?: string[];
  default?: any;
}

export interface ToolRegistration {
  success: boolean;
  toolId?: string;
  error?: string;
  conflicts?: string[];
}
```

### Functions

```typescript
// Register new tool
async function registerTool(
  schema: ToolSchema, 
  options?: { override: boolean; validate: boolean }
): Promise<ToolRegistration>

// Unregister tool
async function unregisterTool(
  toolName: string,
  options?: { force: boolean }
): Promise<{ success: boolean; error?: string }>

// Update tool definition
async function updateTool(
  toolName: string, 
  updates: Partial<ToolSchema>
): Promise<ToolRegistration>

// List available tools
async function listAvailableTools(
  filters?: { category?: string; status?: string }
): Promise<ToolDefinition[]>

// Generate tool boilerplate code
async function generateToolBoilerplate(
  toolName: string, 
  purpose: string
): Promise<{ success: boolean; code?: string; path?: string; error?: string }>

// Validate tool schema
function validateToolSchema(schema: ToolSchema): { valid: boolean; errors: string[] }
```

---

## 3. API ENDPOINTS

### System API Routes

#### POST /api/system/file/read
**Request:**
```typescript
{
  filepath: string;
  options?: {
    includeMetadata: boolean;
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  content?: string;
  metadata?: FileMetadata;
  error?: string;
}
```

#### POST /api/system/file/write
**Request:**
```typescript
{
  filepath: string;
  content: string;
  options?: {
    backup: boolean;
    validate: boolean;
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  path?: string;
  backup?: string;
  error?: string;
}
```

#### POST /api/system/file/search
**Request:**
```typescript
{
  query: string;
  options?: {
    path?: string;
    fileType?: string;
    caseSensitive?: boolean;
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  results?: SearchResult[];
  error?: string;
}
```

#### GET /api/system/file/list
**Query Parameters:**
- `path`: string (required)
- `recursive`: boolean (default: false)
- `pattern`: string (optional glob pattern)

**Response:**
```typescript
{
  success: boolean;
  files?: string[];
  error?: string;
}
```

### Tool Registry API Routes

#### POST /api/system/tools/register
**Request:**
```typescript
{
  schema: ToolSchema;
  options?: {
    override: boolean;
    validate: boolean;
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  toolId?: string;
  error?: string;
  conflicts?: string[];
}
```

#### DELETE /api/system/tools/:toolName
**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

#### PATCH /api/system/tools/:toolName
**Request:**
```typescript
{
  updates: Partial<ToolSchema>;
}
```

**Response:**
```typescript
{
  success: boolean;
  toolId?: string;
  error?: string;
}
```

#### GET /api/system/tools
**Query Parameters:**
- `category`: string (optional)
- `status`: string (optional)

**Response:**
```typescript
{
  success: boolean;
  tools?: ToolDefinition[];
  error?: string;
}
```

#### POST /api/system/tools/generate
**Request:**
```typescript
{
  toolName: string;
  purpose: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  code?: string;
  path?: string;
  error?: string;
}
```

---

## 4. IMPLEMENTATION ORDER

1. ✅ Add ToolDefinition model to Prisma schema
2. ✅ Run `prisma db push` to update database
3. ✅ Create `src/lib/system/file-system.ts` with all functions
4. ✅ Create `src/lib/system/tool-registry.ts` with all functions
5. ✅ Create API routes in `app/api/system/file/`
6. ✅ Create API routes in `app/api/system/tools/`
7. ✅ Test each function individually
8. ✅ Test API endpoints with real requests
9. ✅ Deploy to production

---

## 5. TESTING CHECKLIST

### File System Tests
- [ ] Read existing file successfully
- [ ] Write new file with backup
- [ ] Modify existing file with backup preserved
- [ ] List directory contents recursively
- [ ] Search for code patterns (case sensitive/insensitive)
- [ ] Get file metadata accurately
- [ ] Reject path traversal attempts (../../../etc/passwd)
- [ ] Reject access outside project directory
- [ ] Handle non-existent files gracefully

### Tool Registry Tests
- [ ] Register new tool successfully
- [ ] Prevent duplicate tool names
- [ ] Update existing tool
- [ ] Unregister tool
- [ ] List tools with filters
- [ ] Generate boilerplate code
- [ ] Validate tool schemas correctly
- [ ] Reject invalid schemas
- [ ] Track usage statistics

### API Endpoint Tests
- [ ] All endpoints require authentication
- [ ] Proper error responses for invalid inputs
- [ ] File operations respect security rules
- [ ] Tool registry operations update database correctly
- [ ] Response formats match TypeScript types

---

## 6. SAFETY MEASURES

### File System Safety
1. **Backup Before Modify**: Every write creates timestamped backup
2. **Path Validation**: Regex check for directory traversal
3. **Size Limits**: Max 10MB per file
4. **Protected Files**: .env, schema.prisma require admin approval
5. **Audit Logging**: All file operations logged to database

### Tool Registry Safety
1. **Schema Validation**: JSON schema validation before registration
2. **Name Uniqueness**: Prevent tool name conflicts
3. **Version Control**: Track all tool versions
4. **Rollback**: Can revert to previous tool versions
5. **Testing Mode**: New tools start in 'testing' status

---

## 7. SUCCESS CRITERIA

Phase 7 is complete when:
1. ✅ HOLLY can read any source file
2. ✅ HOLLY can modify source files with automatic backup
3. ✅ HOLLY can search the entire codebase
4. ✅ HOLLY can register new tools dynamically
5. ✅ HOLLY can update/remove tools
6. ✅ All operations are logged and auditable
7. ✅ Security rules prevent unauthorized access
8. ✅ All tests pass
9. ✅ Successful deployment to production

---

## Notes
- This phase does NOT modify existing file-storage.ts (user file uploads)
- This phase does NOT modify existing holly-tools.ts (AI tool definitions)
- This phase ADDS new capabilities for source code management
- All code will be reviewed against Prisma schema before committing
