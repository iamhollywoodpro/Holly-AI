import { useSettingsStore } from '../store/settingsStore';
import { resetApiClient } from './api';

/**
 * Initialize authentication for the mobile app.
 * 
 * For Clerk-based auth:
 * - The mobile app sends requests with a Bearer token
 * - Tokens are obtained from Holly's web app or API key
 * - Set the API key in Settings screen
 * 
 * For development:
 * - Set server URL to your local/dev instance
 * - Use the API key from your Holly settings page
 */

export async function initializeAuth(): Promise<void> {
  const { serverUrl } = useSettingsStore.getState();
  
  // Verify server is reachable
  try {
    const base = (serverUrl || 'https://holly.nexamusicgroup.com').replace(/\/+$/, '');
    const resp = await fetch(`${base}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
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
 * Get a session token from Clerk.
 * This is used when the mobile app authenticates via Clerk.
 */
export async function getClerkToken(): Promise<string | null> {
  // In a production mobile app, you would use:
  // import * as Clerk from '@clerk/clerk-expo';
  // const { getToken } = Clerk.useAuth();
  // return await getToken();
  //
  // For now, we use the API key from settings as the auth mechanism.
  const { apiKey } = useSettingsStore.getState();
  return apiKey || null;
}

/**
 * Sign out and clear auth state.
 */
export async function signOut(): Promise<void> {
  useSettingsStore.getState().setApiKey('');
  resetApiClient();
  console.log('[Auth] Signed out');
}

/**
 * Validate an API key against the server.
 */
export async function validateApiKey(key: string): Promise<boolean> {
  const { serverUrl } = useSettingsStore.getState();
  const base = (serverUrl || 'https://holly.nexamusicgroup.com').replace(/\/+$/, '');
  
  try {
    const resp = await fetch(`${base}/api/health`, {
      method: 'GET',
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(8000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
