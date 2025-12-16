// src/middleware.ts
import { auth } from '@clerk/nextjs';
import { NextRequest, NextResponse } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/sign-in*',
  '/sign-up*',
  '/api/webhook',
  // Add these for REAL HOLLY's streaming and settings
  '/api/chat',
  '/api/chat-stream',
  '/api/settings',
  '/api/suggestions/generate',
  '/api/conversations/:path*',
  // Add any other API routes you want to be public
];

// Check if a route is public
function isPublicRoute(req: NextRequest): boolean {
  const path = req.nextUrl.pathname;
  return publicRoutes.some(route => {
    if (route.endsWith('/:path*')) {
      const basePath = route.slice(0, -7); // Remove ':path*'
      return path.startsWith(basePath);
    }
    return path === route || path.startsWith(`${route}/`);
  });
}

export default withClerkMiddleware((req) => {
  if (!isPublicRoute(req)) {
    return auth().protect()(req);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^\\.]*(\\.[^\\/]+)$).*)',
    // Always run for API routes
    '/api/:path*',
    // Always run for pages that might need auth
    '/(.*?)/:path*'
  ],
};
