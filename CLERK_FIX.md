# Correct Clerk Usage in Next.js App Router API Routes

From official Clerk documentation: https://clerk.com/docs/nextjs/guides/users/reading

## For App Router (what we're using):

### To get userId:
```typescript
import { auth } from '@clerk/nextjs/server'

const { userId } = await auth()
```

### To get full user object:
```typescript
import { currentUser } from '@clerk/nextjs/server'

const user = await currentUser()
// user.primaryEmailAddress?.emailAddress
```

### To use clerkClient (for additional API calls):
```typescript
import { clerkClient } from '@clerk/nextjs/server'

const client = await clerkClient()
const user = await client.users.getUser(userId)
```

## The Fix:

We should use `currentUser()` directly instead of `clerkClient().users.getUser()` because:
1. It's simpler
2. It's the recommended approach for App Router
3. It returns the full Backend User object directly

## Updated user-manager.ts:

```typescript
import { currentUser } from '@clerk/nextjs/server'

export async function getOrCreateUser(clerkUserId: string) {
  // Get current user directly
  const clerkUser = await currentUser()
  
  if (!clerkUser || clerkUser.id !== clerkUserId) {
    throw new Error('User not authenticated')
  }
  
  const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress
  // ... rest of the logic
}
```

BUT WAIT - there's a problem! `currentUser()` doesn't take a userId parameter - it gets the CURRENT user from the session.

So we need to use `clerkClient` but call it correctly as a function.
