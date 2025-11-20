'use client';

import { DebugProvider } from '@/contexts/DebugContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DebugProvider>
      {children}
    </DebugProvider>
  );
}
