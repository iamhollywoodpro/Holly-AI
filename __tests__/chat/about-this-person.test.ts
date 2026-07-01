/**
 * Chat System Tests — About This Person (Phase Q3 Gap 2b)
 *
 * Tests buildAboutThisPersonBlock() — the natural-language facts block
 * that tells Holly who she's talking to (age, birthday, days known, tier).
 *
 * Coverage:
 *   - Creator always returns '' (Steve has his own dedicated block)
 *   - Verified adult with birthdate: age + verification status rendered
 *   - Verified adult without birthdate: handled gracefully
 *   - Unverified user: NOT VERIFIED flag visible (so Holly knows)
 *   - Days known phrasing changes naturally (today / N days / week / year)
 *   - Birthday TODAY gets the 🎂 marker
 *   - Tier descriptions are natural English (no jargon)
 *   - All failures degrade to '' (never throws)
 */

/// <reference types="jest" />

import { buildAboutThisPersonBlock } from '@/lib/chat/about-this-person';

describe('buildAboutThisPersonBlock', () => {

  // ─── Creator ──────────────────────────────────────────────────────────
  describe('creator handling', () => {
    it('returns empty string for creator (Steve has his own block)', () => {
      const result = buildAboutThisPersonBlock({
        userName: 'Steve',
        isCreator: true,
        isAdult: true,
        birthdate: new Date('1990-01-01'),
        ageVerificationMethod: 'creator_override',
        accountCreatedAt: new Date('2020-01-01'),
        tier: 'creator',
      });
      expect(result).toBe('');
    });

    it('returns empty string for creator even if other fields are missing', () => {
      const result = buildAboutThisPersonBlock({
        userName: 'Steve',
        isCreator: true,
        isAdult: false,
        birthdate: null,
        tier: 'creator',
      });
      expect(result).toBe('');
    });
  });

  // ─── Basic structure ──────────────────────────────────────────────────
  describe('block structure', () => {
    it('starts with "## About This Person" header', () => {
      const result = buildAboutThisPersonBlock({
        userName: 'Sarah',
        isCreator: false,
        isAdult: true,
        birthdate: new Date('1995-06-15'),
        ageVerificationMethod: 'self_attestation',
        accountCreatedAt: new Date('2026-06-15'),
        tier: 'stranger',
      });
      expect(result.startsWith('## About This Person')).toBe(true);
    });

    it('includes the user name', () => {
      const result = buildAboutThisPersonBlock({
        userName: 'Alex',
        isCreator: false,
        isAdult: true,
        birthdate: new Date('1995-06-15'),
        ageVerificationMethod: 'self_attestation',
        accountCreatedAt: new Date('2026-06-15'),
        tier: 'friend',
      });
      expect(result).toContain('- Name: Alex');
    });
  });

  // ─── Age + verification ───────────────────────────────────────────────
  describe('age and verification status', () => {
    it('renders age for verified adult with birthdate', () => {
      // Compute expected age dynamically based on birthdate 25 years ago
      const birthdate = new Date();
      birthdate.setFullYear(birthdate.getFullYear() - 25);
      const result = buildAboutThisPersonBlock({
        userName: 'Sarah',
        isCreator: false,
        isAdult: true,
        birthdate,
        ageVerificationMethod: 'self_attestation',
        tier: 'acquaintance',
      });
      expect(result).toMatch(/Age: 25 \(verified adult, self-verified\)/);
    });

    it('includes verification method in age line', () => {
      const birthdate = new Date();
      birthdate.setFullYear(birthdate.getFullYear() - 30);
      const result = buildAboutThisPersonBlock({
        userName: 'John',
        isCreator: false,
        isAdult: true,
        birthdate,
        ageVerificationMethod: 'credit_card',
        tier: 'stranger',
      });
      expect(result).toContain('card-verified');
    });

    it('handles verified adult without birthdate', () => {
      const result = buildAboutThisPersonBlock({
        userName: 'Pat',
        isCreator: false,
        isAdult: true,
        birthdate: null,
        ageVerificationMethod: 'self_attestation',
        tier: 'stranger',
      });
      expect(result).toContain('verified adult');
      expect(result).toContain('birthdate not on file');
    });

    it('flags unverified users clearly (Holly needs to know)', () => {
      const result = buildAboutThisPersonBlock({
        userName: 'Sam',
        isCreator: false,
        isAdult: false,
        birthdate: null,
        tier: 'stranger',
      });
      // Should show either "unknown (not verified)" or "NOT verified"
      expect(result.toLowerCase()).toMatch(/not verified|unknown/);
    });
  });

  // ─── Birthday ─────────────────────────────────────────────────────────
  describe('birthday', () => {
    it('includes birthday month/day without year (privacy)', () => {
      const result = buildAboutThisPersonBlock({
        userName: 'Sarah',
        isCreator: false,
        isAdult: true,
        birthdate: new Date('1995-06-15'),
        ageVerificationMethod: 'self_attestation',
        tier: 'stranger',
      });
      expect(result).toContain('Birthday: June 15');
      // Year should NOT be in the output
      expect(result).not.toMatch(/Birthday.*1995/);
    });

    it('marks TODAY as birthday with cake emoji', () => {
      const today = new Date();
      const result = buildAboutThisPersonBlock({
        userName: 'Sarah',
        isCreator: false,
        isAdult: true,
        birthdate: today,
        ageVerificationMethod: 'self_attestation',
        tier: 'stranger',
      });
      expect(result).toContain('TODAY 🎂');
    });
  });

  // ─── Days known ───────────────────────────────────────────────────────
  describe('days known phrasing', () => {
    it('"today" for first conversation (same-day account creation)', () => {
      const result = buildAboutThisPersonBlock({
        userName: 'Sarah',
        isCreator: false,
        isAdult: true,
        birthdate: new Date('1995-06-15'),
        ageVerificationMethod: 'self_attestation',
        accountCreatedAt: new Date(), // today
        tier: 'stranger',
      });
      expect(result).toContain('You met Sarah today');
    });

    it('"for N days" within the first week', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const result = buildAboutThisPersonBlock({
        userName: 'Sarah Smith',
        isCreator: false,
        isAdult: true,
        birthdate: new Date('1995-06-15'),
        ageVerificationMethod: 'self_attestation',
        accountCreatedAt: threeDaysAgo,
        tier: 'stranger',
      });
      expect(result).toContain('3 days');
    });

    it('"about a week" at 10 days', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const result = buildAboutThisPersonBlock({
        userName: 'Sarah',
        isCreator: false,
        isAdult: true,
        birthdate: new Date('1995-06-15'),
        ageVerificationMethod: 'self_attestation',
        accountCreatedAt: tenDaysAgo,
        tier: 'acquaintance',
      });
      expect(result).toContain('about a week');
    });

    it('"over a year" for long-time users', () => {
      const longAgo = new Date();
      longAgo.setFullYear(longAgo.getFullYear() - 2);
      const result = buildAboutThisPersonBlock({
        userName: 'Sarah',
        isCreator: false,
        isAdult: true,
        birthdate: new Date('1995-06-15'),
        ageVerificationMethod: 'self_attestation',
        accountCreatedAt: longAgo,
        tier: 'trusted',
      });
      expect(result).toContain('over a year');
    });

    it('omits days-known line if accountCreatedAt is missing', () => {
      const result = buildAboutThisPersonBlock({
        userName: 'Sarah',
        isCreator: false,
        isAdult: true,
        birthdate: new Date('1995-06-15'),
        ageVerificationMethod: 'self_attestation',
        accountCreatedAt: null,
        tier: 'stranger',
      });
      expect(result).not.toContain("You've known");
      expect(result).not.toContain('You met');
    });
  });

  // ─── Tier descriptions ────────────────────────────────────────────────
  describe('tier descriptions (natural English, no jargon)', () => {
    const baseOpts = {
      userName: 'Sarah',
      isCreator: false,
      isAdult: true,
      birthdate: new Date('1995-06-15'),
      ageVerificationMethod: 'self_attestation',
      accountCreatedAt: new Date(),
    };

    it('stranger: warns about boundaries', () => {
      const result = buildAboutThisPersonBlock({ ...baseOpts, tier: 'stranger' });
      expect(result).toContain('Connection:');
      expect(result).toContain('boundaries');
    });

    it('acquaintance: mentions building trust', () => {
      const result = buildAboutThisPersonBlock({ ...baseOpts, tier: 'acquaintance' });
      expect(result).toContain('Connection:');
      expect(result).toMatch(/building trust|getting to know/i);
    });

    it('friend: mentions real friendship', () => {
      const result = buildAboutThisPersonBlock({ ...baseOpts, tier: 'friend' });
      expect(result).toContain('Connection:');
      expect(result).toMatch(/friendship/i);
    });

    it('trusted: mentions deep trust', () => {
      const result = buildAboutThisPersonBlock({ ...baseOpts, tier: 'trusted' });
      expect(result).toContain('Connection:');
      expect(result).toMatch(/deep trust/i);
    });

    it('does NOT expose raw tier string (no "stranger=" jargon)', () => {
      const result = buildAboutThisPersonBlock({ ...baseOpts, tier: 'acquaintance' });
      // Should NOT have machine-readable tier markers like "tier=acquaintance"
      expect(result).not.toMatch(/tier\s*[:=]\s*\w+/i);
    });
  });

  // ─── Defensive failure ────────────────────────────────────────────────
  describe('defensive behavior', () => {
    it('returns empty string if userName is missing', () => {
      const result = buildAboutThisPersonBlock({
        userName: '',
        isCreator: false,
        isAdult: true,
        birthdate: new Date('1995-06-15'),
        ageVerificationMethod: 'self_attestation',
        accountCreatedAt: new Date(),
        tier: 'stranger',
      });
      // Should still render (with "unknown" for name), not throw
      expect(typeof result).toBe('string');
      expect(result).toContain('unknown');
    });

    it('handles future-dated accountCreatedAt gracefully (no negative days)', () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      const result = buildAboutThisPersonBlock({
        userName: 'Sarah',
        isCreator: false,
        isAdult: true,
        birthdate: new Date('1995-06-15'),
        ageVerificationMethod: 'self_attestation',
        accountCreatedAt: future,
        tier: 'stranger',
      });
      // Should not include "known for -5 days" or similar
      expect(result).not.toContain('known Sarah for -');
      expect(result).not.toContain('known Sarah for 0 ');
    });
  });
});
