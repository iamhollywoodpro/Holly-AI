/**
 * Holly AI — Authentication Service
 *
 * Real Clerk Expo integration using useAuth() for token management.
 * Falls back to API key mode when Clerk is not configured.
 *
 * Usage:
 *   - Wrap your app in <ClerkProvider publishableKey="pk_...">
 *   - Call getClerkToken() to get a JWT for API requests
 *   - For API key mode (dev/legacy), set apiKey in settings
 */

import { useSettingsStore } from '../store/settingsStore';
import { resetApiClient } from './api';

/**
 * Create an AbortSignal with a timeout.
 * Works across all TypeScript targets (React Native, Node, browser).
 */
function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// ─── Clerk Token Provider ────────────────────────────────────────────────────

// This will be set from the React tree via setClerkTokenGetter()
let _clerkTokenGetter: (() => Promise<string | null>) | null = null;

/**
 * Register the Clerk token getter from the React component tree.
 * Called once from the root layout after ClerkProvider is mounted.
 *
 * Usage in your root layout:
 *   const { getToken } = useAuth();
 *   useEffect(() => { setClerkTokenGetter(getToken); }, [getToken]);
 */
export function setClerkTokenGetter(getter: (() => Promise<string | null>) | null): void {
  _clerkTokenGetter = getter;
}

/**
 * Get an authentication token for API requests.
 *
 * Priority:
 * 1. Clerk JWT (if token getter is registered → production)
 * 2. API key from settings (if set → dev/legacy)
 * 3. null (unauthenticated)
 */
export async function getAuthToken(): Promise<string | null> {
  // Try Clerk first
  if (_clerkTokenGetter) {
    try {
      const token = await _clerkTokenGetter();
      if (token) return token;
    } catch (err) {
      console.warn('[Auth] Clerk token error:', err);
    }
  }

  // Fallback to API key from settings
  const { apiKey } = useSettingsStore.getState();
  return apiKey || null;
}

/**
 * Backwards-compatible alias for getAuthToken.
 * Existing code that calls getClerkToken() continues to work.
 */
export const getClerkToken = getAuthToken;

// ─── Auth Lifecycle ──────────────────────────────────────────────────────────

/**
 * Initialize authentication for the mobile app.
 *
 * Verifies server reachability and logs connection status.
 */
export async function initializeAuth(): Promise<void> {
  const { serverUrl } = useSettingsStore.getState();

  try {
    const base = (serverUrl || 'https://holly.nexamusicgroup.com').replace(/\/+$/, '');
    const resp = await fetch(`${base}/api/health`, {
      method: 'GET',
      signal: timeoutSignal(5000),
    });

    if (resp.ok) {
      console.log('[Auth] Server reachable:', base);
    } else {
      console.warn('[Auth] Server returned status:', resp.status);
    }
  } catch (err) {
    console.warn('[Auth] Server unreachable:', err);
  }
}

/**
 * Sign out and clear auth state.
 * Clears the API key from settings and resets the API client.
 * Clerk sign-out should be called separately via useAuth().signOut().
 */
export async function signOut(): Promise<void> {
  useSettingsStore.getState().setApiKey('');
  _clerkTokenGetter = null;
  resetApiClient();
  console.log('[Auth] Signed out');
}

/**
 * Validate an API key against the server.
 * Used in settings screen to verify the key works.
 */
export async function validateApiKey(key: string): Promise<boolean> {
  const { serverUrl } = useSettingsStore.getState();
  const base = (serverUrl || 'https://holly.nexamusicgroup.com').replace(/\/+$/, '');

  try {
    const resp = await fetch(`${base}/api/health`, {
      method: 'GET',
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      signal: timeoutSignal(8000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
