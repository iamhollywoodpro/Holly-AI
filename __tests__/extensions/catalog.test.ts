/**
 * Phase R1: Extension Catalog — structural tests
 *
 * Verifies the catalog is well-formed:
 *   - All extension ids are unique (no shadowing)
 *   - Total count is exactly 80 (9+12+10+12+9+8+10+10)
 *   - Every extension's suite field matches one of the 8 valid suites
 *   - Required fields (name, description, capabilities, icon) are non-empty
 *   - getExtensionById + getExtensionsBySuite behave correctly
 */

/// <reference types="jest" />

import {
  EXTENSION_CATALOG,
  ALL_SUITES,
  SUITE_METADATA,
  getExtensionById,
  getExtensionsBySuite,
  getSuiteCounts,
  validateCatalogUniqueIds,
} from '@/lib/extensions/catalog';

describe('Extension Catalog — structural integrity', () => {
  it('has exactly 80 extensions', () => {
    expect(EXTENSION_CATALOG).toHaveLength(80);
  });

  it('has no duplicate ids', () => {
    expect(() => validateCatalogUniqueIds()).not.toThrow();
  });

  it('every extension references a valid suite', () => {
    for (const ext of EXTENSION_CATALOG) {
      expect(ALL_SUITES).toContain(ext.suite);
    }
  });

  it('every extension has non-empty required fields', () => {
    for (const ext of EXTENSION_CATALOG) {
      expect(ext.id).toBeTruthy();
      expect(ext.id).toMatch(/^[a-z][a-z0-9-]*$/); // kebab-case
      expect(ext.name).toBeTruthy();
      expect(ext.description).toBeTruthy();
      expect(ext.description.length).toBeGreaterThan(20);
      expect(ext.capabilities.length).toBeGreaterThanOrEqual(1);
      expect(ext.icon).toBeTruthy();
    }
  });
});

describe('Extension Catalog — suite counts match Phase S plan', () => {
  const counts = getSuiteCounts();

  it('developer suite has 9 extensions (S1)', () => {
    expect(counts.developer).toBe(9);
  });

  it('music suite has 12 extensions (S2)', () => {
    expect(counts.music).toBe(12);
  });

  it('business suite has 10 extensions (S3)', () => {
    expect(counts.business).toBe(10);
  });

  it('social suite has 12 extensions (S4)', () => {
    expect(counts.social).toBe(12);
  });

  it('web suite has 9 extensions (S5)', () => {
    expect(counts.web).toBe(9);
  });

  it('creative suite has 8 extensions (S6)', () => {
    expect(counts.creative).toBe(8);
  });

  it('productivity suite has 10 extensions (S7)', () => {
    expect(counts.productivity).toBe(10);
  });

  it('research suite has 10 extensions (S8)', () => {
    expect(counts.research).toBe(10);
  });

  it('suite counts sum to 80', () => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(80);
  });
});

describe('Extension Catalog — accessors', () => {
  it('getExtensionById returns the manifest for known ids', () => {
    const music = getExtensionById('music-distribution');
    expect(music).toBeDefined();
    expect(music?.suite).toBe('music');
    expect(music?.name).toBe('Music Distribution');
  });

  it('getExtensionById returns undefined for unknown ids', () => {
    expect(getExtensionById('does-not-exist')).toBeUndefined();
  });

  it('getExtensionsBySuite returns all extensions in the suite', () => {
    const dev = getExtensionsBySuite('developer');
    expect(dev).toHaveLength(9);
    expect(dev.every((e) => e.suite === 'developer')).toBe(true);
  });

  it('getExtensionsBySuite returns extensions sorted by name', () => {
    const music = getExtensionsBySuite('music');
    const names = music.map((e) => e.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });
});

describe('Extension Catalog — suite metadata', () => {
  it('every suite has metadata', () => {
    for (const suite of ALL_SUITES) {
      const meta = SUITE_METADATA[suite];
      expect(meta).toBeDefined();
      expect(meta.key).toBe(suite);
      expect(meta.name).toBeTruthy();
      expect(meta.tagline).toBeTruthy();
      expect(meta.icon).toBeTruthy();
    }
  });

  it('suites have unique priority values 1-8', () => {
    const priorities = ALL_SUITES.map((s) => SUITE_METADATA[s].priority);
    expect(new Set(priorities).size).toBe(8);
    expect(Math.min(...priorities)).toBe(1);
    expect(Math.max(...priorities)).toBe(8);
  });

  it('developer suite is priority 1 (Steve\'s highest priority)', () => {
    expect(SUITE_METADATA.developer.priority).toBe(1);
  });
});
