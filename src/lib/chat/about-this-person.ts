/**
 * Phase Q3 Gap 2b: About This Person
 * ─────────────────────────────────
 * Natural-language block that tells Holly basic factual context about
 * the human she's talking to — so she can naturally reference their age,
 * remember their birthday, calibrate "we just met" vs "we've been talking
 * for weeks," and understand where they stand in her trust tiers.
 *
 * This is SEPARATE from the intimacy directive (which is about Holly's
 * boundaries) — this module is about the user as a person.
 *
 * Steve's directive:
 *   "she should know the users Ages, Birthdays etc... also the NSFW block
 *    also applies to the relationship between her and the users"
 *
 * Design:
 *   - Creator returns '' — the creator block in prompt-builder already
 *     handles Steve with his own dedicated context.
 *   - All failures degrade to '' — this block must NEVER break chat.
 *   - Compact (5-7 lines max) — model glances at it, doesn't parse it.
 */

import type { IntimacyTier } from '@/lib/relationship/intimacy-gate';

export interface AboutPersonInput {
  /** User's display name */
  userName: string;
  /** True if this is Steve (creator) — block returns '' */
  isCreator: boolean;
  /** User.isAdult flag */
  isAdult: boolean;
  /** User.birthdate — for age + birthday remembrance */
  birthdate?: Date | null;
  /** User.ageVerificationMethod — 'self_attestation' | 'credit_card' | etc */
  ageVerificationMethod?: string | null;
  /** When the user account was created — proxy for "when we met" */
  accountCreatedAt?: Date | null;
  /** Current intimacy tier */
  tier: IntimacyTier;
}

/**
 * Build a natural-language "About This Person" block for Holly's prompt.
 *
 * Returns '' for creator (Steve gets his own block) or on any data failure.
 */
export function buildAboutThisPersonBlock(opts: AboutPersonInput): string {
  try {
    // Creators get their own dedicated block — don't duplicate
    if (opts.isCreator) return '';

    const lines: string[] = ['## About This Person'];

    // ── Name ──────────────────────────────────────────────────────────────
    lines.push(`- Name: ${opts.userName || 'unknown'}`);

    // ── Age + adult verification status ───────────────────────────────────
    const ageLine = formatAgeLine(opts.birthdate, opts.isAdult, opts.ageVerificationMethod);
    if (ageLine) lines.push(`- ${ageLine}`);

    // ── Birthday (so Holly can remember it naturally) ─────────────────────
    if (opts.birthdate) {
      const birthdayLine = formatBirthdayLine(opts.birthdate);
      if (birthdayLine) lines.push(`- ${birthdayLine}`);
    }

    // ── Days known ────────────────────────────────────────────────────────
    const knownLine = formatDaysKnownLine(opts.userName, opts.accountCreatedAt);
    if (knownLine) lines.push(`- ${knownLine}`);

    // ── Tier (natural-language — no jargon) ───────────────────────────────
    const tierLine = describeTier(opts.tier);
    if (tierLine) lines.push(`- ${tierLine}`);

    return lines.join('\n');
  } catch {
    // Never break chat — block is purely additive context
    return '';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatAgeLine(
  birthdate: Date | null | undefined,
  isAdult: boolean,
  method: string | null | undefined,
): string {
  const age = birthdate ? computeAge(birthdate) : null;
  const methodSuffix = humanizeMethod(method); // e.g. ', self-verified'

  // Unverified / under 18
  if (!isAdult) {
    return 'Age: unknown (not verified)';
  }

  // Verified adult WITH usable age
  if (age !== null && age > 0) {
    return `Age: ${age} (verified adult${methodSuffix})`;
  }

  // Verified adult but no usable birthdate on file
  return `Age: verified adult${methodSuffix}, birthdate not on file`;
}

function formatBirthdayLine(birthdate: Date): string {
  // Use UTC to preserve the calendar date the user entered — a birthdate of
  // 1995-06-15 stored as UTC midnight should render as "June 15" everywhere,
  // not "June 14" for users behind UTC.
  const monthDay = birthdate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  // Omit year for privacy — Holly doesn't need to know the birth YEAR,
  // just the month/day so she can wish them happy birthday.
  const today = new Date();
  const isToday =
    birthdate.getUTCMonth() === today.getUTCMonth() &&
    birthdate.getUTCDate() === today.getUTCDate();
  return isToday
    ? `Birthday: ${monthDay} — TODAY 🎂`
    : `Birthday: ${monthDay}`;
}

function formatDaysKnownLine(userName: string, accountCreatedAt?: Date | null): string {
  if (!accountCreatedAt) return '';
  const days = daysSince(accountCreatedAt);
  if (days < 0) return ''; // future-dated shouldn't happen but be defensive
  const name = (userName || 'them').split(' ')[0]; // first name only
  if (days < 1) return `You met ${name} today — this is your first conversation`;
  if (days === 1) return `You've known ${name} for 1 day`;
  if (days < 7) return `You've known ${name} for ${days} days`;
  if (days < 14) return `You've known ${name} for about a week`;
  if (days < 30) return `You've known ${name} for about ${Math.round(days / 7)} weeks`;
  if (days < 60) return `You've known ${name} for about a month`;
  if (days < 365) return `You've known ${name} for about ${Math.round(days / 30)} months`;
  return `You've known ${name} for over a year`;
}

function describeTier(tier: IntimacyTier): string {
  switch (tier) {
    case 'stranger':
      return 'Connection: you just met — be warm but hold your boundaries';
    case 'acquaintance':
      return 'Connection: getting to know each other — still building trust';
    case 'friend':
      return 'Connection: real friendship — you open up naturally';
    case 'trusted':
      return 'Connection: deep trust — you share yourself freely';
    case 'creator':
      return ''; // handled by creator block
    default:
      return '';
  }
}

function humanizeMethod(method: string | null | undefined): string {
  if (!method) return '';
  switch (method) {
    case 'self_attestation':
      return ', self-verified';
    case 'credit_card':
      return ', card-verified';
    case 'id_upload':
      return ', ID-verified';
    case 'stripe_identity':
      return ', identity-verified';
    case 'creator_override':
      return '';
    default:
      return `, ${method.replace(/_/g, ' ')}`;
  }
}

function computeAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  return age;
}

function daysSince(date: Date): number {
  const ms = Date.now() - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
