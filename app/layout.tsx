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
    // Startup images cleared — iOS generates splash from manifest background_color
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
                 * SESSION PERSISTENCE:
                 * Clerk uses secure HttpOnly cookies by default.
                 * Sessions persist until the user explicitly clicks "Sign Out".
                 * No manual cookie config needed — this is Clerk's default behaviour.
                 * The afterSignOut redirect goes back to the landing page (/),
                 * so users see the login form again only when they sign out.
                 *
                 * REDIRECT AFTER AUTH:
                 * forceRedirectUrl takes priority over fallback — ensures /chat is
                 * the destination after ALL auth flows including email-code MFA
                 * (/factor-two). Without this Clerk falls through to /factor-two
                 * which has no page in the app → 404.
                 */
                afterSignOutUrl="/"
                signInUrl="/sign-in"
                signUpUrl="/sign-up"
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
                    userButtonPopoverCard:
                      'bg-gray-900 border border-purple-500/20 shadow-2xl shadow-purple-500/20',
                    userButtonPopoverActionButton: 'text-white hover:bg-white/5',
                    userButtonPopoverActionButtonText: 'text-white',
                    userButtonPopoverActionButtonIcon: 'text-gray-400',
                    userButtonPopoverFooter: 'bg-gray-800/50 border-t border-white/10',
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
