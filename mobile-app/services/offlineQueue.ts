/**
 * Holly AI — Offline Message Queue
 *
 * Persists messages when the device is offline and retries sending
 * when connectivity is restored. Uses AsyncStorage for persistence
 * so messages survive app restarts.
 *
 * Flow:
 * 1. User sends message → addToQueue()
 * 2. If offline → message stored with status 'pending'
 * 3. When online → flush() sends all pending messages in order
 * 4. On success → status → 'sent'
 * 5. On failure → increment retryCount, exponential backoff
 * 6. Max 3 retries → status → 'failed'
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendChatMessage, ChatMessage, ChatResponse } from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type QueueStatus = 'pending' | 'sending' | 'sent' | 'failed';

export interface QueuedMessage {
  id: string;
  messages: ChatMessage[];       // Full conversation context
  status: QueueStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  lastAttemptAt: number | null;
  error: string | null;
  response: ChatResponse | null;
}

interface QueueState {
  messages: QueuedMessage[];
  isFlushing: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'holly-offline-queue';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;      // 2s base for exponential backoff
const MAX_DELAY_MS = 30000;      // 30s max delay

// ─── Persistence ─────────────────────────────────────────────────────────────

async function loadQueue(): Promise<QueuedMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[OfflineQueue] Failed to load queue:', err);
    return [];
  }
}

async function saveQueue(messages: QueuedMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (err) {
    console.warn('[OfflineQueue] Failed to save queue:', err);
  }
}

// ─── Queue Operations ────────────────────────────────────────────────────────

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Add a message to the offline queue.
 * Returns the queued message with its ID.
 */
export async function addToQueue(
  messages: ChatMessage[],
  maxRetries: number = MAX_RETRIES,
): Promise<QueuedMessage> {
  const queue = await loadQueue();

  const entry: QueuedMessage = {
    id: generateId(),
    messages,
    status: 'pending',
    retryCount: 0,
    maxRetries,
    createdAt: Date.now(),
    lastAttemptAt: null,
    error: null,
    response: null,
  };

  queue.push(entry);
  await saveQueue(queue);

  console.log('[OfflineQueue] Message queued:', entry.id);
  return entry;
}

/**
 * Get all messages currently in the queue.
 */
export async function getQueue(): Promise<QueuedMessage[]> {
  return loadQueue();
}

/**
 * Get only pending messages that are ready to send.
 * Respects exponential backoff — a message is ready if:
 * - It hasn't been attempted yet, OR
 * - Enough time has passed since last attempt
 */
export async function getPending(): Promise<QueuedMessage[]> {
  const queue = await loadQueue();
  const now = Date.now();

  return queue.filter((msg) => {
    if (msg.status !== 'pending') return false;
    if (!msg.lastAttemptAt) return true; // Never attempted

    // Exponential backoff: 2s, 4s, 8s, 16s, 30s...
    const delay = Math.min(
      BASE_DELAY_MS * Math.pow(2, msg.retryCount),
      MAX_DELAY_MS,
    );
    return now - msg.lastAttemptAt >= delay;
  });
}

/**
 * Flush the queue: send all pending messages in order.
 * Returns the number of messages successfully sent.
 *
 * This is the main entry point for retry logic.
 * Call it when:
 * - Network connectivity is restored
 * - App returns to foreground
 * - Periodically (every 30s) while app is open
 */
export async function flush(): Promise<{
  sent: number;
  failed: number;
  remaining: number;
}> {
  const queue = await loadQueue();

  // Prevent concurrent flushes
  if (queue.some((m) => m.status === 'sending')) {
    console.log('[OfflineQueue] Flush already in progress');
    return { sent: 0, failed: 0, remaining: queue.filter((m) => m.status === 'pending').length };
  }

  let sent = 0;
  let failed = 0;

  // Process pending messages in order
  for (const entry of queue) {
    if (entry.status !== 'pending') continue;

    // Check backoff
    if (entry.lastAttemptAt) {
      const delay = Math.min(
        BASE_DELAY_MS * Math.pow(2, entry.retryCount),
        MAX_DELAY_MS,
      );
      if (Date.now() - entry.lastAttemptAt < delay) continue;
    }

    // Mark as sending
    entry.status = 'sending';
    entry.lastAttemptAt = Date.now();
    await saveQueue(queue);

    try {
      const response = await sendChatMessage(entry.messages);
      entry.status = 'sent';
      entry.response = response;
      sent++;
    } catch (err: any) {
      entry.retryCount++;
      entry.error = err?.message || 'Unknown error';

      if (entry.retryCount >= entry.maxRetries) {
        entry.status = 'failed';
        failed++;
      } else {
        entry.status = 'pending'; // Retry later
      }
    }

    await saveQueue(queue);
  }

  const remaining = queue.filter((m) => m.status === 'pending').length;
  console.log(`[OfflineQueue] Flush complete: ${sent} sent, ${failed} failed, ${remaining} remaining`);

  return { sent, failed, remaining };
}

/**
 * Remove a specific message from the queue.
 */
export async function removeFromQueue(id: string): Promise<boolean> {
  const queue = await loadQueue();
  const filtered = queue.filter((m) => m.id !== id);

  if (filtered.length === queue.length) return false;

  await saveQueue(filtered);
  return true;
}

/**
 * Remove all sent or failed messages from the queue (cleanup).
 * Returns number of messages removed.
 */
export async function clearProcessed(): Promise<number> {
  const queue = await loadQueue();
  const remaining = queue.filter(
    (m) => m.status === 'pending' || m.status === 'sending',
  );
  const removed = queue.length - remaining.length;
  await saveQueue(remaining);
  return removed;
}

/**
 * Clear the entire queue (e.g., on sign-out).
 */
export async function clearQueue(): Promise<void> {
  await saveQueue([]);
}

/**
 * Get a summary of the queue state.
 */
export async function getQueueSummary(): Promise<{
  total: number;
  pending: number;
  sending: number;
  sent: number;
  failed: number;
}> {
  const queue = await loadQueue();
  return {
    total: queue.length,
    pending: queue.filter((m) => m.status === 'pending').length,
    sending: queue.filter((m) => m.status === 'sending').length,
    sent: queue.filter((m) => m.status === 'sent').length,
    failed: queue.filter((m) => m.status === 'failed').length,
  };
}
