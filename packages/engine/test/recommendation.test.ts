import { describe, expect, it } from 'vitest';
import type { Item } from '@wisp/data/types';
import { pickTrollDirection, recommendItemsForTag, scoreAllTags } from '../src/recommendation';
import { makeChampion } from './fixtures';

describe('scoreAllTags', () => {
  it('scores an AP-heavy mage highest on AP, not just its typical role', () => {
    const mage = makeChampion({
      tags: ['Mage'],
      info: { attack: 2, defense: 3, magic: 9, difficulty: 6 },
      abilities: {
        passive: { name: 'p', description: '', scaling: ['none'] },
        Q: { id: 'Q', name: 'Q', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['magic'] },
        W: { id: 'W', name: 'W', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['magic'] },
        E: { id: 'E', name: 'E', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['magic'] },
        R: { id: 'R', name: 'R', description: '', maxRank: 3, cooldown: [], cost: [], scaling: ['magic'] },
      },
    });
    const scores = scoreAllTags(mage);
    expect(scores[0].tag).toBe('AP');
    // every tag must be present, not just the champion's typical role
    expect(scores.map((s) => s.tag).sort()).toEqual(
      ['AD', 'AP', 'AttackSpeed', 'Bruiser', 'Crit', 'Lethality', 'Support', 'Tank'].sort(),
    );
  });

  it('scores a marksman highest on AD/AttackSpeed/Crit over AP', () => {
    const marksman = makeChampion({
      tags: ['Marksman'],
      info: { attack: 9, defense: 2, magic: 1, difficulty: 6 },
      stats: {
        hp: 550,
        hpperlevel: 80,
        mp: 300,
        mpperlevel: 35,
        armor: 24,
        armorperlevel: 3,
        spellblock: 28,
        spellblockperlevel: 1.5,
        attackdamage: 58,
        attackdamageperlevel: 3,
        attackspeed: 0.65,
        attackspeedperlevel: 4,
      },
      abilities: {
        passive: { name: 'p', description: '', scaling: ['none'] },
        Q: { id: 'Q', name: 'Q', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['physical'] },
        W: { id: 'W', name: 'W', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['physical'] },
        E: { id: 'E', name: 'E', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['none'] },
        R: { id: 'R', name: 'R', description: '', maxRank: 3, cooldown: [], cost: [], scaling: ['physical'] },
      },
    });
    const scores = scoreAllTags(marksman);
    const apScore = scores.find((s) => s.tag === 'AP')!.score;
    const adScore = scores.find((s) => s.tag === 'AD')!.score;
    expect(adScore).toBeGreaterThan(apScore);
  });
});

describe('pickTrollDirection', () => {
  it('never picks a tag scoring below the percentile floor', () => {
    const scores = [
      { tag: 'AP' as const, score: 100 },
      { tag: 'AD' as const, score: 60 },
      { tag: 'Tank' as const, score: 10 }, // below 0.5 * 100 cutoff
    ];
    // run many times with real randomness — Tank must never appear
    for (let i = 0; i < 200; i++) {
      const pick = pickTrollDirection(scores, { percentileFloor: 0.5 });
      expect(pick.tag).not.toBe('Tank');
    }
  });

  it('is deterministic given an injected rng, and excludes the typical (top) tag when alternatives exist', () => {
    const scores = [
      { tag: 'AP' as const, score: 100 },
      { tag: 'AD' as const, score: 90 },
      { tag: 'Tank' as const, score: 80 },
    ];
    // rng() = 0 always picks the first eligible, non-typical entry
    const pick = pickTrollDirection(scores, { rng: () => 0 });
    expect(pick.tag).not.toBe('AP');
  });

  it('falls back to the typical tag if it is the only one above the cutoff', () => {
    const scores = [
      { tag: 'AP' as const, score: 100 },
      { tag: 'AD' as const, score: 1 },
    ];
    const pick = pickTrollDirection(scores, { percentileFloor: 0.5, rng: () => 0 });
    expect(pick.tag).toBe('AP');
  });
});

describe('recommendItemsForTag', () => {
  const items: Item[] = [
    {
      id: 1,
      name: 'AP Core Item',
      description: '',
      price: 3500,
      iconPath: '',
      isCompleted: true,
      tags: ['SpellDamage'],
      from: [10],
      depth: 3,
    },
    {
      id: 2,
      name: 'AP Component',
      description: '',
      price: 1200,
      iconPath: '',
      isCompleted: false,
      tags: ['SpellDamage'],
      into: [1],
    },
    {
      id: 3,
      name: 'AD Core Item',
      description: '',
      price: 3300,
      iconPath: '',
      isCompleted: true,
      tags: ['Damage'],
      from: [11],
      depth: 3,
    },
  ];

  it('only recommends completed, non-component items matching the tag', () => {
    const result = recommendItemsForTag(items, 'AP');
    expect(result.map((i) => i.id)).toEqual([1]);
  });

  it('recommends nothing when no item matches the tag', () => {
    expect(recommendItemsForTag(items, 'Support')).toEqual([]);
  });

  it('dedupes items sharing a name (e.g. Summoner\'s Rift vs Arena variants), keeping the higher-scoring one', () => {
    const withDuplicateName: Item[] = [
      ...items,
      {
        id: 999,
        name: 'AP Core Item',
        description: '',
        price: 2500,
        iconPath: '',
        isCompleted: true,
        tags: ['SpellDamage'],
        from: [12],
        depth: 2,
      },
    ];
    const result = recommendItemsForTag(withDuplicateName, 'AP');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});
