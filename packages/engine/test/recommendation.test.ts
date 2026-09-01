import { describe, expect, it } from 'vitest';
import type { Item } from '@wisp/data/types';
import {
  isSupportItemization,
  pickTrollDirection,
  recommendItemsForTag,
  scoreAllTags,
} from '../src/recommendation';
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
    // Tank must NOT be inflated by base stat growth — a squishy mage
    // should score near-nothing for Tank, nowhere near its AP score.
    const ap = scores.find((s) => s.tag === 'AP')!.score;
    const tank = scores.find((s) => s.tag === 'Tank')!.score;
    expect(tank).toBeLessThan(ap * 0.35);
  });

  it('scores Tank highly only for a kit with tank signals (role tag / tank scaling), not for a generic squishy champion', () => {
    const base = {
      info: { attack: 5, defense: 4, magic: 5, difficulty: 5 },
    } as const;
    const squishy = makeChampion({ ...base, tags: ['Mage'] });
    const realTank = makeChampion({
      tags: ['Tank'],
      info: { attack: 3, defense: 9, magic: 4, difficulty: 4 },
      abilities: {
        passive: { name: 'p', description: '', scaling: ['tank'] },
        Q: { id: 'Q', name: 'Q', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['tank'] },
        W: { id: 'W', name: 'W', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['none'] },
        E: { id: 'E', name: 'E', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['none'] },
        R: { id: 'R', name: 'R', description: '', maxRank: 3, cooldown: [], cost: [], scaling: ['none'] },
      },
    });
    const squishyTank = scoreAllTags(squishy).find((s) => s.tag === 'Tank')!.score;
    const realTankScore = scoreAllTags(realTank).find((s) => s.tag === 'Tank')!.score;
    expect(realTankScore).toBeGreaterThan(squishyTank * 3);
    expect(scoreAllTags(realTank)[0].tag).toBe('Tank');
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
  it('prefers a coherent off-role direction over a barely-viable one', () => {
    const scores = [
      { tag: 'AP' as const, score: 100 },
      { tag: 'AD' as const, score: 60 }, // off-role and coherent (>= 0.4 * top)
      { tag: 'Tank' as const, score: 10 }, // off-role but incoherent
    ];
    for (let i = 0; i < 200; i++) {
      expect(pickTrollDirection(scores).tag).toBe('AD');
    }
  });

  it('excludes every near-top tag, not just the #1 (multi-role champions)', () => {
    // AP, AD and Tank are all within realRoleThreshold (0.65) of the top —
    // all three count as "real roles" and must be excluded.
    const scores = [
      { tag: 'AP' as const, score: 100 },
      { tag: 'AD' as const, score: 90 },
      { tag: 'Tank' as const, score: 80 },
      { tag: 'Bruiser' as const, score: 45 }, // the only genuine off-role option
    ];
    for (let i = 0; i < 200; i++) {
      expect(pickTrollDirection(scores).tag).toBe('Bruiser');
    }
  });

  it('still rolls an off-role direction for a one-dimensional champion (never hands back the main role)', () => {
    const scores = [
      { tag: 'AP' as const, score: 100 },
      { tag: 'AD' as const, score: 1 },
    ];
    // A troll build is meant to be suboptimal — AD is picked despite the
    // poor fit; it must not fall back to AP.
    expect(pickTrollDirection(scores, { rng: () => 0 }).tag).toBe('AD');
  });

  it('only collapses to the top tag when literally every direction is a real role', () => {
    const scores = [
      { tag: 'AP' as const, score: 100 },
      { tag: 'AD' as const, score: 95 },
      { tag: 'Tank' as const, score: 90 },
      { tag: 'Bruiser' as const, score: 88 },
    ];
    // no off-role option exists -> degenerate fallback still avoids the #1
    const pick = pickTrollDirection(scores, { rng: () => 0 });
    expect(pick.tag).not.toBe('AP');
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

  it('excludes support-itemization items from non-Support directions, keeps them for Support', () => {
    const forbiddenIdol: Item = {
      id: 3114,
      name: 'Forbidden Idol',
      description: '',
      price: 500,
      iconPath: '',
      isCompleted: false,
      tags: ['ManaRegen'],
      into: [500],
    };
    const enchanter: Item = {
      id: 500,
      name: 'Enchanter Core',
      description: '',
      price: 2500,
      iconPath: '',
      isCompleted: true,
      tags: ['SpellDamage', 'ManaRegen', 'HealthRegen'],
      from: [3114, 1052],
      depth: 3,
    };
    const goldIncome: Item = {
      id: 501,
      name: 'Gold Income Finisher',
      description: '',
      price: 2200,
      iconPath: '',
      isCompleted: true,
      tags: ['SpellDamage', 'GoldPer', 'Lane'],
      from: [3867],
      depth: 2,
    };
    const bandlepipes: Item = {
      id: 2524,
      name: 'Bandlepipes',
      description: '',
      price: 2300,
      iconPath: '',
      isCompleted: true,
      tags: ['Health', 'SpellDamage'],
      from: [3067],
      depth: 3,
    };
    const withSupport = [...items, forbiddenIdol, enchanter, goldIncome, bandlepipes];

    const apById = new Map(withSupport.map((i) => [i.id, i]));
    expect(isSupportItemization(enchanter, apById)).toBe(true);
    expect(isSupportItemization(goldIncome, apById)).toBe(true);
    expect(isSupportItemization(bandlepipes, apById)).toBe(true);
    expect(isSupportItemization(items[0], apById)).toBe(false);

    const apResult = recommendItemsForTag(withSupport, 'AP').map((i) => i.id);
    expect(apResult).not.toContain(500);
    expect(apResult).not.toContain(501);
    expect(apResult).not.toContain(2524);

    const supportResult = recommendItemsForTag(withSupport, 'Support').map((i) => i.id);
    expect(supportResult).toContain(500);
    expect(supportResult).toContain(501);
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
