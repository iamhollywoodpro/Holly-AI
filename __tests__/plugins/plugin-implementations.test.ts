/**
 * Phase F — Plugin Implementation Tests
 *
 * Tests the actual logic for all 6 plugins:
 * Holly Notes, Code Review, Daily Digest, Mood Tracker,
 * Project Planner, and Language Tutor.
 */

/// <reference types="jest" />

// Mock Prisma for all plugin services
const mockCreate = jest.fn().mockResolvedValue({ id: 'test-id', userId: 'user1' });
const mockFindMany = jest.fn().mockResolvedValue([]);
const mockFindFirst = jest.fn().mockResolvedValue(null);
const mockCount = jest.fn().mockResolvedValue(0);
const mockUpdate = jest.fn().mockResolvedValue({ id: 'test-id' });
const mockDelete = jest.fn().mockResolvedValue({ id: 'test-id' });
const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pluginNote: { create: mockCreate, findMany: mockFindMany, findFirst: mockFindFirst, count: mockCount, update: mockUpdate, delete: mockDelete },
    pluginMoodEntry: { create: mockCreate, findMany: mockFindMany, findFirst: mockFindFirst, count: mockCount },
    pluginDailyDigest: { create: mockCreate, findMany: mockFindMany, findFirst: mockFindFirst, count: mockCount },
    pluginProject: { create: mockCreate, findMany: mockFindMany, findFirst: mockFindFirst, count: mockCount, update: mockUpdate, delete: mockDelete },
    pluginTask: { create: mockCreate, findMany: mockFindMany, findFirst: mockFindFirst, count: mockCount, update: mockUpdate, delete: mockDelete, deleteMany: mockDeleteMany },
    pluginLanguageSession: { create: mockCreate, findMany: mockFindMany, findFirst: mockFindFirst, count: mockCount, update: mockUpdate },
    conversation: { findMany: mockFindMany },
  },
}));

// Mock AI router
jest.mock('@/lib/ai/smart-router', () => ({
  smartRoute: jest.fn().mockResolvedValue({ waterfall: [{ model: 'test', provider: 'test' }] }),
}));
jest.mock('@/lib/ai/cascade', () => ({
  cascadeCollect: jest.fn().mockResolvedValue({ text: '{}' }),
}));

import { NotesService } from '@/lib/plugins/implementations/holly-notes';
import { CodeReviewService } from '@/lib/plugins/implementations/holly-code-review';
import { MoodTrackerService } from '@/lib/plugins/implementations/holly-mood-tracker';
import { DailyDigestService } from '@/lib/plugins/implementations/holly-daily-digest';
import { ProjectPlannerService } from '@/lib/plugins/implementations/holly-project-planner';
import { LanguageTutorService } from '@/lib/plugins/implementations/holly-language-tutor';

