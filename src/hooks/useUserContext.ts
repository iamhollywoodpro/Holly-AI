/**
 * Hook to fetch and manage HOLLY's memory of the current user
 */

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import type { UserContext } from '@/lib/memory/user-context';

interface UseUserContextReturn {
  context: UserContext | null;
  greeting: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useUserContext(): UseUserContextReturn {
  const { user, isLoaded } = useUser();
  const [context, setContext] = useState<UserContext | null>(null);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = async () => {
    if (!isLoaded || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/user/context');

      if (!response.ok) {
        throw new Error('Failed to fetch user context');
      }

      const data = await response.json();
      setContext(data.context);
      setGreeting(data.greeting);
    } catch (err) {
      console.error('[useUserContext] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, [isLoaded, user?.id]);

  return {
    context,
    greeting,
    loading,
    error,
    refresh: fetchContext,
  };
}
