import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 1. Define Public Routes
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook",
  "/api/chat(.*)",        
  "/api/settings",        
  "/api/suggestions/(.*)",
  "/api/conversations/(.*)" 
]);

// 2. Export Middleware
export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

// 3. Matcher Config
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
