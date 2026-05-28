/**
 * Load Test — 1,000 Concurrent Users
 *
 * Run with: npx k6 run load-test/k6-chat-1000.js
 *
 * This is the stress test. It pushes the system to 1,000 concurrent
 * virtual users to find the breaking point.
 *
 * Prerequisites:
 * - k6 installed (https://k6.io/docs/get-started/installation/)
 * - Holly server running at BASE_URL
 * - Valid API key or Clerk token set in HOLLY_API_KEY env var
 * - Connection pool configured for high concurrency (20+ connections)
 *
 * What it tests:
 * - System behavior under extreme load
 * - Connection pool exhaustion
 * - Rate limiter behavior
 * - Memory/cache behavior at scale
 * - Background task throughput under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'https://holly.nexamusicgroup.com';
const API_KEY = __ENV.HOLLY_API_KEY || '';

const errorRate = new Rate('errors');
const responseTime = new Trend('chat_response_time', true);
const rateLimitHits = new Counter('rate_limit_hits');
const serverErrors = new Counter('server_errors');

export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Warm up
    { duration: '2m', target: 250 },   // Moderate load
    { duration: '2m', target: 500 },   // Heavy load
    { duration: '2m', target: 750 },   // Very heavy
    { duration: '2m', target: 1000 },  // Peak load
    { duration: '3m', target: 1000 },  // Sustain peak
    { duration: '1m', target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'],  // 95% under 10s at peak
    errors: ['rate<0.2'],                // Error rate under 20% at peak
    chat_response_time: ['p(95)<15000'], // 95% chat under 15s
  },
};

// ── Test Messages (shorter for stress test) ──────────────────────────────────

const messages = [
  'Hi Holly!',
  'Tell me a joke.',
  'What is 2+2?',
  'How are you?',
  'Quick question: what is AI?',
  'Say something nice.',
  'What time is it?',
  'Give me a fun fact.',
];

// ── Main Test ────────────────────────────────────────────────────────────────

export default function () {
  const msg = messages[Math.floor(Math.random() * messages.length)];

  const payload = JSON.stringify({
    messages: [{ role: 'user', content: msg }],
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

  // Track specific error types
  if (res.status === 429) rateLimitHits.add(1);
  if (res.status >= 500) serverErrors.add(1);

  const passed = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'status is not 500': (r) => r.status !== 500,
    'has response body': (r) => r.body && r.body.length > 0,
  });

  errorRate.add(!passed);

  // Shorter think time for stress test (1-4 seconds)
  sleep(1 + Math.random() * 3);
}

// ── Summary ──────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  const metrics = data.metrics;
  const reqDuration = metrics.http_reqs?.values;
  const httpDuration = metrics.http_req_duration?.values;
  const chatDuration = metrics.chat_response_time?.values;
  const errors = metrics.errors?.values;

  return {
    'stdout': `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Holly AI — Stress Test Results (1,000 Users)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Requests: ${reqDuration?.count || 0}
  Request Rate:   ${reqDuration?.rate?.toFixed(2) || 0} req/s
  Error Rate:     ${((errors?.rate || 0) * 100).toFixed(1)}%
  Rate Limit (429): ${metrics.rate_limit_hits?.values?.count || 0}
  Server Errors (5xx): ${metrics.server_errors?.values?.count || 0}

  HTTP Duration:
    avg: ${httpDuration?.avg?.toFixed(0) || '?'}ms
    p50: ${httpDuration?.['p(50)']?.toFixed(0) || '?'}ms
    p95: ${httpDuration?.['p(95)']?.toFixed(0) || '?'}ms
    p99: ${httpDuration?.['p(99)']?.toFixed(0) || '?'}ms

  Chat Response Time:
    avg: ${chatDuration?.avg?.toFixed(0) || '?'}ms
    p50: ${chatDuration?.['p(50)']?.toFixed(0) || '?'}ms
    p95: ${chatDuration?.['p(95)']?.toFixed(0) || '?'}ms
    p99: ${chatDuration?.['p(99)']?.toFixed(0) || '?'}ms

  Iterations: ${metrics.iterations?.values?.count || 0}
  VUs Peak:   ${metrics.vus?.values?.max || 0}
  Data In:    ${(metrics.data_received?.values?.count / 1024 / 1024)?.toFixed(2) || '?'} MB
  Data Out:   ${(metrics.data_sent?.values?.count / 1024 / 1024)?.toFixed(2) || '?'} MB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
  };
}
