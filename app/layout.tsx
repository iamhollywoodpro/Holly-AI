import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@/styles/holly2.css';
import '@/styles/animations.css';
import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from '@/components/Providers';
import { SettingsProvider } from './providers';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HOLLY - AI Development Partner',
  description: 'Your autonomous AI developer, designer, and creative strategist',
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
              // User button dropdown
              userButtonPopoverCard: 'bg-gray-900 border border-purple-500/20 shadow-2xl shadow-purple-500/20',
              userButtonPopoverActionButton: 'text-white hover:bg-white/5',
              userButtonPopoverActionButtonText: 'text-white',
              userButtonPopoverActionButtonIcon: 'text-gray-400',
              userButtonPopoverFooter: 'bg-gray-800/50 border-t border-white/10',
              // Profile card
              card: 'bg-gray-900 border border-purple-500/20',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-400',
              profileSectionTitle: 'text-white',
              profileSectionContent: 'text-gray-300',
              // Form elements
              formFieldLabel: 'text-gray-300',
              formFieldInput: 'bg-gray-800 border-gray-700 text-white',
              // Badges
              badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
            },
          }}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
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
