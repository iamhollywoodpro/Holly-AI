/**
 * Calendar Integration Service
 * Phase 8.5.2 — Google Calendar OAuth + event management
 *
 * Holly can schedule, reschedule, and remind about events.
 * Morning briefing includes today's calendar.
 */

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  location?: string;
  attendees?: string[];
  reminders?: { method: 'email' | 'popup'; minutesBefore: number }[];
}

export interface CalendarResult {
  success: boolean;
  eventId?: string;
  htmlLink?: string;
  error?: string;
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '';

/**
 * Get Google Calendar OAuth URL for user authorization
 */
export function getCalendarAuthUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent',
    ...(state ? { state } : {}),
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCalendarCode(code: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch {
    return null;
  }
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<CalendarResult> {
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        start: { dateTime: event.startTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: event.endTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        location: event.location,
        attendees: event.attendees?.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: event.reminders || [
            { method: 'popup', minutes: 10 },
            { method: 'email', minutes: 60 },
          ],
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Google Calendar API error: ${error}` };
    }

    const data = await response.json();
    return { success: true, eventId: data.id, htmlLink: data.htmlLink };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * List upcoming calendar events
 */
export async function listUpcomingEvents(
  accessToken: string,
  maxResults: number = 10
): Promise<CalendarEvent[]> {
  try {
    const now = new Date().toISOString();
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&timeMin=${now}&orderBy=startTime&singleEvents=true`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.summary,
      description: item.description,
      startTime: item.start?.dateTime || item.start?.date,
      endTime: item.end?.dateTime || item.end?.date,
      location: item.location,
    }));
  } catch {
    return [];
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<CalendarResult> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!response.ok && response.status !== 204) {
      return { success: false, error: 'Failed to delete event' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Get calendar service status
 */
export function getCalendarStatus(): { configured: boolean; provider: string } {
  return {
    configured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
    provider: 'Google Calendar',
  };
}
