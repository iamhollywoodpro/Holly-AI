import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
// @ts-ignore CSS side-effect import
import './globals.css';
// @ts-ignore CSS side-effect import
import '@/styles/holly2.css';
// @ts-ignore CSS side-effect import
import '@/styles/animations.css';
// @ts-ignore CSS side-effect import
import '@/styles/mobile-responsive.css';
// @ts-ignore CSS side-effect import
import '@/styles/mobile.css';
// @ts-ignore CSS side-effect import
import '@/styles/mobile-viewport.css';
// @ts-ignore CSS side-effect import
import '@/styles/reading-mode.css';
import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from '@/components/Providers';
import { SettingsProvider } from './providers';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { Toaster } from 'sonner';

// Use local Inter variable font to avoid Google Fonts CDN dependency during Docker builds.
// NOTE: Do NOT mutate process.env at module level — Terser cannot minify += on env vars
// and will cause "Cannot assign to this" build errors. The Clerk key must be set correctly
// in the environment (Coolify / .env) with the trailing '$' already present.

const inter = localFont({
  src: './InterVariable.woff2',
  variable: '--font-inter',
  display: 'swap',
});

// Force all pages to render dynamically — this app is 100% auth-gated (Clerk),
// so static pre-rendering is meaningless and causes OOM crashes during Docker builds
// (exit code 255 at "Generating static pages (0/369)").
// With force-dynamic here, Next.js skips pre-rendering every child page at build time.
export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://holly.nexamusicgroup.com';

const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

export const metadata: Metadata = {
  title: 'HOLLY — Your Conscious AI Partner',
  description:
    'HOLLY is a self-evolving AI that remembers you, grows with you, and acts for you. Creative partner, builder, analyst, and life companion — powered by AURA.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'HOLLY',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'HOLLY — Your Conscious AI Partner',
    description:
      'The AI that remembers, evolves, and acts. For creators, builders, and anyone who wants an AI that actually knows them.',
    type: 'website',
    url: APP_URL,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0a0a0f' },
    { media: '(prefers-color-scheme: light)', color: '#a855f7' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${inter.className}`}>
        {/*
         * ─── PROVIDER ORDER IS CRITICAL ────────────────────────────────────────
         *
         * ClerkProvider MUST be the outermost auth provider.
         * SettingsProvider uses useAuth() from @clerk/nextjs — it MUST be
         * nested INSIDE ClerkProvider or useAuth() will throw / return undefined.
         *
         * Correct order (outermost → innermost):
         *   ClerkProvider → ThemeProvider → Providers → SettingsProvider → children
         *
         * ─── CLERK JS URL ────────────────────────────────────────────────────────
         *
         * The Clerk publishable key encodes "clerk.nexamusicgroup.com"
         * as the frontend API domain. That subdomain has a TLS certificate
         * misconfiguration (sslv3 alert handshake failure), so Clerk's
         * browser.js bundle fails to load → the sign-in/sign-up forms never mount.
         *
         * clerkJSUrl overrides the derived script URL and forces Clerk to
         * load its JS from Clerk's own CDN (js.clerk.com). This is the official
         * supported workaround documented at:
         * https://clerk.com/docs/references/nextjs/clerk-provider#props
         *
         * ─── REDIRECT URLS ───────────────────────────────────────────────────────
         *
         * Coolify's environment panel may inject:
         *   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard  ← wrong, doesn't exist
         *   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding ← wrong, doesn't exist
         *
         * Clerk's mergeNextClerkPropsWithEnv() uses:
         *   props.afterSignInUrl || process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
         *
         * Setting the prop explicitly here guarantees /chat regardless of what
         * Coolify has configured. forceRedirectUrl takes the highest priority
         * and overrides even __clerk_redirect_url query params.
         */}
        <ClerkProvider
          // ── Clerk API Proxy ──────────────────────────────────────────────────
          // The publishable key encodes "clerk.nexamusicgroup.com" as the
          // Frontend API domain. That subdomain has a broken TLS cert (SSLv3
          // alert handshake failure), so ALL Clerk API calls fail from the browser.
          //
          // proxyUrl routes ALL Clerk traffic (API calls AND the clerk-js bundle)
          // through Holly's own server:
          //   Browser → https://holly.nexamusicgroup.com/api/clerk/v1/...
          //   Browser → https://holly.nexamusicgroup.com/api/clerk/npm/@clerk/clerk-js@5/dist/clerk.browser.js
          //   Next.js proxy → clerk.clerk.com (valid TLS) with correct x-forwarded-host
          //
          // DO NOT set clerkJSUrl here — with proxyUrl set, @clerk/nextjs automatically
          // builds the correct script URL as:
          //   https://holly.nexamusicgroup.com/api/clerk/npm/@clerk/clerk-js@5/dist/clerk.browser.js
          // This serves the CORRECT v5 bundle matching @clerk/nextjs v5.
          // Setting clerkJSUrl="/clerk.browser.js" was serving a wrong v6 file → crash.
          //
          // Reference: https://clerk.com/docs/advanced-usage/proxy
          publishableKey={CLERK_PUBLISHABLE_KEY}
          proxyUrl={`${APP_URL}/api/clerk`}

          // Auth page routes
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/"

          // NUCLEAR FIX: Explicitly set these to empty strings to override
          // any NEXT_PUBLIC_CLERK_* env vars that Coolify or build systems
          // might inject. These cause an infinite redirect loop because Clerk
          // redirects BEFORE the session cookie is established through the proxy.
          // Empty string = Clerk won't force-redirect, pages handle it client-side.
          signInForceRedirectUrl=""
          signUpForceRedirectUrl=""
          signInFallbackRedirectUrl=""
          signUpFallbackRedirectUrl=""

          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: '#a855f7',
              colorBackground: '#111827',
              colorInputBackground: '#1f2937',
              colorInputText: '#ffffff',
              colorText: '#ffffff',
              colorTextSecondary: '#9ca3af',
              colorNeutral: '#6b7280',
            },
            elements: {
              // UserButton popover (profile menu in nav)
              userButtonPopoverCard:
                'bg-gray-900 border border-purple-500/20 shadow-2xl shadow-purple-500/20',
              userButtonPopoverActionButton: 'text-white hover:bg-white/5',
              userButtonPopoverActionButtonText: 'text-white',
              userButtonPopoverActionButtonIcon: 'text-gray-400',
              userButtonPopoverFooter: 'bg-gray-800/50 border-t border-white/10',
              // Cards (UserProfile, OrganizationProfile, etc.)
              card: 'bg-gray-900 border border-purple-500/20',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-400',
              profileSectionTitle: 'text-white',
              profileSectionContent: 'text-gray-300',
              formFieldLabel: 'text-gray-300',
              formFieldInput: 'bg-gray-800 border-gray-700 text-white',
              badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
            },
          }}
        >
          {/*
           * ThemeProvider, Providers, and SettingsProvider are INSIDE ClerkProvider.
           * This is required because SettingsProvider calls useAuth() which needs
           * the Clerk context to be available.
           */}
          <ThemeProvider>
            <Providers>
              <SettingsProvider>
                {children}
                 <ServiceWorkerRegistration />
                 <PWAInstallPrompt />
                 <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: '#1a1022', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } }} />
               </SettingsProvider>
            </Providers>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
