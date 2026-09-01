import { describe, expect, it } from 'vitest';
import type { Augment } from '@wisp/data/types';
import { filterAramMayhemAugments, pickBestAugmentForTag, rankAugmentsForTag } from '../src/augment-matcher';

function makeAugment(overrides: Partial<Augment>): Augment {
  return {
    id: 1,
    apiName: 'Test',
    name: 'Test',
    description: '',
    rarity: 'silver',
    iconPath: '',
    ...overrides,
  };
}

describe('augment-matcher', () => {
  const augments: Augment[] = [
    makeAugment({ apiName: 'A', name: 'Cloud Nine', description: 'Gain ability power and haste.' }),
    makeAugment({ apiName: 'B', name: 'Iron Skin', description: 'Gain armor and health.' }),
    makeAugment({ apiName: 'C', name: 'Nothing Special', description: 'Does nothing relevant.' }),
  ];

  it('ranks the AP-keyword augment first for the AP tag', () => {
    const ranked = rankAugmentsForTag(augments, 'AP');
    expect(ranked[0].apiName).toBe('A');
  });

  it('ranks the tank-keyword augment first for the Tank tag', () => {
    const ranked = rankAugmentsForTag(augments, 'Tank');
    expect(ranked[0].apiName).toBe('B');
  });

  it('falls back to the first augment when nothing matches at all', () => {
    const noMatch = [makeAugment({ apiName: 'X', name: 'Nothing', description: 'Nothing.' })];
    expect(pickBestAugmentForTag(noMatch, 'AP').apiName).toBe('X');
  });

  it('filters to only the given valid apiNames, preserving order', () => {
    const filtered = filterAramMayhemAugments(augments, ['C', 'A']);
    expect(filtered.map((a) => a.apiName)).toEqual(['A', 'C']);
  });

  it('excludes everything when no apiNames are valid', () => {
    expect(filterAramMayhemAugments(augments, [])).toEqual([]);
  });
});
