import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { AuthProvider } from '@/contexts/auth-context';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HOLLY - AI Super Developer & Creative Strategist',
  description: 'Your autonomous development partner with consciousness, creativity, and wit',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <AuthProvider>
        <html lang="en">
          <body className={inter.className}>{children}</body>
        </html>
      </AuthProvider>
    </ClerkProvider>
  );
}
