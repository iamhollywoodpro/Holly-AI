/**
 * Tests for the signup use-case picker mapping (Roadmap C2b).
 */
import { USE_CASES, getUseCaseById, starterExtensionsFor } from '../../src/lib/onboarding/use-cases';
import { getExtensionById } from '../../src/lib/extensions/catalog';

describe('use-cases', () => {
  it('has at least 6 use cases with unique ids', () => {
    expect(USE_CASES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(USE_CASES.map(uc => uc.id)).size).toBe(USE_CASES.length);
  });

  it('every starter extension id exists in the catalog', () => {
    for (const uc of USE_CASES) {
      for (const extId of uc.starterExtensions) {
        expect(getExtensionById(extId)).toBeDefined();
      }
    }
  });

  it('every starter extension is non-NSFW (safe to auto-install)', () => {
    for (const uc of USE_CASES) {
      for (const extId of uc.starterExtensions) {
        expect(getExtensionById(extId)?.nsfw).toBeFalsy();
      }
    }
  });

  it('getUseCaseById returns the match and undefined otherwise', () => {
    expect(getUseCaseById('coding')?.label).toBe('Coding Partner');
    expect(getUseCaseById('nope')).toBeUndefined();
  });

  it('starterExtensionsFor unions selections without duplicates', () => {
    const ids = starterExtensionsFor(['coding', 'design']);
    const coding = getUseCaseById('coding')!.starterExtensions;
    const design = getUseCaseById('design')!.starterExtensions;
    expect(ids).toEqual(expect.arrayContaining([...coding, ...design]));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('starterExtensionsFor ignores unknown ids', () => {
    expect(starterExtensionsFor(['bogus'])).toEqual([]);
  });
});
