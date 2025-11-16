/**
 * HOLLY v2.0.0 Middleware
 * 
 * Clerk v5 authentication middleware
 * Protects routes and handles authentication
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api(.*)',  // API routes handle their own authentication internally
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
  }
  
  // Add user ID to headers for server components to access
  const response = NextResponse.next()
  if (userId) {
    response.headers.set('X-User-Id', userId)
  }
  
  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
