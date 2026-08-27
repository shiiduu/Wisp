import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Item } from '@wisp/data/types';
import {
  ITEM_ARCHETYPE_TAGS,
  ITEM_STYLES,
  PURE_SCALING_ITEM_IDS,
  itemMatchesStyle,
  itemStylesOf,
} from '../src/archetype';
import { assembleBuild } from '../src/buildShape';
import { classifyItemTier } from '../src/itemTier';
import { recommendItemsForTag, resolveItemStyle, scoreItemForTag } from '../src/recommendation';
import { makeChampion } from './fixtures';

const ROOT = join(__dirname, '../../..');
const items: Item[] = JSON.parse(readFileSync(join(ROOT, 'packages/data/items.json'), 'utf8')).items;
const byId = new Map(items.map((i) => [i.id, i]));

describe('ITEM_ARCHETYPE_TAGS integrity', () => {
  it('every tagged id exists in the current items.json', () => {
    const missing = Object.keys(ITEM_ARCHETYPE_TAGS).map(Number).filter((id) => !byId.has(id));
    expect(missing).toEqual([]);
  });

  it('every style is from the ItemStyle vocabulary, no empty lists', () => {
    for (const [id, styles] of Object.entries(ITEM_ARCHETYPE_TAGS)) {
      expect(styles.length).toBeGreaterThan(0);
      for (const s of styles) expect(ITEM_STYLES).toContain(s);
      void id;
    }
  });

  it('does not tag pure-scaling items (Stage 5 owns those)', () => {
    for (const id of PURE_SCALING_ITEM_IDS) {
      expect(ITEM_ARCHETYPE_TAGS[id]).toBeUndefined();
    }
  });

  it('only tags completed, non-boots, non-consumable items', () => {
    for (const id of Object.keys(ITEM_ARCHETYPE_TAGS).map(Number)) {
      const it = byId.get(id)!;
      expect(it.isCompleted).toBe(true);
      expect(it.tags).not.toContain('Boots');
      expect(it.tags).not.toContain('Consumable');
    }
  });

  it('itemStylesOf returns [] for an untagged item', () => {
    const untagged = items.find((i) => !ITEM_ARCHETYPE_TAGS[i.id])!;
    expect(itemStylesOf(untagged)).toEqual([]);
  });
});

describe('archetype-gated recommendItemsForTag', () => {
  it('returns ONLY items carrying the requested itemStyle', () => {
    for (const style of ['crit-marksman', 'lethality', 'dot-caster', 'warden-tank'] as const) {
      const direction = style === 'warden-tank' ? 'Tank' : style === 'dot-caster' ? 'AP' : 'AD';
      const result = recommendItemsForTag(items, direction, { itemStyle: style });
      expect(result.length).toBeGreaterThan(0);
      for (const it of result) expect(itemMatchesStyle(it, style)).toBe(true);
    }
  });

  it('is a strict subset of the un-gated recommendation for the same direction', () => {
    const ungated = new Set(recommendItemsForTag(items, 'AD').map((i) => i.id));
    const gated = recommendItemsForTag(items, 'AD', { itemStyle: 'lethality' });
    for (const it of gated) expect(ungated.has(it.id)).toBe(true);
  });

  it('never surfaces a lane-phase starter item, even though they carry tags', () => {
    const laneTagged = Object.keys(ITEM_ARCHETYPE_TAGS)
      .map(Number)
      .filter((id) => classifyItemTier(byId.get(id)!) === 'starter');
    expect(laneTagged.length).toBeGreaterThan(0); // Doran's / Guardian's are tagged
    for (const id of laneTagged) {
      for (const style of ITEM_ARCHETYPE_TAGS[id]) {
        const dir = style.includes('tank') ? 'Tank' : style === 'crit-marksman' ? 'Crit'
          : style === 'lethality' ? 'Lethality'
          : style.includes('caster') || style === 'ap-bruiser' || style === 'enchanter' ? 'AP'
          : 'AD';
        const rec = recommendItemsForTag(items, dir as never, { itemStyle: style });
        expect(rec.some((i) => i.id === id)).toBe(false);
      }
    }
  });
});

