
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define which routes are "Public" (No login required)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook',
  '/api/chat',
  '/api/chat-stream',      // ✅ REAL HOLLY's new endpoint
  '/api/settings',         // ✅ Fixes the 401 error
  '/api/suggestions/generate',
  '/api/conversations/(.*)' // ✅ Fixes the 404/401 on summarize
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define which routes are "Public" (No login required)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook',
  '/api/chat',
  '/api/chat-stream',      // ✅ REAL HOLLY's new endpoint
  '/api/settings',         // ✅ Fixes the 401 error
  '/api/suggestions/generate',
  '/api/conversations/(.*)' // ✅ Fixes the 404/401 on summarize
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
