/**
 * Load Test — 100 Concurrent Users
 *
 * Run with: npx k6 run load-test/k6-chat-100.js
 *
 * Prerequisites:
 * - k6 installed (https://k6.io/docs/get-started/installation/)
 * - Holly server running at BASE_URL
 * - Valid API key or Clerk token set in HOLLY_API_KEY env var
 *
 * What it tests:
 * - Chat API under 100 concurrent virtual users
 * - Ramp-up: 30s → 100 users, sustain 2min, ramp-down 30s
 * - Measures: response time p50/p95/p99, error rate, requests/sec
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'https://holly.nexamusicgroup.com';
const API_KEY = __ENV.HOLLY_API_KEY || '';

const errorRate = new Rate('errors');
const responseTime = new Trend('chat_response_time', true);

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp to 20 users
    { duration: '30s', target: 50 },   // Ramp to 50 users
    { duration: '30s', target: 100 },  // Ramp to 100 users
    { duration: '2m', target: 100 },   // Sustain 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // 95% of requests under 5s
    errors: ['rate<0.1'],               // Error rate under 10%
    chat_response_time: ['p(95)<8000'], // 95% chat responses under 8s
  },
};

// ── Test Messages ────────────────────────────────────────────────────────────

const messages = [
  'Hey Holly, how are you today?',
  'Can you help me brainstorm some song ideas?',
  'What do you know about music theory?',
  'Tell me something interesting about AI.',
  'How would you describe our friendship?',
  'What are some creative ways to use React hooks?',
  'Help me think through a problem at work.',
  'What music have you been into lately?',
  'Can you write a short poem about the ocean?',
  'What do you think about the future of AI?',
];

// ── Main Test ────────────────────────────────────────────────────────────────

export default function () {
  const msg = messages[Math.floor(Math.random() * messages.length)];

  const payload = JSON.stringify({
    messages: [
      { role: 'user', content: msg },
    ],
    stream: false,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
    timeout: '30s',
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/chat`, payload, params);
  const duration = Date.now() - start;

  responseTime.add(duration);

  const passed = check(res, {
    'status is 200': (r) => r.status === 200,
    'has response body': (r) => r.body && r.body.length > 0,
    'response has choices': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.choices && body.choices.length > 0;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!passed);

  // Simulate user think time (3-8 seconds between messages)
  sleep(3 + Math.random() * 5);
}

// ── Summary ──────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  const metrics = data.metrics;
  const reqDuration = metrics.http_req_duration?.values;
  const chatDuration = metrics.chat_response_time?.values;
  const errors = metrics.errors?.values;

  return {
    'stdout': `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Holly AI — Load Test Results (100 Users)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Requests:     ${metrics.http_reqs?.values?.count || 0}
  Request Rate: ${metrics.http_reqs?.values?.rate?.toFixed(2) || 0} req/s
  Error Rate:   ${((errors?.rate || 0) * 100).toFixed(1)}%

  HTTP Duration:
    p50: ${reqDuration?.['p(50)']?.toFixed(0) || '?'}ms
    p95: ${reqDuration?.['p(95)']?.toFixed(0) || '?'}ms
    p99: ${reqDuration?.['p(99)']?.toFixed(0) || '?'}ms

  Chat Response Time:
    p50: ${chatDuration?.['p(50)']?.toFixed(0) || '?'}ms
    p95: ${chatDuration?.['p(95)']?.toFixed(0) || '?'}ms
    p99: ${chatDuration?.['p(99)']?.toFixed(0) || '?'}ms

  Iterations:   ${metrics.iterations?.values?.count || 0}
  VUs Peak:     ${metrics.vus?.values?.max || 0}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
  };
}