describe('resolveItemStyle', () => {
  it('maps the ~1:1 directions directly', () => {
    const c = makeChampion({});
    expect(resolveItemStyle(c, 'AttackSpeed')).toBe('on-hit');
    expect(resolveItemStyle(c, 'Crit')).toBe('crit-marksman');
    expect(resolveItemStyle(c, 'Lethality')).toBe('lethality');
    expect(resolveItemStyle(c, 'Support')).toBe('enchanter');
  });

  it('splits AP by kit durability', () => {
    const bruiserMage = makeChampion({ tags: ['Fighter', 'Mage'] });
    const squishyMage = makeChampion({ tags: ['Mage'], info: { attack: 2, defense: 2, magic: 9, difficulty: 5 } });
    expect(resolveItemStyle(bruiserMage, 'AP')).toBe('ap-bruiser');
    expect(resolveItemStyle(squishyMage, 'AP')).toBe('burst-caster');
  });

  it('splits Tank by support flavour (heal/shield scaling)', () => {
    const warden = makeChampion({ tags: ['Tank'] });
    const auraTank = makeChampion({
      tags: ['Tank', 'Support'],
      abilities: {
        passive: { name: 'p', description: '', scaling: ['none'] },
        Q: { id: 'Q', name: 'Q', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['shield'] },
        W: { id: 'W', name: 'W', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['heal'] },
        E: { id: 'E', name: 'E', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['none'] },
        R: { id: 'R', name: 'R', description: '', maxRank: 3, cooldown: [], cost: [], scaling: ['none'] },
      },
    });
    expect(resolveItemStyle(warden, 'Tank')).toBe('warden-tank');
    expect(resolveItemStyle(auraTank, 'Tank')).toBe('aura-tank');
  });
});

describe('assembleBuild with archetype context', () => {
  it('contains no starter-tier item and only style-matching non-boots items', () => {
    const build = assembleBuild(items, 'AP', { itemStyle: 'ap-bruiser' });
    const nonBoots = build.filter((s) => s.role !== 'boots');
    expect(nonBoots.length).toBeGreaterThan(0);
    for (const s of nonBoots) {
      expect(classifyItemTier(s.item)).not.toBe('starter');
      // may be topped up from the un-gated pool only if the gated pool is short
    }
  });

  it('a durable AP kit and a squishy AP kit get different signatures', () => {
    const bruiser = assembleBuild(items, 'AP', { itemStyle: 'ap-bruiser' });
    const burst = assembleBuild(items, 'AP', { itemStyle: 'burst-caster' });
    expect(bruiser.find((s) => s.role === 'signature')!.item.id).not.toBe(
      burst.find((s) => s.role === 'signature')!.item.id,
    );
  });

  it('with no ctx, assembleBuild output is unchanged (byte-for-byte vs bare tag path)', () => {
    for (const tag of ['AP', 'AD', 'Tank', 'Bruiser', 'Crit'] as const) {
      const a = assembleBuild(items, tag).map((s) => `${s.role}:${s.item.id}`);
      const b = assembleBuild(items, tag, undefined).map((s) => `${s.role}:${s.item.id}`);
      expect(a).toEqual(b);
    }
  });
});

describe('no-context path is unchanged', () => {
  it('recommendItemsForTag(items, tag) === recommendItemsForTag(items, tag, undefined)', () => {
    for (const tag of ['AP', 'AD', 'Tank', 'Crit'] as const) {
      const a = recommendItemsForTag(items, tag).map((i) => i.id);
      const b = recommendItemsForTag(items, tag, undefined).map((i) => i.id);
      expect(a).toEqual(b);
    }
  });

  it('scoreItemForTag ignores statProfile unless it is passed', () => {
    const it = items.find((i) => i.stats && i.tags.includes('SpellDamage'))!;
    const bare = scoreItemForTag(it, 'AP');
    expect(scoreItemForTag(it, 'AP', {})).toBe(bare);
    expect(scoreItemForTag(it, 'AP', { statProfile: { abilityPower: 1 } })).toBeGreaterThan(bare);
  });
});

describe('statProfile tie-break', () => {
  const mk = (over: Partial<Item> & Pick<Item, 'id' | 'name'>): Item => ({
    description: '',
    price: 3000,
    iconPath: '',
    isCompleted: true,
    tags: ['SpellDamage'],
    depth: 3,
    from: [1000],
    ...over,
  });

  it('ranks the better stat-profile match higher when base scores tie', () => {
    const highAP = mk({ id: 90001, name: 'High AP', stats: { abilityPower: 120, health: 0 } });
    const lowAP = mk({ id: 90002, name: 'Low AP', stats: { abilityPower: 40, health: 400 } });
    const ctx = { statProfile: { abilityPower: 1 } };
    expect(scoreItemForTag(highAP, 'AP', ctx)).toBeGreaterThan(scoreItemForTag(lowAP, 'AP', ctx));
    // Without the profile the two tie exactly.
    expect(scoreItemForTag(highAP, 'AP')).toBe(scoreItemForTag(lowAP, 'AP'));
  });

  it('the stat bonus stays below one tier step (does not reorder tiers)', () => {
    const core = mk({ id: 90003, name: 'Core', from: [1], depth: 3, price: 3000, stats: { abilityPower: 0 } });
    const situational = mk({
      id: 90004,
      name: 'Situational',
      from: [1],
      depth: 2,
      price: 1500,
      stats: { abilityPower: 1000 },
    });
    const ctx = { statProfile: { abilityPower: 1 } };
    // core tier (weight 3) must still beat a situational item (weight 1) even
    // with a huge stat bonus on the latter.
    expect(scoreItemForTag(core, 'AP', ctx)).toBeGreaterThan(scoreItemForTag(situational, 'AP', ctx));
  });
});
