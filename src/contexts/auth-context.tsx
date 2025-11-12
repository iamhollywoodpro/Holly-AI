'use client';

// HOLLY Phase 3: Authentication Context - Migrated to Clerk
// Manages user authentication state across the app

import React, { createContext, useContext } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useAuth();
  const router = useRouter();

  const signOut = async () => {
    await clerkSignOut();
    router.push('/sign-in');
  };

  const value: AuthContextType = {
    user: user || null,
    loading: !isLoaded,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
