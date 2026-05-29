/**
 * Email Service (Resend) — Integration Tests
 *
 * Tests the email service layer with mocked HTTP.
 * Covers: sendEmail, sendProactiveEmail, sendMorningBriefingEmail, getEmailStatus
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

const emailMockFetch = jest.fn();
global.fetch = emailMockFetch;

// We need to control env vars per test
const originalEmailEnv = process.env;

// Mock prisma (email-service imports it but doesn't use it for these functions)
jest.mock('@/lib/db', () => ({
  prisma: {},
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Reset env and re-import the module so it picks up new env values */
async function importEmailService(envOverrides: Record<string, string> = {}) {
  // Reset module cache
  jest.resetModules();

  process.env = {
    ...originalEmailEnv,
    RESEND_API_KEY: 're_test_key_123',
    RESEND_FROM_EMAIL: 'holly@test.com',
    ...envOverrides,
  };

  // Re-import after env change
  return import('@/lib/integrations/email-service');
}

beforeEach(() => {
  emailMockFetch.mockReset();
});

afterAll(() => {
  process.env = originalEmailEnv;
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Email Service (Resend)', () => {
  describe('sendEmail', () => {
    it('should send an email successfully', async () => {
      const { sendEmail } = await importEmailService();

      emailMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_abc123' }),
      });

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        body: 'Hello World',
      });

      expect(result.sent).toBe(true);
      expect(result.messageId).toBe('msg_abc123');
      expect(emailMockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should send to multiple recipients', async () => {
      const { sendEmail } = await importEmailService();

      emailMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_multi' }),
      });

      await sendEmail({
        to: ['a@test.com', 'b@test.com'],
        subject: 'Multi',
        body: 'Hello',
      });

      const callBody = JSON.parse(emailMockFetch.mock.calls[0][1].body);
      expect(callBody.to).toEqual(['a@test.com', 'b@test.com']);
    });

    it('should include optional fields when provided', async () => {
      const { sendEmail } = await importEmailService();

      emailMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_opts' }),
      });

      await sendEmail({
        to: 'user@test.com',
        subject: 'Full',
        body: 'Plain text',
        html: '<h1>HTML</h1>',
        replyTo: 'reply@test.com',
        cc: ['cc@test.com'],
        bcc: ['bcc@test.com'],
      });

      const callBody = JSON.parse(emailMockFetch.mock.calls[0][1].body);
      expect(callBody.html).toBe('<h1>HTML</h1>');
      expect(callBody.reply_to).toBe('reply@test.com');
      expect(callBody.cc).toEqual(['cc@test.com']);
      expect(callBody.bcc).toEqual(['bcc@test.com']);
    });

    it('should return error when RESEND_API_KEY not configured', async () => {
      const { sendEmail } = await importEmailService({ RESEND_API_KEY: '' });

      const result = await sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        body: 'Hello',
      });

      expect(result.sent).toBe(false);
      expect(result.error).toContain('not configured');
      expect(emailMockFetch).not.toHaveBeenCalled();
    });

    it('should handle Resend API error response', async () => {
      const { sendEmail } = await importEmailService();

      emailMockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => '{"message":"Invalid API key"}',
      });

      const result = await sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        body: 'Hello',
      });

      expect(result.sent).toBe(false);
      expect(result.error).toContain('Resend API error');
    });

    it('should handle network errors gracefully', async () => {
      const { sendEmail } = await importEmailService();

      emailMockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        body: 'Hello',
      });

      expect(result.sent).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('should set from address with HOLLY prefix', async () => {
      const { sendEmail } = await importEmailService();

      emailMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_from' }),
      });

      await sendEmail({ to: 'user@test.com', subject: 'Test', body: 'Hi' });

      const callBody = JSON.parse(emailMockFetch.mock.calls[0][1].body);
      expect(callBody.from).toBe('HOLLY <holly@test.com>');
    });

    it('should send Authorization Bearer header', async () => {
      const { sendEmail } = await importEmailService();

      emailMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_auth' }),
      });

      await sendEmail({ to: 'user@test.com', subject: 'Test', body: 'Hi' });

      const headers = emailMockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer re_test_key_123');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('sendProactiveEmail', () => {
    it('should send styled HTML email', async () => {
      const { sendProactiveEmail } = await importEmailService();

      emailMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_proactive' }),
      });

      const result = await sendProactiveEmail('user@test.com', 'Steve', 'Quick Update', 'Here is the update');

      expect(result.sent).toBe(true);
      expect(result.messageId).toBe('msg_proactive');

      const callBody = JSON.parse(emailMockFetch.mock.calls[0][1].body);
      expect(callBody.subject).toBe('HOLLY: Quick Update');
      expect(callBody.html).toContain('Hey Steve');
      expect(callBody.html).toContain('Here is the update');
      // Verify styled template
      expect(callBody.html).toContain('font-family');
      expect(callBody.html).toContain('2D8B5E'); // Emerald color
    });

    it('should propagate send failure', async () => {
      const { sendProactiveEmail } = await importEmailService({ RESEND_API_KEY: '' });

      const result = await sendProactiveEmail('user@test.com', 'Steve', 'Test', 'Content');

      expect(result.sent).toBe(false);
    });
  });

  describe('sendMorningBriefingEmail', () => {
    it('should build briefing email with all sections', async () => {
      const { sendMorningBriefingEmail } = await importEmailService();

      emailMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_briefing' }),
      });

      const result = await sendMorningBriefingEmail('user@test.com', 'Steve', {
        emotionalState: 'Feeling energized',
        systemHealth: 'All systems go',
        overnightLearnings: ['Learned about quantum computing', 'New recipe ideas'],
        goalProgress: ['Project A at 80%'],
        todayRecommendation: 'Start with deep work',
      });

      expect(result.sent).toBe(true);

      const callBody = JSON.parse(emailMockFetch.mock.calls[0][1].body);
      expect(callBody.html).toContain('Feeling energized');
      expect(callBody.html).toContain('All systems go');
      expect(callBody.html).toContain('quantum computing');
      expect(callBody.html).toContain('Project A at 80%');
      expect(callBody.html).toContain('Start with deep work');
      expect(callBody.subject).toBe('HOLLY: Your Morning Briefing ☀️');
    });

    it('should handle empty optional lists', async () => {
      const { sendMorningBriefingEmail } = await importEmailService();

      emailMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_empty' }),
      });

      const result = await sendMorningBriefingEmail('user@test.com', 'Steve', {
        emotionalState: 'Neutral',
        systemHealth: 'Good',
        overnightLearnings: [],
        goalProgress: [],
        todayRecommendation: 'Take it easy',
      });

      expect(result.sent).toBe(true);
    });
  });

  describe('getEmailStatus', () => {
    it('should return configured status when API key exists', async () => {
      const { getEmailStatus } = await importEmailService();

      const status = getEmailStatus();
      expect(status.configured).toBe(true);
      expect(status.provider).toBe('Resend');
      expect(status.fromEmail).toBe('holly@test.com');
    });

    it('should return unconfigured when API key is missing', async () => {
      const { getEmailStatus } = await importEmailService({ RESEND_API_KEY: '' });

      const status = getEmailStatus();
      expect(status.configured).toBe(false);
    });
  });
});
