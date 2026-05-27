/**
 * Calendar Service (Google Calendar) — Integration Tests
 *
 * Tests the calendar service layer with mocked HTTP.
 * Covers: getCalendarAuthUrl, exchangeCalendarCode, createCalendarEvent,
 *         listUpcomingEvents, deleteCalendarEvent, getCalendarStatus
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

const calMockFetch = jest.fn();
global.fetch = calMockFetch;

const originalCalEnv = process.env;

async function importCalendarService(envOverrides: Record<string, string> = {}) {
  jest.resetModules();

  process.env = {
    ...originalCalEnv,
    GOOGLE_CALENDAR_CLIENT_ID: 'gcal_client_123',
    GOOGLE_CALENDAR_CLIENT_SECRET: 'gcal_secret_456',
    ...envOverrides,
  };

  return import('@/lib/integrations/calendar-service');
}

beforeEach(() => {
  calMockFetch.mockReset();
});

afterAll(() => {
  process.env = originalCalEnv;
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Calendar Service (Google Calendar)', () => {
  describe('getCalendarAuthUrl', () => {
    it('should generate valid Google OAuth URL', async () => {
      const { getCalendarAuthUrl } = await importCalendarService();

      const url = getCalendarAuthUrl('http://localhost:3000/callback');

      expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=gcal_client_123');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
    });

    it('should include calendar events scope', async () => {
      const { getCalendarAuthUrl } = await importCalendarService();

      const url = getCalendarAuthUrl('http://localhost:3000/callback');

      expect(url).toContain('calendar.events');
    });

    it('should include state parameter when provided', async () => {
      const { getCalendarAuthUrl } = await importCalendarService();

      const url = getCalendarAuthUrl('http://localhost:3000/callback', 'csrf_state_token');

      expect(url).toContain('state=csrf_state_token');
    });

    it('should not include state parameter when omitted', async () => {
      const { getCalendarAuthUrl } = await importCalendarService();

      const url = getCalendarAuthUrl('http://localhost:3000/callback');

      expect(url).not.toContain('state=');
    });
  });

  describe('exchangeCalendarCode', () => {
    it('should exchange code for tokens', async () => {
      const { exchangeCalendarCode } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'ya29.access_token',
          refresh_token: '1//refresh_token',
          expires_in: 3600,
        }),
      });

      const result = await exchangeCalendarCode('auth_code_123', 'http://localhost:3000/callback');

      expect(result).toEqual({
        accessToken: 'ya29.access_token',
        refreshToken: '1//refresh_token',
        expiresIn: 3600,
      });

      // Verify correct endpoint
      expect(calMockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({ method: 'POST' }),
      );

      // Verify body includes the code
      const body = calMockFetch.mock.calls[0][1].body as URLSearchParams;
      expect(body.get('code')).toBe('auth_code_123');
      expect(body.get('client_id')).toBe('gcal_client_123');
      expect(body.get('client_secret')).toBe('gcal_secret_456');
      expect(body.get('grant_type')).toBe('authorization_code');
    });

    it('should return null on API error', async () => {
      const { exchangeCalendarCode } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({ ok: false });

      const result = await exchangeCalendarCode('bad_code', 'http://localhost:3000/callback');

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      const { exchangeCalendarCode } = await importCalendarService();

      calMockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await exchangeCalendarCode('auth_code', 'http://localhost:3000/callback');

      expect(result).toBeNull();
    });
  });

  describe('createCalendarEvent', () => {
    const baseEvent = {
      title: 'Team Standup',
      description: 'Daily sync',
      startTime: '2026-06-01T09:00:00',
      endTime: '2026-06-01T09:30:00',
      location: 'Zoom',
    };

    it('should create event successfully', async () => {
      const { createCalendarEvent } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'evt_123',
          htmlLink: 'https://calendar.google.com/event?eid=evt_123',
        }),
      });

      const result = await createCalendarEvent('ya29.token', baseEvent);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('evt_123');
      expect(result.htmlLink).toContain('calendar.google.com');
    });

    it('should include attendees when provided', async () => {
      const { createCalendarEvent } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'evt_attendees', htmlLink: 'https://calendar.google.com' }),
      });

      await createCalendarEvent('ya29.token', {
        ...baseEvent,
        attendees: ['alice@test.com', 'bob@test.com'],
      });

      const callBody = JSON.parse(calMockFetch.mock.calls[0][1].body);
      expect(callBody.attendees).toEqual([
        { email: 'alice@test.com' },
        { email: 'bob@test.com' },
      ]);
    });

    it('should include custom reminders when provided', async () => {
      const { createCalendarEvent } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'evt_remind', htmlLink: 'https://calendar.google.com' }),
      });

      await createCalendarEvent('ya29.token', {
        ...baseEvent,
        reminders: [{ method: 'email' as const, minutesBefore: 30 }],
      });

      const callBody = JSON.parse(calMockFetch.mock.calls[0][1].body);
      expect(callBody.reminders.useDefault).toBe(false);
      expect(callBody.reminders.overrides).toEqual([
        { method: 'email', minutesBefore: 30 },
      ]);
    });

    it('should use default reminders when none provided', async () => {
      const { createCalendarEvent } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'evt_default_remind', htmlLink: 'https://calendar.google.com' }),
      });

      await createCalendarEvent('ya29.token', baseEvent);

      const callBody = JSON.parse(calMockFetch.mock.calls[0][1].body);
      expect(callBody.reminders.useDefault).toBe(false);
      expect(callBody.reminders.overrides).toEqual([
        { method: 'popup', minutes: 10 },
        { method: 'email', minutes: 60 },
      ]);
    });

    it('should send Bearer auth header', async () => {
      const { createCalendarEvent } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'evt_auth', htmlLink: 'https://calendar.google.com' }),
      });

      await createCalendarEvent('ya29.test_token', baseEvent);

      const headers = calMockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer ya29.test_token');
    });

    it('should handle API error response', async () => {
      const { createCalendarEvent } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => '{"error":"invalid_grant"}',
      });

      const result = await createCalendarEvent('ya29.token', baseEvent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Google Calendar API error');
    });

    it('should handle network error', async () => {
      const { createCalendarEvent } = await importCalendarService();

      calMockFetch.mockRejectedValueOnce(new Error('Timeout'));

      const result = await createCalendarEvent('ya29.token', baseEvent);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Timeout');
    });

    it('should include location and description in request body', async () => {
      const { createCalendarEvent } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'evt_full', htmlLink: 'https://calendar.google.com' }),
      });

      await createCalendarEvent('ya29.token', baseEvent);

      const callBody = JSON.parse(calMockFetch.mock.calls[0][1].body);
      expect(callBody.summary).toBe('Team Standup');
      expect(callBody.description).toBe('Daily sync');
      expect(callBody.location).toBe('Zoom');
    });
  });

  describe('listUpcomingEvents', () => {
    it('should return parsed events', async () => {
      const { listUpcomingEvents } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'evt_1',
              summary: 'Meeting',
              description: 'Weekly',
              start: { dateTime: '2026-06-01T10:00:00' },
              end: { dateTime: '2026-06-01T11:00:00' },
              location: 'Office',
            },
            {
              id: 'evt_2',
              summary: 'Lunch',
              start: { date: '2026-06-01' },
              end: { date: '2026-06-01' },
            },
          ],
        }),
      });

      const events = await listUpcomingEvents('ya29.token');

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({
        id: 'evt_1',
        title: 'Meeting',
        description: 'Weekly',
        startTime: '2026-06-01T10:00:00',
        endTime: '2026-06-01T11:00:00',
        location: 'Office',
      });
      // All-day event uses date instead of dateTime
      expect(events[1].startTime).toBe('2026-06-01');
    });

    it('should return empty array on API error', async () => {
      const { listUpcomingEvents } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({ ok: false });

      const events = await listUpcomingEvents('ya29.token');

      expect(events).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      const { listUpcomingEvents } = await importCalendarService();

      calMockFetch.mockRejectedValueOnce(new Error('Network down'));

      const events = await listUpcomingEvents('ya29.token');

      expect(events).toEqual([]);
    });

    it('should pass maxResults parameter', async () => {
      const { listUpcomingEvents } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      await listUpcomingEvents('ya29.token', 5);

      const url = calMockFetch.mock.calls[0][0];
      expect(url).toContain('maxResults=5');
    });

    it('should default to 10 maxResults', async () => {
      const { listUpcomingEvents } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      await listUpcomingEvents('ya29.token');

      const url = calMockFetch.mock.calls[0][0];
      expect(url).toContain('maxResults=10');
    });

    it('should handle empty items array', async () => {
      const { listUpcomingEvents } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),  // No items property
      });

      const events = await listUpcomingEvents('ya29.token');

      expect(events).toEqual([]);
    });
  });

  describe('deleteCalendarEvent', () => {
    it('should delete event successfully', async () => {
      const { deleteCalendarEvent } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await deleteCalendarEvent('ya29.token', 'evt_123');

      expect(result.success).toBe(true);

      const url = calMockFetch.mock.calls[0][0];
      expect(url).toContain('calendars/primary/events/evt_123');
      expect(calMockFetch.mock.calls[0][1].method).toBe('DELETE');
    });

    it('should handle 204 No Content as success', async () => {
      const { deleteCalendarEvent } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await deleteCalendarEvent('ya29.token', 'evt_123');

      expect(result.success).toBe(true);
    });

    it('should handle non-204 error response', async () => {
      const { deleteCalendarEvent } = await importCalendarService();

      calMockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await deleteCalendarEvent('ya29.token', 'evt_notfound');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to delete');
    });

    it('should handle network error', async () => {
      const { deleteCalendarEvent } = await importCalendarService();

      calMockFetch.mockRejectedValueOnce(new Error('Connection lost'));

      const result = await deleteCalendarEvent('ya29.token', 'evt_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection lost');
    });
  });

  describe('getCalendarStatus', () => {
    it('should return configured when credentials exist', async () => {
      const { getCalendarStatus } = await importCalendarService();

      const status = getCalendarStatus();
      expect(status.configured).toBe(true);
      expect(status.provider).toBe('Google Calendar');
    });

    it('should return unconfigured when client ID missing', async () => {
      const { getCalendarStatus } = await importCalendarService({
        GOOGLE_CALENDAR_CLIENT_ID: '',
      });

      const status = getCalendarStatus();
      expect(status.configured).toBe(false);
    });

    it('should return unconfigured when client secret missing', async () => {
      const { getCalendarStatus } = await importCalendarService({
        GOOGLE_CALENDAR_CLIENT_SECRET: '',
      });

      const status = getCalendarStatus();
      expect(status.configured).toBe(false);
    });
  });
});
