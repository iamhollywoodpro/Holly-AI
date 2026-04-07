import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@/styles/holly2.css';
import '@/styles/animations.css';
import '@/styles/mobile-responsive.css';
import '@/styles/mobile.css';
import '@/styles/mobile-viewport.css';
import '@/styles/reading-mode.css';
import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from '@/components/Providers';
import { SettingsProvider } from './providers';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

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
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
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
    url: 'https://holly.nexamusicgroup.com',
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
      <body className={inter.className}>
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
         * The Clerk publishable key encodes "clerk.holly.nexamusicgroup.com"
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
          // The publishable key encodes "clerk.holly.nexamusicgroup.com" as the
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
          proxyUrl="https://holly.nexamusicgroup.com/api/clerk"

          // Auth page routes
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/"

          // Force redirect to /chat after auth.
          // Use the v5 API (forceRedirectUrl / fallbackRedirectUrl) — NOT deprecated afterSignInUrl.
          signInForceRedirectUrl="/chat"
          signUpForceRedirectUrl="/chat"
          signInFallbackRedirectUrl="/chat"
          signUpFallbackRedirectUrl="/chat"

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
              </SettingsProvider>
            </Providers>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
