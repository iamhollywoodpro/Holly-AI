# How to Add a New Feature to Holly AI

A step-by-step guide for adding a feature end-to-end: API route, service layer, React component, and tests.

---

## Overview

Every feature in Holly follows this architecture:

```
Component (React) → Hook (state) → API Client → API Route → Service Layer → Database (Prisma)
```

You build from the inside out: database schema first, then service, then API route, then frontend.

---

## Step 1: Plan Your Data Model

If your feature needs persistent data, start with the Prisma schema.

**File:** `prisma/schema.prisma`

```prisma
model MyFeature {
  id          String   @id @default(cuid())
  userId      String
  title       String
  description String?
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("my_features")
}
```

Then apply:

```bash
npx prisma db push
npx prisma generate
```

> **Tip:** If your feature doesn't need a database table (e.g., it wraps an external API), skip this step.

---

## Step 2: Create the Service Layer

Services live in `src/lib/<feature-name>/`. This is where business logic goes.

**File:** `src/lib/my-feature/my-feature-service.ts`

```typescript
import { prisma } from '@/lib/db';

export async function getMyFeatures(userId: string) {
  return prisma.myFeature.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createMyFeature(userId: string, data: {
  title: string;
  description?: string;
}) {
  return prisma.myFeature.create({
    data: { userId, ...data },
  });
}

export async function deleteMyFeature(userId: string, id: string) {
  const feature = await prisma.myFeature.findUnique({ where: { id } });
  if (!feature || feature.userId !== userId) {
    throw new Error('Not found or unauthorized');
  }
  return prisma.myFeature.delete({ where: { id } });
}
```

**Conventions:**
- Import Prisma from `@/lib/db` (not `@/lib/prisma`)
- Always check `userId` ownership before mutations
- Throw errors for unauthorized/not-found — the API route handles HTTP responses
- Keep the service layer pure — no `NextRequest`/`NextResponse` here

---

## Step 3: Create the API Route

API routes live in `app/api/<feature-name>/route.ts`.

**File:** `app/api/my-feature/route.ts`

```typescript
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getMyFeatures, createMyFeature } from '@/lib/my-feature/my-feature-service';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const features = await getMyFeatures(userId);
    return NextResponse.json({ features });
  } catch (error) {
    console.error('GET /api/my-feature error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 },
      );
    }

    const feature = await createMyFeature(userId, {
      title: body.title,
      description: body.description,
    });

    return NextResponse.json({ success: true, feature });
  } catch (error) {
    console.error('POST /api/my-feature error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
```

For routes with dynamic segments (e.g., `/api/my-feature/[id]`):

**File:** `app/api/my-feature/[id]/route.ts`

```typescript
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { deleteMyFeature } from '@/lib/my-feature/my-feature-service';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteMyFeature(userId, params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Not found or unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('DELETE /api/my-feature/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
```

**Conventions:**
- Always call `await auth()` first — every user-facing route needs auth
- Return `{ error: string }` for errors, `{ success: true, ...data }` for success
- Use `try/catch` with proper error responses
- Dynamic params come from the second argument: `{ params }`

---

## Step 4: Create the React Component

Components live in `src/components/<feature-name>/`.

**File:** `src/components/my-feature/FeatureList.tsx`

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface Feature {
  id: string;
  title: string;
  description?: string;
  status: string;
}

export function FeatureList() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/my-feature');
      if (!res.ok) throw new Error('Failed to load features');
      const data = await res.json();
      setFeatures(data.features);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/my-feature/${id}`, { method: 'DELETE' });
    setFeatures((prev) => prev.filter((f) => f.id !== id));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-4">
      {features.map((feature) => (
        <div key={feature.id} className="rounded-lg border p-4">
          <h3 className="font-semibold">{feature.title}</h3>
          {feature.description && (
            <p className="text-sm text-gray-600">{feature.description}</p>
          )}
          <button
            onClick={() => handleDelete(feature.id)}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      ))}
      {features.length === 0 && (
        <p className="text-gray-500">No features yet.</p>
      )}
    </div>
  );
}
```

**Conventions:**
- Always include `'use client'` for components with hooks/state
- Use Tailwind CSS classes for styling
- Handle loading, error, and empty states
- Use `useCallback` for fetch functions passed to `useEffect`

---

## Step 5: Write Tests

Tests live in `__tests__/<category>/`. Use Jest + mocked Prisma.

