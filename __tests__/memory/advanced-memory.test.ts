/**
 * Advanced Memory Architecture — Tests for four-layer memory system
 *
 * Covers:
 * - Layer 1: Episodic Memory (creation, importance, consolidation, retrieval)
 * - Layer 2: Working Memory (session, context window, topics, scratchpad)
 * - Layer 3: Procedural Memory (skills, execution tracking, relevance search)
 * - Layer 4: Meta Memory (knowledge domains, confidence, self-awareness)
 */

import {
  // Episodic
  createEpisodicMemory,
  calculateMemoryImportance,
  consolidateMemories,
  retrieveEpisodicMemories,
  type EpisodicMemory,
  // Working
  createWorkingMemory,
  addToContextWindow,
  updateWorkingTopics,
  setScratchpad,
  getScratchpad,
  // Procedural
  createProceduralMemory,
  recordProceduralExecution,
  findRelevantProcedures,
  type ProceduralMemory,
  // Meta
  createMetaMemory,
  confidenceToLevel,
  assessKnowledgeGaps,
  generateSelfAwarenessReport,
  updateMetaConfidence,
  type MetaMemory,
} from '@/lib/memory/advanced-memory';

// ─── Layer 1: Episodic Memory ────────────────────────────────────────────────

describe('Layer 1: Episodic Memory', () => {
  describe('createEpisodicMemory', () => {
    it('should create a memory with required fields', () => {
      const mem = createEpisodicMemory('user1', 'Had a great conversation', 'Chat about AI', 0.8);
      expect(mem.userId).toBe('user1');
      expect(mem.event).toBe('Had a great conversation');
      expect(mem.context).toBe('Chat about AI');
      expect(mem.emotionalWeight).toBe(0.8);
    });

    it('should generate a unique ID starting with ep_', () => {
      const mem = createEpisodicMemory('user1', 'test', 'ctx', 0.5);
      expect(mem.id).toMatch(/^ep_\d+_[a-z0-9]+$/);
    });

    it('should set timestamp to current time', () => {
      const before = Date.now();
      const mem = createEpisodicMemory('user1', 'test', 'ctx', 0.5);
      const after = Date.now();
      expect(mem.timestamp).toBeGreaterThanOrEqual(before);
      expect(mem.timestamp).toBeLessThanOrEqual(after);
    });

    it('should default optional fields', () => {
      const mem = createEpisodicMemory('user1', 'test', 'ctx', 0.5);
      expect(mem.topics).toEqual([]);
      expect(mem.participants).toEqual([]);
      expect(mem.outcome).toBe('');
      expect(mem.retrievalCount).toBe(0);
      expect(mem.lastRetrievedAt).toBeNull();
      expect(mem.consolidationLevel).toBe('fragile');
      expect(mem.location).toBe('chat');
    });

    it('should accept optional fields', () => {
      const mem = createEpisodicMemory(
        'user1', 'event', 'ctx', 0.5,
        ['ai', 'music'], ['Holly', 'User'], 'Learned something',
      );
      expect(mem.topics).toEqual(['ai', 'music']);
      expect(mem.participants).toEqual(['Holly', 'User']);
      expect(mem.outcome).toBe('Learned something');
    });

    it('should clamp emotional weight to 0-1 range', () => {
      const high = createEpisodicMemory('u', 'e', 'c', 5.0);
      const low = createEpisodicMemory('u', 'e', 'c', -2.0);
      expect(high.emotionalWeight).toBe(1);
      expect(low.emotionalWeight).toBe(0);
    });
  });

  describe('calculateMemoryImportance', () => {
    it('should return a number between 0 and 1', () => {
      const mem = createEpisodicMemory('u', 'e', 'c', 0.5);
      const importance = calculateMemoryImportance(mem);
      expect(importance).toBeGreaterThanOrEqual(0);
      expect(importance).toBeLessThanOrEqual(1);
    });

    it('should give higher importance to emotionally weighted memories', () => {
      const low = createEpisodicMemory('u', 'e', 'c', 0.1);
      const high = createEpisodicMemory('u', 'e', 'c', 0.9);
      expect(calculateMemoryImportance(high)).toBeGreaterThan(calculateMemoryImportance(low));
    });

    it('should give higher importance to frequently retrieved memories', () => {
      const low = createEpisodicMemory('u', 'e', 'c', 0.5);
      const high = createEpisodicMemory('u', 'e', 'c', 0.5);
      high.retrievalCount = 10;
      expect(calculateMemoryImportance(high)).toBeGreaterThan(calculateMemoryImportance(low));
    });

    it('should give higher importance to permanent memories', () => {
      const fragile = createEpisodicMemory('u', 'e', 'c', 0.5);
      const permanent = createEpisodicMemory('u', 'e', 'c', 0.5);
      permanent.consolidationLevel = 'permanent';
      expect(calculateMemoryImportance(permanent)).toBeGreaterThan(calculateMemoryImportance(fragile));
    });

    it('should give higher importance to memories with more topics', () => {
      const few = createEpisodicMemory('u', 'e', 'c', 0.5, ['ai']);
      const many = createEpisodicMemory('u', 'e', 'c', 0.5, ['ai', 'code', 'music', 'art', 'philosophy']);
      expect(calculateMemoryImportance(many)).toBeGreaterThanOrEqual(calculateMemoryImportance(few));
    });
  });

  describe('consolidateMemories', () => {
    it('should promote fragile to stable when retrievalCount >= 2', () => {
      const mem = createEpisodicMemory('u', 'e', 'c', 0.5);
      mem.retrievalCount = 2;
      const result = consolidateMemories([mem]);
      expect(result.stabilized).toBe(1);
      expect(mem.consolidationLevel).toBe('stable');
    });

    it('should promote fragile to stable when emotionalWeight >= 0.7', () => {
      const mem = createEpisodicMemory('u', 'e', 'c', 0.8);
      const result = consolidateMemories([mem]);
      expect(result.stabilized).toBe(1);
      expect(mem.consolidationLevel).toBe('stable');
    });

    it('should keep fragile memories that do not meet promotion criteria', () => {
      const mem = createEpisodicMemory('u', 'e', 'c', 0.3);
      mem.retrievalCount = 0;
      const result = consolidateMemories([mem]);
      expect(result.fragile).toBe(1);
      expect(mem.consolidationLevel).toBe('fragile');
    });

    it('should promote stable to permanent when retrievalCount >= 5', () => {
      const mem = createEpisodicMemory('u', 'e', 'c', 0.5);
      mem.consolidationLevel = 'stable';
      mem.retrievalCount = 5;
      const result = consolidateMemories([mem]);
      expect(result.permanent).toBe(1);
      expect(mem.consolidationLevel).toBe('permanent');
    });

    it('should promote stable to permanent when emotionalWeight >= 0.9', () => {
      const mem = createEpisodicMemory('u', 'e', 'c', 0.95);
      mem.consolidationLevel = 'stable';
      mem.retrievalCount = 0;
      const result = consolidateMemories([mem]);
      expect(result.permanent).toBe(1);
      expect(mem.consolidationLevel).toBe('permanent');
    });

    it('should keep stable memories that do not meet permanent criteria', () => {
      const mem = createEpisodicMemory('u', 'e', 'c', 0.5);
      mem.consolidationLevel = 'stable';
      mem.retrievalCount = 1;
      const result = consolidateMemories([mem]);
      expect(result.stabilized).toBe(1);
    });

    it('should count permanent memories as permanent', () => {
      const mem = createEpisodicMemory('u', 'e', 'c', 0.9);
      mem.consolidationLevel = 'permanent';
      const result = consolidateMemories([mem]);
      expect(result.permanent).toBe(1);
    });

    it('should prune low-importance fragile memories', () => {
      const mem = createEpisodicMemory('u', 'e', 'c', 0);
      mem.retrievalCount = 0;
      // Make it very old to reduce importance
      mem.timestamp = Date.now() - 1000 * 60 * 60 * 24 * 60; // 60 days ago
      const result = consolidateMemories([mem], 0.3);
      expect(result.pruned).toBe(1);
    });

    it('should NOT prune stable or permanent memories even with low importance', () => {
      const stable = createEpisodicMemory('u', 'e', 'c', 0);
      stable.consolidationLevel = 'stable';
      stable.timestamp = Date.now() - 1000 * 60 * 60 * 24 * 60;
      const result = consolidateMemories([stable], 0.9);
      // stable should be counted, not pruned
      expect(result.pruned).toBe(0);
      expect(result.stabilized).toBe(1);
    });

    it('should handle empty array', () => {
      const result = consolidateMemories([]);
      expect(result).toEqual({ fragile: 0, stabilized: 0, permanent: 0, pruned: 0 });
    });

    it('should handle a mix of all consolidation levels', () => {
      const fragile = createEpisodicMemory('u', 'e', 'c', 0.5);
      const stable = createEpisodicMemory('u', 'e', 'c', 0.5);
      stable.consolidationLevel = 'stable';
      stable.retrievalCount = 1;
      const permanent = createEpisodicMemory('u', 'e', 'c', 0.9);
      permanent.consolidationLevel = 'permanent';
      const result = consolidateMemories([fragile, stable, permanent]);
      expect(result.fragile + result.stabilized + result.permanent + result.pruned).toBe(3);
    });
  });

  describe('retrieveEpisodicMemories', () => {
    function makeMemory(event: string, topics: string[], weight: number, level: EpisodicMemory['consolidationLevel'] = 'fragile'): EpisodicMemory {
      const mem = createEpisodicMemory('u', event, 'context about ' + event, weight, topics);
      mem.consolidationLevel = level;
      return mem;
    }

    it('should return memories sorted by relevance score', () => {
      const irrelevant = makeMemory('weather chat', ['weather'], 0.1);
      const relevant = makeMemory('AI discussion', ['ai', 'ml'], 0.5);
      const results = retrieveEpisodicMemories([irrelevant, relevant], 'AI machine learning', ['ai', 'ml']);
      expect(results[0].event).toBe('AI discussion');
    });

    it('should respect maxResults parameter', () => {
      const memories = Array.from({ length: 10 }, (_, i) =>
        makeMemory(`event ${i}`, [`topic${i}`], 0.5),
      );
      const results = retrieveEpisodicMemories(memories, 'event', [], 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should increment retrievalCount for returned memories', () => {
      const mem = makeMemory('test event', ['test'], 0.5);
      expect(mem.retrievalCount).toBe(0);
      retrieveEpisodicMemories([mem], 'test');
      expect(mem.retrievalCount).toBe(1);
    });

    it('should set lastRetrievedAt for returned memories', () => {
      const mem = makeMemory('test event', ['test'], 0.5);
      expect(mem.lastRetrievedAt).toBeNull();
      retrieveEpisodicMemories([mem], 'test');
      expect(mem.lastRetrievedAt).not.toBeNull();
    });

    it('should use topic overlap for scoring', () => {
      const noOverlap = makeMemory('event', ['sports'], 0.5);
      const withOverlap = makeMemory('event', ['coding', 'typescript'], 0.5);
      const results = retrieveEpisodicMemories(
        [noOverlap, withOverlap],
        'programming',
        ['coding', 'typescript'],
      );
      expect(results[0].topics).toContain('coding');
    });

    it('should prefer permanent memories via consolidation bonus', () => {
      const fragile = makeMemory('same event', ['test'], 0.5, 'fragile');
      const permanent = makeMemory('same event', ['test'], 0.5, 'permanent');
      const results = retrieveEpisodicMemories([fragile, permanent], 'same event', ['test']);
      expect(results[0].consolidationLevel).toBe('permanent');
    });

    it('should return empty array for empty input', () => {
      const results = retrieveEpisodicMemories([], 'query');
      expect(results).toEqual([]);
    });
  });
});

// ─── Layer 2: Working Memory ─────────────────────────────────────────────────

describe('Layer 2: Working Memory', () => {
  describe('createWorkingMemory', () => {
    it('should create a working memory session', () => {
      const wm = createWorkingMemory('sess1', 'user1');
      expect(wm.sessionId).toBe('sess1');
      expect(wm.userId).toBe('user1');
    });

    it('should initialize with empty collections', () => {
      const wm = createWorkingMemory('s', 'u');
      expect(wm.activeTopics).toEqual([]);
      expect(wm.currentUserEmotion).toBeNull();
      expect(wm.pendingQuestions).toEqual([]);
      expect(wm.activeGoals).toEqual([]);
      expect(wm.scratchpad.size).toBe(0);
      expect(wm.contextWindow).toEqual([]);
    });

    it('should set lastUpdated to current time', () => {
      const before = Date.now();
      const wm = createWorkingMemory('s', 'u');
      expect(wm.lastUpdated).toBeGreaterThanOrEqual(before);
    });
  });

  describe('addToContextWindow', () => {
    it('should add entries to context window', () => {
      const wm = createWorkingMemory('s', 'u');
      addToContextWindow(wm, 'user', 'Hello', 0.5);
      expect(wm.contextWindow.length).toBe(1);
      expect(wm.contextWindow[0].content).toBe('Hello');
      expect(wm.contextWindow[0].role).toBe('user');
    });

    it('should clamp importance to 0-1', () => {
      const wm = createWorkingMemory('s', 'u');
      addToContextWindow(wm, 'user', 'test', 5.0);
      expect(wm.contextWindow[0].importance).toBe(1);
    });

    it('should trim to maxWindowSize keeping most important', () => {
      const wm = createWorkingMemory('s', 'u');
      // Add 15 entries with varying importance
      for (let i = 0; i < 15; i++) {
        addToContextWindow(wm, 'user', `msg${i}`, i / 15, 10);
      }
      expect(wm.contextWindow.length).toBe(10);
      // The least important (importance 0) should be trimmed
      const importances = wm.contextWindow.map(e => e.importance);
      expect(Math.min(...importances)).toBeGreaterThan(0);
    });

    it('should update lastUpdated timestamp', () => {
      const wm = createWorkingMemory('s', 'u');
      const before = wm.lastUpdated;
      // small delay to ensure timestamp changes
      addToContextWindow(wm, 'user', 'test', 0.5);
      expect(wm.lastUpdated).toBeGreaterThanOrEqual(before);
    });

    it('should preserve chronological order after trim', () => {
      const wm = createWorkingMemory('s', 'u');
      for (let i = 0; i < 12; i++) {
        addToContextWindow(wm, 'user', `msg${i}`, 0.5, 10);
      }
      const timestamps = wm.contextWindow.map(e => e.timestamp);
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });
  });

  describe('updateWorkingTopics', () => {
    it('should add new topics', () => {
      const wm = createWorkingMemory('s', 'u');
      updateWorkingTopics(wm, ['ai', 'music']);
      expect(wm.activeTopics).toContain('ai');
      expect(wm.activeTopics).toContain('music');
    });

    it('should not add duplicate topics', () => {
      const wm = createWorkingMemory('s', 'u');
      updateWorkingTopics(wm, ['ai']);
      updateWorkingTopics(wm, ['ai', 'music']);
      expect(wm.activeTopics.filter(t => t === 'ai').length).toBe(1);
    });

    it('should cap at 10 topics keeping most recent', () => {
      const wm = createWorkingMemory('s', 'u');
      for (let i = 0; i < 15; i++) {
        updateWorkingTopics(wm, [`topic${i}`]);
      }
      expect(wm.activeTopics.length).toBe(10);
      // Should keep the last 10
      expect(wm.activeTopics).toContain('topic14');
    });

    it('should update lastUpdated', () => {
      const wm = createWorkingMemory('s', 'u');
      const before = wm.lastUpdated;
      updateWorkingTopics(wm, ['test']);
      expect(wm.lastUpdated).toBeGreaterThanOrEqual(before);
    });
  });

  describe('scratchpad', () => {
    it('should set and get scratchpad values', () => {
      const wm = createWorkingMemory('s', 'u');
      setScratchpad(wm, 'key1', 'value1');
      expect(getScratchpad(wm, 'key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      const wm = createWorkingMemory('s', 'u');
      expect(getScratchpad(wm, 'nonexistent')).toBeUndefined();
    });

    it('should overwrite existing keys', () => {
      const wm = createWorkingMemory('s', 'u');
      setScratchpad(wm, 'key', 'v1');
      setScratchpad(wm, 'key', 'v2');
      expect(getScratchpad(wm, 'key')).toBe('v2');
    });

    it('should update lastUpdated on set', () => {
      const wm = createWorkingMemory('s', 'u');
      const before = wm.lastUpdated;
      setScratchpad(wm, 'k', 'v');
      expect(wm.lastUpdated).toBeGreaterThanOrEqual(before);
    });
  });
});

// ─── Layer 3: Procedural Memory ──────────────────────────────────────────────

describe('Layer 3: Procedural Memory', () => {
  describe('createProceduralMemory', () => {
    it('should create a procedural memory with required fields', () => {
      const proc = createProceduralMemory('code-review', 'coding', ['read code', 'analyze'], ['review', 'code']);
      expect(proc.skillName).toBe('code-review');
      expect(proc.category).toBe('coding');
      expect(proc.steps).toEqual(['read code', 'analyze']);
      expect(proc.triggers).toEqual(['review', 'code']);
    });

    it('should generate ID starting with proc_', () => {
      const proc = createProceduralMemory('test', 'analysis', [], []);
      expect(proc.id).toMatch(/^proc_\d+_[a-z0-9]+$/);
    });

    it('should default to neutral success rate', () => {
      const proc = createProceduralMemory('test', 'coding', [], []);
      expect(proc.successRate).toBe(0.5);
    });

    it('should start with zero execution count', () => {
      const proc = createProceduralMemory('test', 'coding', [], []);
      expect(proc.executionCount).toBe(0);
    });

    it('should accept learnedFrom parameter', () => {
      const proc = createProceduralMemory('test', 'coding', [], [], 'user-feedback');
      expect(proc.learnedFrom).toBe('user-feedback');
    });

    it('should default learnedFrom to experience', () => {
      const proc = createProceduralMemory('test', 'coding', [], []);
      expect(proc.learnedFrom).toBe('experience');
    });

    it('should start with empty adaptations', () => {
      const proc = createProceduralMemory('test', 'coding', [], []);
      expect(proc.adaptations).toEqual([]);
    });
  });

  describe('recordProceduralExecution', () => {
    it('should increment execution count', () => {
      const proc = createProceduralMemory('test', 'coding', [], []);
      recordProceduralExecution(proc, true);
      expect(proc.executionCount).toBe(1);
      recordProceduralExecution(proc, false);
      expect(proc.executionCount).toBe(2);
    });

    it('should update success rate with exponential moving average', () => {
      const proc = createProceduralMemory('test', 'coding', [], []);
      // Initial: 0.5, alpha=0.3, success=true → 0.5*0.7 + 1*0.3 = 0.65
      recordProceduralExecution(proc, true);
      expect(proc.successRate).toBeCloseTo(0.65, 5);
    });

    it('should decrease success rate on failure', () => {
      const proc = createProceduralMemory('test', 'coding', [], []);
      // Initial: 0.5, alpha=0.3, success=false → 0.5*0.7 + 0*0.3 = 0.35
      recordProceduralExecution(proc, false);
      expect(proc.successRate).toBeCloseTo(0.35, 5);
    });

    it('should converge toward 1 with repeated successes', () => {
      const proc = createProceduralMemory('test', 'coding', [], []);
      for (let i = 0; i < 20; i++) {
        recordProceduralExecution(proc, true);
      }
      expect(proc.successRate).toBeGreaterThan(0.95);
    });

    it('should converge toward 0 with repeated failures', () => {
      const proc = createProceduralMemory('test', 'coding', [], []);
      for (let i = 0; i < 20; i++) {
        recordProceduralExecution(proc, false);
      }
      expect(proc.successRate).toBeLessThan(0.05);
    });

    it('should update lastUsedAt timestamp', () => {
      const proc = createProceduralMemory('test', 'coding', [], []);
      const before = proc.lastUsedAt;
      recordProceduralExecution(proc, true);
      expect(proc.lastUsedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('findRelevantProcedures', () => {
    it('should find procedures matching triggers', () => {
      const proc = createProceduralMemory('debug', 'coding', ['reproduce', 'isolate'], ['debug', 'error', 'bug']);
      const results = findRelevantProcedures([proc], 'I have a bug in my code');
      expect(results).toHaveLength(1);
      expect(results[0].skillName).toBe('debug');
    });

    it('should find procedures matching skill name', () => {
      const proc = createProceduralMemory('code-review', 'coding', ['read'], ['review']);
      const results = findRelevantProcedures([proc], 'I need a code-review');
      expect(results).toHaveLength(1);
    });

    it('should filter out low-relevance results', () => {
      const proc = createProceduralMemory('cooking', 'creative', ['chop'], ['cook', 'recipe']);
      const results = findRelevantProcedures([proc], 'I want to fix my car');
      expect(results).toHaveLength(0);
    });

    it('should respect maxResults parameter', () => {
      const procedures = Array.from({ length: 10 }, (_, i) =>
        createProceduralMemory(`skill-${i}`, 'coding', [], ['code', 'help']),
      );
      const results = findRelevantProcedures(procedures, 'help me with code', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should sort by relevance score descending', () => {
      const lowMatch = createProceduralMemory('low', 'coding', [], ['code']);
      const highMatch = createProceduralMemory('high', 'coding', [], ['code', 'debug', 'error']);
      // Give high match more executions for reliability bonus
      for (let i = 0; i < 5; i++) recordProceduralExecution(highMatch, true);

      const results = findRelevantProcedures([lowMatch, highMatch], 'code debug error', 2);
      expect(results[0].skillName).toBe('high');
    });

    it('should return empty array for no procedures', () => {
      const results = findRelevantProcedures([], 'test');
      expect(results).toEqual([]);
    });

    it('should boost by success rate', () => {
      const lowRate = createProceduralMemory('low', 'coding', [], ['test']);
      const highRate = createProceduralMemory('high', 'coding', [], ['test']);
      for (let i = 0; i < 10; i++) recordProceduralExecution(highRate, true);
      for (let i = 0; i < 10; i++) recordProceduralExecution(lowRate, false);

      const results = findRelevantProcedures([lowRate, highRate], 'test this code');
      expect(results[0].skillName).toBe('high');
    });
  });
});

// ─── Layer 4: Meta Memory ────────────────────────────────────────────────────

describe('Layer 4: Meta Memory', () => {
  describe('createMetaMemory', () => {
    it('should create a meta memory entry', () => {
      const meta = createMetaMemory('typescript', 'advanced', 0.8, 'direct');
      expect(meta.domain).toBe('typescript');
      expect(meta.knowledgeLevel).toBe('advanced');
      expect(meta.confidence).toBe(0.8);
      expect(meta.source).toBe('direct');
    });

    it('should default to none knowledge level', () => {
      const meta = createMetaMemory('test');
      expect(meta.knowledgeLevel).toBe('none');
    });

    it('should default to 0 confidence', () => {
      const meta = createMetaMemory('test');
      expect(meta.confidence).toBe(0);
    });

    it('should default to inferred source', () => {
      const meta = createMetaMemory('test');
      expect(meta.source).toBe('inferred');
    });

    it('should clamp confidence to 0-1', () => {
      const high = createMetaMemory('test', 'expert', 2.0);
      const low = createMetaMemory('test', 'none', -1.0);
      expect(high.confidence).toBe(1);
      expect(low.confidence).toBe(0);
    });

    it('should set lastAssessedAt to current time', () => {
      const before = Date.now();
      const meta = createMetaMemory('test');
      expect(meta.lastAssessedAt).toBeGreaterThanOrEqual(before);
    });

    it('should start with empty gaps and strengths', () => {
      const meta = createMetaMemory('test');
      expect(meta.gaps).toEqual([]);
      expect(meta.strengths).toEqual([]);
    });
  });

  describe('confidenceToLevel', () => {
    it('should return expert for confidence >= 0.9', () => {
      expect(confidenceToLevel(0.9)).toBe('expert');
      expect(confidenceToLevel(1.0)).toBe('expert');
    });

    it('should return advanced for confidence >= 0.7', () => {
      expect(confidenceToLevel(0.7)).toBe('advanced');
      expect(confidenceToLevel(0.89)).toBe('advanced');
    });

    it('should return intermediate for confidence >= 0.5', () => {
      expect(confidenceToLevel(0.5)).toBe('intermediate');
      expect(confidenceToLevel(0.69)).toBe('intermediate');
    });

    it('should return basic for confidence >= 0.2', () => {
      expect(confidenceToLevel(0.2)).toBe('basic');
      expect(confidenceToLevel(0.49)).toBe('basic');
    });

    it('should return none for confidence < 0.2', () => {
      expect(confidenceToLevel(0)).toBe('none');
      expect(confidenceToLevel(0.19)).toBe('none');
    });
  });

  describe('assessKnowledgeGaps', () => {
    it('should return domains below confidence threshold', () => {
      const domains = [
        createMetaMemory('strong', 'expert', 0.9),
        createMetaMemory('weak', 'basic', 0.3),
        createMetaMemory('medium', 'intermediate', 0.5),
      ];
      const gaps = assessKnowledgeGaps(domains, 0.6);
      expect(gaps.map(g => g.domain)).toEqual(expect.arrayContaining(['weak', 'medium']));
      expect(gaps.map(g => g.domain)).not.toContain('strong');
    });

    it('should use default threshold of 0.5', () => {
      const domains = [
        createMetaMemory('above', 'intermediate', 0.6),
        createMetaMemory('below', 'basic', 0.3),
      ];
      const gaps = assessKnowledgeGaps(domains);
      expect(gaps).toHaveLength(1);
      expect(gaps[0].domain).toBe('below');
    });

    it('should return empty for all strong domains', () => {
      const domains = [
        createMetaMemory('a', 'expert', 0.9),
        createMetaMemory('b', 'advanced', 0.8),
      ];
      const gaps = assessKnowledgeGaps(domains, 0.5);
      expect(gaps).toHaveLength(0);
    });

    it('should return all for all weak domains', () => {
      const domains = [
        createMetaMemory('a', 'none', 0.1),
        createMetaMemory('b', 'basic', 0.2),
      ];
      const gaps = assessKnowledgeGaps(domains, 0.5);
      expect(gaps).toHaveLength(2);
    });
  });

  describe('generateSelfAwarenessReport', () => {
    it('should categorize domains by confidence', () => {
      const domains = [
        createMetaMemory('strong1', 'expert', 0.9),
        createMetaMemory('strong2', 'advanced', 0.8),
        createMetaMemory('weak1', 'basic', 0.4),
        createMetaMemory('unknown1', 'none', 0.1),
      ];
      const report = generateSelfAwarenessReport(domains);
      expect(report.strongDomains).toEqual(['strong1', 'strong2']);
      expect(report.weakDomains).toEqual(['weak1']);
      expect(report.unknownDomains).toEqual(['unknown1']);
    });

    it('should calculate overall confidence as average', () => {
      const domains = [
        createMetaMemory('a', 'expert', 0.8),
        createMetaMemory('b', 'basic', 0.4),
      ];
      const report = generateSelfAwarenessReport(domains);
      expect(report.overallConfidence).toBeCloseTo(0.6, 5);
    });

    it('should return 0 confidence for empty domains', () => {
      const report = generateSelfAwarenessReport([]);
      expect(report.overallConfidence).toBe(0);
      expect(report.strongDomains).toEqual([]);
      expect(report.weakDomains).toEqual([]);
      expect(report.unknownDomains).toEqual([]);
    });

    it('should classify boundary values correctly', () => {
      const domains = [
        createMetaMemory('exact_strong', 'advanced', 0.7),
        createMetaMemory('just_below', 'intermediate', 0.69),
        createMetaMemory('exact_weak_low', 'basic', 0.2),
        createMetaMemory('just_below_weak', 'none', 0.19),
      ];
      const report = generateSelfAwarenessReport(domains);
      expect(report.strongDomains).toContain('exact_strong');
      expect(report.weakDomains).toContain('just_below');
      expect(report.weakDomains).toContain('exact_weak_low');
      expect(report.unknownDomains).toContain('just_below_weak');
    });
  });

  describe('updateMetaConfidence', () => {
    it('should increase confidence with positive evidence', () => {
      const meta = createMetaMemory('test', 'basic', 0.5);
      const before = meta.confidence;
      updateMetaConfidence(meta, 0.8, true);
      expect(meta.confidence).toBeGreaterThan(before);
    });

    it('should decrease confidence with negative evidence', () => {
      const meta = createMetaMemory('test', 'basic', 0.5);
      const before = meta.confidence;
      updateMetaConfidence(meta, 0.8, false);
      expect(meta.confidence).toBeLessThan(before);
    });

    it('should update knowledge level after confidence change', () => {
      const meta = createMetaMemory('test', 'none', 0.1);
      updateMetaConfidence(meta, 0.9, true);
      // Confidence should have increased significantly
      expect(meta.knowledgeLevel).not.toBe('none');
    });

    it('should clamp confidence to 0-1', () => {
      const high = createMetaMemory('test', 'expert', 0.99);
      updateMetaConfidence(high, 0.9, true);
      expect(high.confidence).toBeLessThanOrEqual(1);

      const low = createMetaMemory('test', 'none', 0.01);
      updateMetaConfidence(low, 0.9, false);
      expect(low.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should update lastAssessedAt', () => {
      const meta = createMetaMemory('test', 'basic', 0.5);
      const before = meta.lastAssessedAt;
      updateMetaConfidence(meta, 0.5, true);
      expect(meta.lastAssessedAt).toBeGreaterThanOrEqual(before);
    });

    it('should handle Bayesian update formula correctly', () => {
      // prior=0.5, evidence=0.8, positive=true
      // likelihood = 0.8
      // posterior = (0.5 * 0.8) / ((0.5 * 0.8) + (0.5 * 0.2))
      //           = 0.4 / (0.4 + 0.1) = 0.4 / 0.5 = 0.8
      const meta = createMetaMemory('test', 'basic', 0.5);
      updateMetaConfidence(meta, 0.8, true);
      expect(meta.confidence).toBeCloseTo(0.8, 5);
    });

    it('should handle negative evidence Bayesian update', () => {
      // prior=0.5, evidence=0.8, positive=false
      // likelihood = 1 - 0.8 = 0.2
      // posterior = (0.5 * 0.2) / ((0.5 * 0.2) + (0.5 * 0.8))
      //           = 0.1 / (0.1 + 0.4) = 0.1 / 0.5 = 0.2
      const meta = createMetaMemory('test', 'basic', 0.5);
      updateMetaConfidence(meta, 0.8, false);
      expect(meta.confidence).toBeCloseTo(0.2, 5);
    });
  });
});

// ─── Cross-Layer Integration ─────────────────────────────────────────────────

describe('Cross-Layer Integration', () => {
  it('should support full memory lifecycle', () => {
    // 1. Create episodic memory
    const episodic = createEpisodicMemory('user1', 'Discussed React patterns', 'Code review session', 0.7, ['react', 'patterns']);

    // 2. Create working memory for the session
    const working = createWorkingMemory('sess1', 'user1');
    addToContextWindow(working, 'user', 'Let us discuss React patterns', 0.6);
    addToContextWindow(working, 'holly', 'Great, I love React patterns!', 0.5);
    updateWorkingTopics(working, ['react', 'patterns']);
    setScratchpad(working, 'current_focus', 'React hooks');

    // 3. Create procedural memory from the interaction
    const procedural = createProceduralMemory('react-patterns', 'coding', ['identify pattern', 'suggest improvement'], ['react', 'pattern', 'hooks']);
    recordProceduralExecution(procedural, true);

    // 4. Create meta memory for knowledge domain
    const meta = createMetaMemory('react-patterns', 'intermediate', 0.5);
    updateMetaConfidence(meta, 0.8, true);

    // Verify all layers are populated
    expect(episodic.consolidationLevel).toBe('fragile');
    expect(working.activeTopics).toContain('react');
    expect(getScratchpad(working, 'current_focus')).toBe('React hooks');
    expect(procedural.successRate).toBeGreaterThan(0.5);
    expect(meta.confidence).toBeGreaterThan(0.5);
  });

  it('should support memory consolidation after repeated retrieval', () => {
    const mem = createEpisodicMemory('user1', 'Important lesson', 'Learned about testing', 0.6, ['testing']);

    // Simulate repeated retrieval
    for (let i = 0; i < 3; i++) {
      retrieveEpisodicMemories([mem], 'testing', ['testing']);
    }

    // Consolidate — should promote from fragile to stable
    const result = consolidateMemories([mem]);
    expect(result.stabilized).toBe(1);
    expect(mem.consolidationLevel).toBe('stable');
  });

  it('should support procedural memory relevance finding with meta awareness', () => {
    const proc = createProceduralMemory('debug-ts', 'coding', ['read error', 'check types'], ['debug', 'typescript', 'error']);
    for (let i = 0; i < 5; i++) recordProceduralExecution(proc, true);

    const meta = createMetaMemory('typescript-debugging', 'advanced', 0.8);
    updateMetaConfidence(meta, 0.9, true);

    const relevant = findRelevantProcedures([proc], 'debug typescript error');
    expect(relevant).toHaveLength(1);
    expect(relevant[0].skillName).toBe('debug-ts');
    expect(meta.knowledgeLevel).toBe('expert');
  });
});
