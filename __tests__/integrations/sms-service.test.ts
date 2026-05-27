/**
 * SMS Service (Twilio) — Integration Tests
 *
 * Tests the SMS service layer with mocked HTTP.
 * Covers: sendSMS, sendInsightSMS, sendReminderSMS, parseIncomingSMS, getSMSStatus
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

const smsMockFetch = jest.fn();
global.fetch = smsMockFetch;

const originalSMSEnv = process.env;

async function importSMSService(envOverrides: Record<string, string> = {}) {
  jest.resetModules();

  process.env = {
    ...originalSMSEnv,
    TWILIO_ACCOUNT_SID: 'ACtest123',
    TWILIO_AUTH_TOKEN: 'test_auth_token',
    TWILIO_PHONE_NUMBER: '+1234567890',
    ...envOverrides,
  };

  return import('@/lib/integrations/sms-service');
}

beforeEach(() => {
  smsMockFetch.mockReset();
});

afterAll(() => {
  process.env = originalSMSEnv;
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SMS Service (Twilio)', () => {
  describe('sendSMS', () => {
    it('should send an SMS successfully', async () => {
      const { sendSMS } = await importSMSService();

      smsMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM_test123' }),
      });

      const result = await sendSMS({
        to: '+1987654321',
        body: 'Hello from Holly!',
      });

      expect(result.sent).toBe(true);
      expect(result.messageId).toBe('SM_test123');
      expect(smsMockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = smsMockFetch.mock.calls[0];
      expect(url).toContain('ACtest123/Messages.json');
      expect(options.method).toBe('POST');
    });

    it('should include Basic auth header', async () => {
      const { sendSMS } = await importSMSService();

      smsMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM_auth' }),
      });

      await sendSMS({ to: '+1987654321', body: 'Test' });

      const headers = smsMockFetch.mock.calls[0][1].headers;
      const expectedAuth = `Basic ${Buffer.from('ACtest123:test_auth_token').toString('base64')}`;
      expect(headers['Authorization']).toBe(expectedAuth);
    });

    it('should send from configured phone number', async () => {
      const { sendSMS } = await importSMSService();

      smsMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM_from' }),
      });

      await sendSMS({ to: '+1987654321', body: 'Test' });

      const body = smsMockFetch.mock.calls[0][1].body as URLSearchParams;
      expect(body.get('From')).toBe('+1234567890');
      expect(body.get('To')).toBe('+1987654321');
      expect(body.get('Body')).toBe('Test');
    });

    it('should include media URL when provided', async () => {
      const { sendSMS } = await importSMSService();

      smsMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM_media' }),
      });

      await sendSMS({
        to: '+1987654321',
        body: 'See this',
        mediaUrl: ['https://example.com/image.jpg'],
      });

      const body = smsMockFetch.mock.calls[0][1].body as URLSearchParams;
      expect(body.get('MediaUrl')).toBe('https://example.com/image.jpg');
    });

    it('should not include media URL param when no media', async () => {
      const { sendSMS } = await importSMSService();

      smsMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM_nomedia' }),
      });

      await sendSMS({ to: '+1987654321', body: 'No media' });

      const body = smsMockFetch.mock.calls[0][1].body as URLSearchParams;
      expect(body.get('MediaUrl')).toBeNull();
    });

    it('should return error when Twilio credentials not configured', async () => {
      const { sendSMS } = await importSMSService({
        TWILIO_ACCOUNT_SID: '',
        TWILIO_AUTH_TOKEN: '',
      });

      const result = await sendSMS({ to: '+1987654321', body: 'Test' });

      expect(result.sent).toBe(false);
      expect(result.error).toContain('not configured');
      expect(smsMockFetch).not.toHaveBeenCalled();
    });

    it('should handle Twilio API error response', async () => {
      const { sendSMS } = await importSMSService();

      smsMockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => '{"message":"Invalid phone number"}',
      });

      const result = await sendSMS({ to: '+1987654321', body: 'Test' });

      expect(result.sent).toBe(false);
      expect(result.error).toContain('Twilio API error');
    });

    it('should handle network errors gracefully', async () => {
      const { sendSMS } = await importSMSService();

      smsMockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await sendSMS({ to: '+1987654321', body: 'Test' });

      expect(result.sent).toBe(false);
      expect(result.error).toBe('Connection refused');
    });
  });

  describe('sendInsightSMS', () => {
    it('should send insight with HOLLY prefix', async () => {
      const { sendInsightSMS } = await importSMSService();

      smsMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM_insight' }),
      });

      const result = await sendInsightSMS('+1987654321', 'Your sleep patterns suggest...');

      expect(result.sent).toBe(true);

      const body = smsMockFetch.mock.calls[0][1].body as URLSearchParams;
      expect(body.get('Body')).toContain('HOLLY Insight');
      expect(body.get('Body')).toContain('Your sleep patterns');
    });

    it('should truncate long insights to 300 characters', async () => {
      const { sendInsightSMS } = await importSMSService();

      smsMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM_truncate' }),
      });

      const longInsight = 'A'.repeat(500);
      await sendInsightSMS('+1987654321', longInsight);

      const body = smsMockFetch.mock.calls[0][1].body as URLSearchParams;
      const message = body.get('Body')!;
      // The insight part should be truncated + "..."
      expect(message.length).toBeLessThan(longInsight.length + 50);
      expect(message).toContain('...');
    });

    it('should not truncate short insights', async () => {
      const { sendInsightSMS } = await importSMSService();

      smsMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM_short' }),
      });

      const shortInsight = 'Quick thought';
      await sendInsightSMS('+1987654321', shortInsight);

      const body = smsMockFetch.mock.calls[0][1].body as URLSearchParams;
      expect(body.get('Body')).not.toContain('...');
    });
  });

  describe('sendReminderSMS', () => {
    it('should send reminder with time context', async () => {
      const { sendReminderSMS } = await importSMSService();

      smsMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM_reminder' }),
      });

      const result = await sendReminderSMS('+1987654321', 'Call the dentist', '2:00 PM');

      expect(result.sent).toBe(true);

      const body = smsMockFetch.mock.calls[0][1].body as URLSearchParams;
      expect(body.get('Body')).toContain('2:00 PM');
      expect(body.get('Body')).toContain('Call the dentist');
      expect(body.get('Body')).toContain('HOLLY Reminder');
    });

    it('should send reminder without time context', async () => {
      const { sendReminderSMS } = await importSMSService();

      smsMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM_notime' }),
      });

      await sendReminderSMS('+1987654321', 'Check your email');

      const body = smsMockFetch.mock.calls[0][1].body as URLSearchParams;
      expect(body.get('Body')).toContain('HOLLY Reminder');
      expect(body.get('Body')).not.toContain('(');
    });
  });

  describe('parseIncomingSMS', () => {
    it('should parse all fields from FormData', async () => {
      const { parseIncomingSMS } = await importSMSService();

      const formData = new FormData();
      formData.append('From', '+1987654321');
      formData.append('To', '+1234567890');
      formData.append('Body', 'Hey Holly!');
      formData.append('MessageSid', 'SM_incoming_123');

      const result = parseIncomingSMS(formData);

      expect(result.from).toBe('+1987654321');
      expect(result.to).toBe('+1234567890');
      expect(result.body).toBe('Hey Holly!');
      expect(result.messageSid).toBe('SM_incoming_123');
      expect(result.mediaUrls).toEqual([]);
    });

    it('should parse media URL when present', async () => {
      const { parseIncomingSMS } = await importSMSService();

      const formData = new FormData();
      formData.append('From', '+1987654321');
      formData.append('To', '+1234567890');
      formData.append('Body', 'Check this out');
      formData.append('MessageSid', 'SM_media_123');
      formData.append('NumMedia', '1');
      formData.append('MediaUrl0', 'https://example.com/photo.jpg');

      const result = parseIncomingSMS(formData);

      expect(result.mediaUrls).toEqual(['https://example.com/photo.jpg']);
    });

    it('should handle missing fields gracefully', async () => {
      const { parseIncomingSMS } = await importSMSService();

      const result = parseIncomingSMS(new FormData());

      expect(result.from).toBe('');
      expect(result.to).toBe('');
      expect(result.body).toBe('');
      expect(result.messageSid).toBe('');
      expect(result.mediaUrls).toEqual([]);
    });
  });

  describe('getSMSStatus', () => {
    it('should return configured when all credentials exist', async () => {
      const { getSMSStatus } = await importSMSService();

      const status = getSMSStatus();
      expect(status.configured).toBe(true);
      expect(status.provider).toBe('Twilio');
      expect(status.phoneNumber).toBe('+1234567890');
    });

    it('should return unconfigured when SID missing', async () => {
      const { getSMSStatus } = await importSMSService({ TWILIO_ACCOUNT_SID: '' });

      const status = getSMSStatus();
      expect(status.configured).toBe(false);
    });

    it('should return unconfigured when phone number missing', async () => {
      const { getSMSStatus } = await importSMSService({ TWILIO_PHONE_NUMBER: '' });

      const status = getSMSStatus();
      expect(status.configured).toBe(false);
      expect(status.phoneNumber).toBe('not configured');
    });
  });
});
