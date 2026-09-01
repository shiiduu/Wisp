import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ChampionAbilities, Item } from '@wisp/data/types';
import { assembleBuild } from '../src/buildShape';
import { deriveStatProfile, recommendItemsForTag, scoreItemForTag } from '../src/recommendation';
import { ITEM_STYLE_STAT_SHAPE, classifyItemTier, itemStyleStatAffinity, type ItemStyle } from '../src/index';
import { buildPlan } from '../src/buildPlan';
import { makeAbility, makeChampion } from './fixtures';

const ROOT = join(__dirname, '../../..');
const items: Item[] = JSON.parse(readFileSync(join(ROOT, 'packages/data/items.json'), 'utf8')).items;
const augments = JSON.parse(readFileSync(join(ROOT, 'packages/data/augments.json'), 'utf8')).augments;

const kit = (sig: 'physical' | 'magic'): ChampionAbilities => ({
  passive: { name: 'p', description: '', scaling: [sig] },
  Q: makeAbility({ scaling: [sig] }),
  W: makeAbility({ scaling: [sig] }),
  E: makeAbility({ scaling: [sig] }),
  R: makeAbility({ scaling: [sig] }),
});
const physKit = kit('physical');
const magicKit = kit('magic');

const marksman = makeChampion({ id: 'Mm', tags: ['Marksman'], info: { attack: 9, defense: 3, magic: 1, difficulty: 5 }, abilities: physKit });
const mage = makeChampion({ id: 'Mg', tags: ['Mage'], info: { attack: 2, defense: 3, magic: 9, difficulty: 5 }, abilities: magicKit });
const tank = makeChampion({ id: 'Tk', tags: ['Tank'], info: { attack: 3, defense: 9, magic: 4, difficulty: 5 }, stats: { ...makeChampion().stats, hpperlevel: 120 } });

describe('deriveStatProfile', () => {
  it('weights track the champion kit (marksman -> crit/AS, mage -> AP, tank -> defensive)', () => {
    const mm = deriveStatProfile(marksman);
    const mg = deriveStatProfile(mage);
    const tk = deriveStatProfile(tank);

    expect(mm.critChance!).toBeGreaterThan(mg.critChance!);
    expect(mm.attackSpeed!).toBeGreaterThan(mg.attackSpeed!);
    expect(mg.abilityPower!).toBeGreaterThan(mm.abilityPower!);
    expect(tk.health!).toBeGreaterThan(mm.health!);
    expect(tk.armor!).toBeGreaterThan(mg.armor!);
  });

  it('every weight is within [0, 1]', () => {
    for (const champ of [marksman, mage, tank, makeChampion()]) {
      for (const w of Object.values(deriveStatProfile(champ))) {
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThanOrEqual(1);
      }
    }
  });

  it('the resulting bonus stays a sub-tier tie-break on real items (< one tier step)', () => {
    // A tier step is 10 base points (overlap 1 x 10 x tier-weight delta of >=1).
    const profile = deriveStatProfile(tank); // the most stat-heavy profile
    for (const item of items.filter((i) => i.stats && i.isCompleted)) {
      const bare = scoreItemForTag(item, 'Bruiser');
      const withProfile = scoreItemForTag(item, 'Bruiser', { statProfile: profile });
      if (bare === 0) continue;
      expect(withProfile - bare).toBeLessThan(10);
    }
  });
});

describe('STEP 1 — Lethality collapse fix', () => {
  it('different champions forced to Lethality no longer all get the identical build', () => {
    const builds = new Set(
      [marksman, mage, tank].map((c) =>
        buildPlan(c, 'Lethality', items, augments)
          .build.map((s) => `${s.role}:${s.item.id}`)
          .join('|'),
      ),
    );
    expect(builds.size).toBeGreaterThan(1);
  });
});