describe('Phase F — Plugin Implementations', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Holly Notes ────────────────────────────────────────────────────────

  describe('Holly Notes', () => {
    it('should create a note with title and content', async () => {
      mockCreate.mockResolvedValueOnce({ id: 'note-1', userId: 'user1', title: 'Test Note', content: 'Hello', tags: [], pinned: false, conversationId: null });

      const service = new NotesService();
      const note = await service.createNote('user1', {
        title: 'Test Note',
        content: 'Hello',
      });

      expect(note.title).toBe('Test Note');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Test Note', content: 'Hello' }),
        })
      );
    });

    it('should create note with tags', async () => {
      mockCreate.mockResolvedValueOnce({ id: 'note-2', tags: ['idea', 'important'] });

      const service = new NotesService();
      await service.createNote('user1', {
        title: 'Tagged Note',
        content: 'Content',
        tags: ['idea', 'important'],
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tags: ['idea', 'important'] }),
        })
      );
    });

    it('should trim note title', async () => {
      const service = new NotesService();
      await service.createNote('user1', {
        title: '  spaced title  ',
        content: 'content',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'spaced title' }),
        })
      );
    });

    it('should list notes with default limit', async () => {
      mockFindMany.mockResolvedValueOnce([]);
      mockCount.mockResolvedValueOnce(0);

      const service = new NotesService();
      const result = await service.listNotes('user1');

      expect(result.total).toBe(0);
      expect(result.notes).toEqual([]);
    });

    it('should list notes filtered by tag', async () => {
      mockFindMany.mockResolvedValueOnce([]);
      mockCount.mockResolvedValueOnce(0);

      const service = new NotesService();
      await service.listNotes('user1', { tag: 'idea' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tags: { has: 'idea' } }),
        })
      );
    });

    it('should search notes by content', async () => {
      mockFindMany.mockResolvedValueOnce([]);

      const service = new NotesService();
      const result = await service.searchNotes('user1', 'test query');

      expect(result.query).toBe('test query');
    });

    it('should return empty for empty search', async () => {
      const service = new NotesService();
      const result = await service.searchNotes('user1', '  ');

      expect(result.notes).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should delete note after ownership check', async () => {
      mockFindFirst.mockResolvedValueOnce({ id: 'note-1', userId: 'user1' });
      mockDelete.mockResolvedValueOnce({ id: 'note-1' });

      const service = new NotesService();
      const deleted = await service.deleteNote('user1', 'note-1');

      expect(deleted).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'note-1' } });
    });

    it('should refuse to delete unowned note', async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      const service = new NotesService();
      const deleted = await service.deleteNote('user1', 'other-note');

      expect(deleted).toBe(false);
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  // ─── Code Review ────────────────────────────────────────────────────────

  describe('Code Review', () => {
    it('should detect fenced code blocks', () => {
      const service = new CodeReviewService();
      const message = 'Here is my code:\n```javascript\nconsole.log("hello");\n```';

      const snippets = service.detectCode(message);
      expect(snippets).toHaveLength(1);
      expect(snippets[0].language).toBe('javascript');
      expect(snippets[0].code).toContain('console.log');
    });

    it('should detect multiple code blocks', () => {
      const service = new CodeReviewService();
      const message = '```js\ncode1\n```\nSome text\n```python\nprint("hi")\n```';

      const snippets = service.detectCode(message);
      expect(snippets).toHaveLength(2);
      expect(snippets[0].language).toBe('js');
      expect(snippets[1].language).toBe('python');
    });

    it('should detect inline code blocks of 50+ chars', () => {
      const service = new CodeReviewService();
      const longCode = 'a'.repeat(60);
      const message = `Check this: \`${longCode}\``;

      const snippets = service.detectCode(message);
      expect(snippets).toHaveLength(1);
    });

    it('should return empty for no code', () => {
      const service = new CodeReviewService();
      const snippets = service.detectCode('Just a regular message with no code');
      expect(snippets).toHaveLength(0);
    });

    it('should detect eval() in static analysis', async () => {
      const service = new CodeReviewService();
      const result = await (service as any).staticAnalysis({ language: 'javascript', code: 'eval("alert(1)")' });

      // Access private method via any cast for testing
      const findings = result.findings;
      const evalFinding = findings.find((f: any) => f.message.includes('eval()'));
      expect(evalFinding).toBeDefined();
      expect(evalFinding?.severity).toBe('critical');
    });

    it('should detect hardcoded secrets', async () => {
      const service = new CodeReviewService();
      const result = await (service as any).staticAnalysis({
        language: 'javascript',
        code: 'const api_key = "sk-abc123"',
      });

      const secretFinding = result.findings.find((f: any) => f.type === 'security');
      expect(secretFinding).toBeDefined();
    });

    it('should detect var usage', async () => {
      const service = new CodeReviewService();
      const result = await (service as any).staticAnalysis({
        language: 'javascript',
        code: 'var x = 5;',
      });

      const varFinding = result.findings.find((f: any) => f.message.includes('var'));
      expect(varFinding).toBeDefined();
    });

    it('should format review results', () => {
      const service = new CodeReviewService();
      const formatted = service.formatReviewResult({
        findings: [
          { type: 'security', severity: 'critical', message: 'eval() detected', suggestion: 'Remove eval' },
          { type: 'style', severity: 'info', message: 'Use const' },
        ],
        overallScore: 70,
        summary: 'Found 2 issues',
        language: 'javascript',
      });

      expect(formatted).toContain('70/100');
      expect(formatted).toContain('eval() detected');
      expect(formatted).toContain('Remove eval');
    });
  });

  // ─── Mood Tracker ───────────────────────────────────────────────────────

  describe('Mood Tracker', () => {
    it('should log mood entry', async () => {
      mockCreate.mockResolvedValueOnce({ id: 'mood-1', mood: 'happy', intensity: 0.8, source: 'checkin' });

      const service = new MoodTrackerService();
      const entry = await service.logMood('user1', 'happy', 0.8);

      expect(entry.mood).toBe('happy');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should normalize mood aliases', async () => {
      mockCreate.mockResolvedValueOnce({ id: 'mood-2', mood: 'excited' });

      const service = new MoodTrackerService();
      await service.logMood('user1', 'great', 0.9);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mood: 'excited' }),
        })
      );
    });

    it('should clamp intensity to 0-1', async () => {
      mockCreate.mockResolvedValueOnce({ id: 'mood-3' });

      const service = new MoodTrackerService();
      await service.logMood('user1', 'happy', 5.0);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ intensity: 1 }),
        })
      );
    });

    it('should return null for trend with insufficient data', async () => {
      mockFindMany.mockResolvedValueOnce([]);

      const service = new MoodTrackerService();
      const trend = await service.analyzeTrend('user1', 30);
      expect(trend).toBeNull();
    });

    it('should return null summary when no entries exist', async () => {
      mockCount.mockResolvedValueOnce(0);

      const service = new MoodTrackerService();
      const summary = await service.getSummary('user1');
      expect(summary).toBeNull();
    });
  });

  // ─── Project Planner ────────────────────────────────────────────────────

  describe('Project Planner', () => {
    it('should create a project', async () => {
      mockCreate.mockResolvedValueOnce({ id: 'proj-1', name: 'Build App', tasks: [] });

      const service = new ProjectPlannerService();
      const project = await service.createProject('user1', {
        name: 'Build App',
        description: 'My new app',
        goal: 'Launch v1',
      });

      expect(project.name).toBe('Build App');
    });

    it('should create task in owned project', async () => {
      mockFindFirst.mockResolvedValueOnce({ id: 'proj-1', userId: 'user1' });
      mockCreate.mockResolvedValueOnce({ id: 'task-1', title: 'Setup DB' });

      const service = new ProjectPlannerService();
      const task = await service.createTask('user1', {
        projectId: 'proj-1',
        title: 'Setup DB',
        priority: 'high',
      });

      expect(task).toBeDefined();
    });

    it('should refuse task creation for unowned project', async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      const service = new ProjectPlannerService();
      const task = await service.createTask('user1', {
        projectId: 'other-proj',
        title: 'Hax',
        priority: 'high',
      });

      expect(task).toBeNull();
    });

    it('should delete project and its tasks', async () => {
      mockFindMany.mockResolvedValueOnce([]);
      mockFindFirst.mockResolvedValueOnce({ id: 'proj-1', userId: 'user1', tasks: [] });

      const service = new ProjectPlannerService();
      const deleted = await service.deleteProject('user1', 'proj-1');

      expect(deleted).toBe(true);
      expect(mockDeleteMany).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  // ─── Language Tutor ─────────────────────────────────────────────────────

  describe('Language Tutor', () => {
    it('should start a session', async () => {
      mockCreate.mockResolvedValueOnce({ id: 'sess-1', language: 'spanish', level: 'beginner' });

      const service = new LanguageTutorService();
      const session = await service.startSession('user1', 'spanish');

      expect(session.language).toBe('spanish');
    });

    it('should normalize language codes', async () => {
      mockFindMany.mockResolvedValueOnce([]);
      mockCreate.mockResolvedValueOnce({ id: 'sess-2', language: 'french' });

      const service = new LanguageTutorService();
      await service.startSession('user1', 'fr');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ language: 'french' }),
        })
      );
    });

    it('should evaluate correct answer', async () => {
      const service = new LanguageTutorService();
      const result = await service.evaluateAnswer(
        'spanish',
        { type: 'translation', prompt: 'Hello', correctAnswer: 'Hola', difficulty: 3 },
        'hola',
      );

      expect(result.correct).toBe(true);
      expect(result.scoreDelta).toBeGreaterThan(0);
    });

    it('should evaluate incorrect answer', async () => {
      const service = new LanguageTutorService();
      const result = await service.evaluateAnswer(
        'spanish',
        { type: 'translation', prompt: 'Hello', correctAnswer: 'Hola', difficulty: 3 },
        'bonjour',
      );

      expect(result.correct).toBe(false);
      expect(result.feedback).toContain('Hola');
    });

    it('should handle empty answer', async () => {
      const service = new LanguageTutorService();
      const result = await service.evaluateAnswer(
        'spanish',
        { type: 'translation', prompt: 'Hello', correctAnswer: 'Hola', difficulty: 3 },
        '  ',
      );

      expect(result.correct).toBe(false);
      expect(result.scoreDelta).toBe(0);
    });

    it('should accept close match (minor typo)', async () => {
      const service = new LanguageTutorService();
      const result = await service.evaluateAnswer(
        'spanish',
        { type: 'translation', prompt: 'Good morning', correctAnswer: 'Buenos dias', difficulty: 3 },
        'buenos dia',
      );

      expect(result.correct).toBe(true);
    });

    it('should return empty progress when no sessions', async () => {
      mockFindMany.mockResolvedValueOnce([]);

      const service = new LanguageTutorService();
      const progress = await service.getProgressSummary('user1');

      expect(progress).toEqual([]);
    });
  });
});
