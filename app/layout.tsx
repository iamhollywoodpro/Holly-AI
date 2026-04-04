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
        <SettingsProvider>
          <ThemeProvider>
            <Providers>
              <ClerkProvider
                /*
                 * ─── CLERK JS URL ────────────────────────────────────────────────
                 * The Clerk publishable key encodes "clerk.holly.nexamusicgroup.com"
                 * as the frontend API domain. That subdomain has an SSL certificate
                 * misconfiguration (TLS handshake failure) so Clerk's browser.js
                 * bundle fails to load → the sign-in/sign-up forms never mount.
                 *
                 * clerkJSUrl overrides the derived script URL and forces Clerk to
                 * load its JS directly from Clerk's own CDN (js.clerk.com).
                 * This is the official supported workaround for custom-domain SSL
                 * issues per Clerk documentation.
                 *
                 * ─── REDIRECT URLS ───────────────────────────────────────────────
                 * Coolify's environment panel injects:
                 *   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
                 *   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
                 *
                 * Clerk's mergeNextClerkPropsWithEnv() merges env vars AFTER props,
                 * but afterSignInUrl/afterSignUpUrl use props.X || env.X — meaning
                 * the prop value wins when explicitly set.
                 *
                 * Setting all redirect props explicitly here overrides Coolify env
                 * vars and ensures users land on /chat after auth (not /dashboard
                 * which is a blank page or /onboarding which doesn't exist).
                 *
                 * ─── SESSION ─────────────────────────────────────────────────────
                 * Clerk uses HttpOnly secure cookies. Sessions persist until sign-out.
                 */

                // Force Clerk JS to load from Clerk's CDN, bypassing the broken
                // clerk.holly.nexamusicgroup.com custom domain SSL cert
                clerkJSUrl="https://js.clerk.com/npm/@clerk/clerk-js@5/dist/clerk.browser.js"

                // Auth page routes
                signInUrl="/sign-in"
                signUpUrl="/sign-up"
                afterSignOutUrl="/"

                // ALL redirect props set explicitly to override Coolify env vars
                // (NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard etc.)
                afterSignInUrl="/chat"
                afterSignUpUrl="/chat"
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
                {children}
              </ClerkProvider>
            </Providers>
          </ThemeProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
