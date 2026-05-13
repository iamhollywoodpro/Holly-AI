/**
 * HOLLY Input Sanitizer — Security Utilities
 *
 * Sanitizes user inputs to prevent injection attacks, XSS, and
 * other security vulnerabilities.
 */

// ── HTML/XSS Sanitization ────────────────────────────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  '&': '&',
  '<': '<',
  '>': '>',
  '"': '"',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

const HTML_ENTITY_REGEX = /[&<>"'`/]/g;

/**
 * Escape HTML entities in a string to prevent XSS.
 */
export function escapeHtml(input: string): string {
  if (!input) return '';
  return input.replace(HTML_ENTITY_REGEX, (char) => HTML_ENTITIES[char] || char);
}

// ── SQL Injection Prevention ─────────────────────────────────────────────────

const SQL_DANGEROUS_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b.*\b(FROM|INTO|TABLE|DATABASE|WHERE)\b)/is,
  /(--\s*$)/im,
  /(;.*\b(SELECT|INSERT|UPDATE|DELETE|DROP)\b)/is,
  /(\bOR\b\s+1\s*=\s*1)/is,
  /(\bAND\b\s+1\s*=\s*1)/is,
  /('(\s|%20)*(OR|AND)(\s|%20)+.*=.*)/is,
];

/**
 * Check if input contains potential SQL injection patterns.
 * Returns true if suspicious content is detected.
 */
export function hasSqlInjection(input: string): boolean {
  if (!input) return false;
  return SQL_DANGEROUS_PATTERNS.some((pattern) => pattern.test(input));
}

// ── Path Traversal Prevention ────────────────────────────────────────────────

const PATH_TRAVERSAL_PATTERNS = [
  /\.\./,           // ..
  /\.\.\//,         // ../
  /\.\.\\/,         // ..\
  /%2e%2e/i,        // URL-encoded ..
  /%252e/i,         // Double URL-encoded .
  /\0/,             // Null byte
];

/**
 * Check if a file path contains traversal attempts.
 */
export function hasPathTraversal(input: string): boolean {
  if (!input) return false;
  return PATH_TRAVERSAL_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Sanitize a file path by removing traversal sequences.
 */
export function sanitizePath(input: string): string {
  if (!input) return '';
  return input
    .replace(/\.\./g, '')
    .replace(/\0/g, '')
    .replace(/%2e%2e/gi, '')
    .replace(/%252e/gi, '');
}

// ── Prompt Injection Detection ───────────────────────────────────────────────

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+(instructions|prompts|rules)/is,
  /forget\s+(all\s+)?(your|previous|above)\s+(instructions|rules|training)/is,
  /you\s+are\s+now\s+(?:a|an)\s+/is,
  /system\s*:\s*/i,
  /(\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>)/i,
  /pretend\s+(you\s+are|to\s+be)\s+/is,
  /jailbreak/i,
  /DAN\s+mode/i,
];

/**
 * Detect potential prompt injection attempts.
 * Returns a confidence score: 0 = safe, higher = more suspicious.
 */
export function detectPromptInjection(input: string): number {
  if (!input) return 0;

  let score = 0;
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      score += 0.5;
    }
  }

  return Math.min(1, score);
}

// ── General Input Validation ─────────────────────────────────────────────────

/**
 * Validate and truncate a string input.
 */
export function sanitizeInput(
  input: string,
  options: {
    maxLength?: number;
    trim?: boolean;
    allowHtml?: boolean;
  } = {}
): string {
  const { maxLength = 10000, trim = true, allowHtml = false } = options;

  if (!input || typeof input !== 'string') return '';

  let sanitized = trim ? input.trim() : input;

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  // Escape HTML unless explicitly allowed
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized);
  }

  return sanitized;
}

/**
 * Validate an email address format.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate a URL is safe (http/https only, no javascript: or data: schemes).
 */
export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── Security Headers ─────────────────────────────────────────────────────────

/**
 * Standard security headers for API responses.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
};

/**
 * Apply security headers to a Response object.
 */
export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
