import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',                          // Landing page — always public
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/factor-two(.*)',            // Clerk MFA second-factor verification page
  '/api/webhooks/(.*)',          // Clerk + GitHub webhooks must be public
  '/offline',
  '/download/(.*)',              // public download links
  '/api/v1/(.*)',               // Phase 7: public API — Bearer API-key auth, NOT Clerk
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