describe('STEP 2 — ItemStyle pool differentiation (flat-scoring fix)', () => {
  // parent BuildTag for each ItemStyle (on-hit also reachable from AD)
  const parent: Record<ItemStyle, Parameters<typeof recommendItemsForTag>[1]> = {
    'burst-caster': 'AP', 'dot-caster': 'AP', 'artillery-caster': 'AP', 'ap-bruiser': 'AP',
    'on-hit': 'AttackSpeed', 'crit-marksman': 'Crit', lethality: 'Lethality', 'ad-caster': 'AD',
    bruiser: 'Bruiser', juggernaut: 'Bruiser', 'warden-tank': 'Tank', 'aura-tank': 'Tank',
    enchanter: 'Support',
  };

  it('every previously-flat pool now has >1 distinct base score (root cause (c) removed)', () => {
    // Pools that scored every item identically before: their gated pool, with
    // a style gate but NO champion profile, must now spread.
    for (const style of ['lethality', 'burst-caster', 'ap-bruiser', 'crit-marksman', 'juggernaut', 'aura-tank'] as const) {
      const pool = recommendItemsForTag(items, parent[style], { itemStyle: style });
      const scores = new Set(pool.map((i) => scoreItemForTag(i, parent[style], { itemStyle: style })));
      expect(pool.length).toBeGreaterThanOrEqual(4);
      expect(scores.size).toBeGreaterThan(1);
    }
  });

  it('a crit-leaning champ and a caster get different Lethality builds (scaling-driven divergence)', () => {
    const critChamp = buildPlan(marksman, 'Lethality', items, augments).build.map((s) => s.item.id).join('|');
    const casterChamp = buildPlan(mage, 'Lethality', items, augments).build.map((s) => s.item.id).join('|');
    expect(critChamp).not.toEqual(casterChamp);
  });

  it('the style-affinity term never lifts a situational item over a core item within a pool', () => {
    for (const style of Object.keys(ITEM_STYLE_STAT_SHAPE) as ItemStyle[]) {
      const tag = parent[style];
      const pool = recommendItemsForTag(items, tag, { itemStyle: style, statProfile: deriveStatProfile(tank) });
      const scoreOf = (i: (typeof pool)[number]) =>
        scoreItemForTag(i, tag, { itemStyle: style, statProfile: deriveStatProfile(tank) });
      const cores = pool.filter((i) => classifyItemTier(i) === 'core');
      const situ = pool.filter((i) => classifyItemTier(i) === 'situational');
      for (const c of cores) for (const s of situ) expect(scoreOf(c)).toBeGreaterThan(scoreOf(s));
    }
  });

  it('itemStyleStatAffinity is bounded and degrades gracefully without a profile', () => {
    for (const item of items.filter((i) => i.stats)) {
      for (const style of Object.keys(ITEM_STYLE_STAT_SHAPE) as ItemStyle[]) {
        const a = itemStyleStatAffinity(item, style);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(3); // normalised; realistically < ~1.3
      }
    }
  });
});

describe('additive guarantee — no-context / no-style paths unchanged', () => {
  it('assembleBuild(items, tag) === assembleBuild(items, tag, undefined), byte-for-byte', () => {
    for (const tag of ['AP', 'AD', 'Tank', 'Bruiser', 'Crit', 'Lethality', 'AttackSpeed', 'Support'] as const) {
      const bare = assembleBuild(items, tag).map((s) => `${s.role}:${s.item.id}`);
      const undef = assembleBuild(items, tag, undefined).map((s) => `${s.role}:${s.item.id}`);
      expect(undef).toEqual(bare);
    }
  });

  it('recommendItemsForTag / scoreItemForTag ignore an absent or style-less context', () => {
    for (const tag of ['AD', 'Lethality', 'Crit'] as const) {
      const a = recommendItemsForTag(items, tag).map((i) => i.id);
      expect(recommendItemsForTag(items, tag, {}).map((i) => i.id)).toEqual(a);
      // statProfile WITHOUT itemStyle must not trigger the new affinity term
      for (const item of items.filter((i) => i.stats).slice(0, 30)) {
        const noCtx = scoreItemForTag(item, tag);
        const profileOnly = scoreItemForTag(item, tag, { statProfile: deriveStatProfile(marksman) });
        if (noCtx === 0) continue;
        // only the small Step-1 statProfile nudge applies here (< 10), no style term
        expect(Math.abs(profileOnly - noCtx)).toBeLessThan(10);
      }
    }
  });
});