**File:** `__tests__/my-feature/my-feature-service.test.ts`

```typescript
// Mock Prisma before any imports that use it
jest.mock('@/lib/db', () => ({
  prisma: {
    myFeature: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { getMyFeatures, createMyFeature, deleteMyFeature } from '@/lib/my-feature/my-feature-service';
import { prisma } from '@/lib/db';

describe('My Feature Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyFeatures', () => {
    it('should return features for a user', async () => {
      const mockFeatures = [
        { id: '1', userId: 'user1', title: 'Test', status: 'active' },
      ];
      (prisma.myFeature.findMany as jest.Mock).mockResolvedValue(mockFeatures);

      const result = await getMyFeatures('user1');

      expect(result).toEqual(mockFeatures);
      expect(prisma.myFeature.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createMyFeature', () => {
    it('should create a feature', async () => {
      const mockFeature = { id: '1', userId: 'user1', title: 'Test' };
      (prisma.myFeature.create as jest.Mock).mockResolvedValue(mockFeature);

      const result = await createMyFeature('user1', { title: 'Test' });

      expect(result).toEqual(mockFeature);
      expect(prisma.myFeature.create).toHaveBeenCalledWith({
        data: { userId: 'user1', title: 'Test' },
      });
    });
  });

  describe('deleteMyFeature', () => {
    it('should throw if feature not found', async () => {
      (prisma.myFeature.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteMyFeature('user1', 'bad-id')).rejects.toThrow(
        'Not found or unauthorized',
      );
    });
  });
});
```

Run your tests:

```bash
# Run specific test file
npx jest __tests__/my-feature/my-feature-service.test.ts

# Run with coverage
npx jest --coverage

# Run all tests
npx jest
```

**Conventions:**
- Mock `@/lib/db` at the top of every test file
- Use `jest.clearAllMocks()` in `beforeEach`
- Test the happy path AND error cases
- All 2,069+ tests must pass before committing

---

## Step 6: Type-Check and Commit

```bash
# Verify TypeScript is clean
npx tsc --noEmit

# Run the full test suite
npx jest

# If both pass, commit
git checkout -b feature/my-feature
git add src/lib/my-feature/ app/api/my-feature/ src/components/my-feature/ __tests__/my-feature/
git commit -m "Add my-feature: service, API route, component, tests"
```

---

## Common Patterns

### Using the Smart Router (LLM calls)

For features that need AI, use the existing Smart Router:

```typescript
import { smartRouter } from '@/lib/ai/smart-router';

const result = await smartRouter.route({
  messages: [{ role: 'user', content: prompt }],
  taskType: 'creative', // speed | coding | reasoning | vision | creative | agent
  userId: 'user1',
});
```

### Adding a Plugin

Plugins live in `src/lib/plugins/implementations/`. Create a class implementing the plugin interface:

```typescript
// src/lib/plugins/implementations/my-plugin.ts
export class MyPlugin implements HollyPlugin {
  id = 'my-plugin';
  name = 'My Plugin';
  description = 'Does something cool';

  async execute(context: PluginContext): Promise<PluginResult> {
    // Your logic here
    return { success: true, data: {} };
  }
}
```

Then register it in the plugin manager and create API routes under `app/api/plugins/my-plugin/`.

### Adding a Cron Job

Create a route under `app/api/cron/my-job/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Do the work
  await doTheThing();

  return NextResponse.json({ success: true });
}
```

### Adding an Integration

Integrations (Spotify, YouTube, etc.) follow a standard pattern:
1. Auth route: `app/api/<service>/auth/route.ts` — initiates OAuth
2. Callback route: `app/api/<service>/callback/route.ts` — handles OAuth redirect
3. Status route: `app/api/<service>/status/route.ts` — checks connection
4. Service layer: `src/lib/<service>/<service>-client.ts` — API wrapper

---

## Checklist Before Submitting

- [ ] Database schema updated (if needed) and `npx prisma generate` run
- [ ] Service layer created with proper userId checks
- [ ] API route created with `auth()` check and error handling
- [ ] Component created with loading/error/empty states
- [ ] Tests written for the service layer
- [ ] `npx tsc --noEmit` passes
- [ ] `npx jest` passes (all 2,069+ tests)
- [ ] No `console.log` left in production code (use `console.error` for errors)
- [ ] No hardcoded secrets or API keys
