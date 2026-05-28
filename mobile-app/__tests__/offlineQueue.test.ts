/**
 * Offline Queue — Unit Tests
 *
 * Tests the offline message queue with mocked AsyncStorage and API.
 * Covers: add, flush, retry, backoff, clear, summary.
 */

// Mock AsyncStorage before any imports
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

// Mock API module
const mockSendChatMessage = jest.fn();
jest.mock('../services/api', () => ({
  sendChatMessage: (...args: any[]) => mockSendChatMessage(...args),
}));

import {
  addToQueue,
  getQueue,
  getPending,
  flush,
  removeFromQueue,
  clearProcessed,
  clearQueue,
  getQueueSummary,
  QueuedMessage,
} from '../services/offlineQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'holly-offline-queue';

beforeEach(() => {
  jest.clearAllMocks();
  // Clear mock storage
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  mockSendChatMessage.mockReset();
});

describe('Offline Queue', () => {
  describe('addToQueue', () => {
    it('should add a message to the queue', async () => {
      const entry = await addToQueue([
        { role: 'user', content: 'Hello Holly' },
      ]);

      expect(entry.id).toBeTruthy();
      expect(entry.status).toBe('pending');
      expect(entry.retryCount).toBe(0);
      expect(entry.messages).toHaveLength(1);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.any(String),
      );
    });

    it('should persist to AsyncStorage', async () => {
      await addToQueue([{ role: 'user', content: 'Test' }]);

      const saved = JSON.parse(mockStorage[STORAGE_KEY]);
      expect(saved).toHaveLength(1);
      expect(saved[0].messages[0].content).toBe('Test');
    });

    it('should append to existing queue', async () => {
      await addToQueue([{ role: 'user', content: 'First' }]);
      await addToQueue([{ role: 'user', content: 'Second' }]);

      const queue = await getQueue();
      expect(queue).toHaveLength(2);
    });

    it('should respect custom maxRetries', async () => {
      const entry = await addToQueue(
        [{ role: 'user', content: 'Test' }],
        5,
      );
      expect(entry.maxRetries).toBe(5);
    });
  });

  describe('getPending', () => {
    it('should return pending messages ready to send', async () => {
      await addToQueue([{ role: 'user', content: 'Ready' }]);

      const pending = await getPending();
      expect(pending).toHaveLength(1);
    });

    it('should exclude messages in backoff period', async () => {
      // Add a message and simulate a failed attempt
      await addToQueue([{ role: 'user', content: 'Backoff' }]);

      // Manually set lastAttemptAt to now (within backoff)
      const queue = JSON.parse(mockStorage[STORAGE_KEY]);
      queue[0].retryCount = 1;
      queue[0].lastAttemptAt = Date.now(); // Just attempted
      mockStorage[STORAGE_KEY] = JSON.stringify(queue);

      const pending = await getPending();
      expect(pending).toHaveLength(0);
    });

    it('should include messages past backoff period', async () => {
      await addToQueue([{ role: 'user', content: 'Past backoff' }]);

      const queue = JSON.parse(mockStorage[STORAGE_KEY]);
      queue[0].retryCount = 1;
      queue[0].lastAttemptAt = Date.now() - 10000; // 10s ago, backoff = 4s
      mockStorage[STORAGE_KEY] = JSON.stringify(queue);

      const pending = await getPending();
      expect(pending).toHaveLength(1);
    });

    it('should exclude non-pending messages', async () => {
      await addToQueue([{ role: 'user', content: 'Will be sent' }]);

      // Mark as sent
      const queue = JSON.parse(mockStorage[STORAGE_KEY]);
      queue[0].status = 'sent';
      mockStorage[STORAGE_KEY] = JSON.stringify(queue);

      const pending = await getPending();
      expect(pending).toHaveLength(0);
    });
  });

  describe('flush', () => {
    it('should send pending messages', async () => {
      mockSendChatMessage.mockResolvedValueOnce({
        id: 'resp_1',
        choices: [{ message: { role: 'assistant', content: 'Hi!' }, finish_reason: 'stop' }],
      });

      await addToQueue([{ role: 'user', content: 'Hello' }]);

      const result = await flush();
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(0);
    });

    it('should mark failed after max retries', async () => {
      mockSendChatMessage.mockRejectedValue(new Error('Network error'));

      // Set maxRetries to 1 for quick test
      const entry = await addToQueue([{ role: 'user', content: 'Will fail' }], 1);

      // First attempt: retryCount goes to 1 = maxRetries, so it fails
      const result = await flush();
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);

      // Queue should show the message as failed
      const queue = await getQueue();
      expect(queue[0].status).toBe('failed');
      expect(queue[0].error).toBe('Network error');
    });

    it('should retry on transient failure', async () => {
      mockSendChatMessage
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          id: 'resp_1',
          choices: [{ message: { role: 'assistant', content: 'Hi!' }, finish_reason: 'stop' }],
        });

      await addToQueue([{ role: 'user', content: 'Retry me' }], 3);

      // First flush: fails, retryCount = 1, stays pending
      const result1 = await flush();
      expect(result1.sent).toBe(0);
      expect(result1.failed).toBe(0); // Not failed yet, will retry

      // Simulate backoff passing
      const queue = JSON.parse(mockStorage[STORAGE_KEY]);
      queue[0].lastAttemptAt = 0; // Force backoff to have passed
      mockStorage[STORAGE_KEY] = JSON.stringify(queue);

      // Second flush: succeeds
      const result2 = await flush();
      expect(result2.sent).toBe(1);
    });

    it('should store response on success', async () => {
      const mockResponse = {
        id: 'resp_1',
        choices: [{ message: { role: 'assistant', content: 'Hey!' }, finish_reason: 'stop' }],
      };
      mockSendChatMessage.mockResolvedValueOnce(mockResponse);

      await addToQueue([{ role: 'user', content: 'Hi' }]);
      await flush();

      const queue = await getQueue();
      expect(queue[0].status).toBe('sent');
      expect(queue[0].response).toEqual(mockResponse);
    });

    it('should prevent concurrent flushes', async () => {
      // Add a message and mark it as 'sending' manually
      await addToQueue([{ role: 'user', content: 'Concurrent' }]);

      const queue = JSON.parse(mockStorage[STORAGE_KEY]);
      queue[0].status = 'sending';
      mockStorage[STORAGE_KEY] = JSON.stringify(queue);

      const result = await flush();
      expect(result.sent).toBe(0);
      expect(result.remaining).toBe(0);
    });

    it('should send multiple messages in order', async () => {
      mockSendChatMessage
        .mockResolvedValueOnce({ id: 'r1', choices: [] })
        .mockResolvedValueOnce({ id: 'r2', choices: [] });

      await addToQueue([{ role: 'user', content: 'First' }]);
      await addToQueue([{ role: 'user', content: 'Second' }]);

      const result = await flush();
      expect(result.sent).toBe(2);

      // Verify order
      expect(mockSendChatMessage.mock.calls[0][0][0].content).toBe('First');
      expect(mockSendChatMessage.mock.calls[1][0][0].content).toBe('Second');
    });
  });

  describe('removeFromQueue', () => {
    it('should remove a specific message', async () => {
      const entry = await addToQueue([{ role: 'user', content: 'Remove me' }]);
      const removed = await removeFromQueue(entry.id);

      expect(removed).toBe(true);

      const queue = await getQueue();
      expect(queue).toHaveLength(0);
    });

    it('should return false for non-existent ID', async () => {
      const removed = await removeFromQueue('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('clearProcessed', () => {
    it('should remove sent and failed messages', async () => {
      await addToQueue([{ role: 'user', content: 'Will be sent' }]);
      await addToQueue([{ role: 'user', content: 'Will fail' }]);
      await addToQueue([{ role: 'user', content: 'Still pending' }]);

      // Manually set statuses
      const queue = JSON.parse(mockStorage[STORAGE_KEY]);
      queue[0].status = 'sent';
      queue[1].status = 'failed';
      // queue[2] stays pending
      mockStorage[STORAGE_KEY] = JSON.stringify(queue);

      const removed = await clearProcessed();
      expect(removed).toBe(2);

      const remaining = await getQueue();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].messages[0].content).toBe('Still pending');
    });
  });

  describe('clearQueue', () => {
    it('should remove all messages', async () => {
      await addToQueue([{ role: 'user', content: '1' }]);
      await addToQueue([{ role: 'user', content: '2' }]);

      await clearQueue();

      const queue = await getQueue();
      expect(queue).toHaveLength(0);
    });
  });

  describe('getQueueSummary', () => {
    it('should return correct counts', async () => {
      await addToQueue([{ role: 'user', content: 'Pending' }]);
      await addToQueue([{ role: 'user', content: 'Sent' }]);
      await addToQueue([{ role: 'user', content: 'Failed' }]);

      // Manually set statuses
      const queue = JSON.parse(mockStorage[STORAGE_KEY]);
      queue[1].status = 'sent';
      queue[2].status = 'failed';
      mockStorage[STORAGE_KEY] = JSON.stringify(queue);

      const summary = await getQueueSummary();
      expect(summary.total).toBe(3);
      expect(summary.pending).toBe(1);
      expect(summary.sent).toBe(1);
      expect(summary.failed).toBe(1);
    });

    it('should return zeros for empty queue', async () => {
      const summary = await getQueueSummary();
      expect(summary.total).toBe(0);
      expect(summary.pending).toBe(0);
    });
  });

  describe('persistence', () => {
    it('should survive simulated app restart', async () => {
      await addToQueue([{ role: 'user', content: 'Survive restart' }]);

      // Queue is persisted in mockStorage
      // Simulate re-read (getQueue reads from storage)
      const queue = await getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].messages[0].content).toBe('Survive restart');
    });

    it('should handle corrupted storage gracefully', async () => {
      mockStorage[STORAGE_KEY] = 'not valid json';

      const queue = await getQueue();
      expect(queue).toEqual([]);
    });

    it('should handle non-array storage gracefully', async () => {
      mockStorage[STORAGE_KEY] = JSON.stringify({ not: 'an array' });

      const queue = await getQueue();
      expect(queue).toEqual([]);
    });
  });
});
