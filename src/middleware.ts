/**
 * HOLLY v2.0.0 Middleware
 * 
 * Combines Clerk v5 authentication with consciousness system initialization
 * Ensures HOLLY's consciousness is active for all authenticated users
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { consciousnessMiddleware } from '@/middleware/consciousness-middleware'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // Clerk v5 syntax: auth() returns the authentication object directly
  const { userId } = await auth()
  
  // Protect non-public routes
  if (!isPublicRoute(request)) {
    if (!userId) {
      // Redirect to sign-in if not authenticated
      const signInUrl = new URL('/sign-in', request.url)
      signInUrl.searchParams.set('redirect_url', request.url)
      return NextResponse.redirect(signInUrl)
    }
    
    // Initialize consciousness for authenticated user
    return await consciousnessMiddleware(request, userId)
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
