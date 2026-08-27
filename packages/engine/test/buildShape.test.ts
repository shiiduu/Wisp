import { describe, expect, it } from 'vitest';
import type { Item } from '@wisp/data/types';
import { PURE_SCALING_ITEM_IDS } from '../src/archetype';
import { assembleBuild, bootsPropertyOf } from '../src/buildShape';

function item(over: Partial<Item> & Pick<Item, 'id' | 'name' | 'tags'>): Item {
  return {
    description: '',
    price: 3000,
    iconPath: '',
    isCompleted: true,
    depth: 3,
    from: [1000],
    ...over,
  };
}

// Boots (base boots have an `into` upgrade, so isCompleted:false, tier 'boots').
const boots: Item[] = [
  item({ id: 3020, name: "Sorcerer's Shoes", tags: ['Boots', 'MagicPenetration'], isCompleted: false, into: [3175], price: 1100 }),
  item({ id: 3047, name: 'Plated Steelcaps', tags: ['Armor', 'Boots'], isCompleted: false, into: [3174], price: 1200 }),
  item({ id: 3111, name: "Mercury's Treads", tags: ['Boots', 'SpellBlock'], isCompleted: false, into: [3173], price: 1250 }),
  item({ id: 3006, name: "Berserker's Greaves", tags: ['AttackSpeed', 'Boots'], isCompleted: false, into: [3172], price: 1100 }),
  item({ id: 3158, name: 'Ionian Boots of Lucidity', tags: ['Boots', 'CooldownReduction'], isCompleted: false, into: [3171], price: 900 }),
];

const apItems: Item[] = [
  item({ id: 1, name: 'AP Alpha', tags: ['SpellDamage'], price: 2900 }),
  item({ id: 2, name: 'AP Bravo', tags: ['SpellDamage'], price: 3000 }),
  item({ id: 3, name: 'AP Charlie', tags: ['SpellDamage', 'Mana'], price: 3100 }),
  item({ id: 4, name: 'AP Delta', tags: ['SpellDamage'], price: 3600 }), // priciest -> signature tie-break
  item({ id: 5, name: 'AP Echo', tags: ['SpellDamage'], price: 2900 }),
  item({ id: 6, name: 'AP Foxtrot', tags: ['SpellDamage'], price: 3000 }),
];

const tankItems: Item[] = [
  item({ id: 10, name: 'Pure Armor 1', tags: ['Health', 'Armor'] }),
  item({ id: 11, name: 'Pure Armor 2', tags: ['Health', 'Armor'] }),
  item({ id: 12, name: 'Pure Armor 3', tags: ['Health', 'Armor'] }),
  item({ id: 13, name: 'Pure Armor 4', tags: ['Health', 'Armor'] }),
  item({ id: 20, name: 'Pure MR 1', tags: ['Health', 'SpellBlock'] }),
  item({ id: 21, name: 'Pure MR 2', tags: ['Health', 'SpellBlock'] }),
  item({ id: 22, name: 'Pure MR 3', tags: ['Health', 'SpellBlock'] }),
  item({ id: 30, name: 'Bruiser Both', tags: ['Health', 'Armor', 'SpellBlock'] }),
];

const critItems: Item[] = Array.from({ length: 8 }, (_, i) =>
  item({ id: 40 + i, name: `Crit ${i}`, tags: ['CriticalStrike', 'Damage'], price: 3000 + i }),
);

describe('assembleBuild — build-shape rules', () => {
  it('R1/R2/R3: <=6 slots, exactly one boots, exactly one signature', () => {
    const b = assembleBuild([...apItems, ...boots], 'AP');
    expect(b.length).toBeLessThanOrEqual(6);
    expect(b.filter((s) => s.role === 'boots')).toHaveLength(1);
    expect(b.filter((s) => s.role === 'signature')).toHaveLength(1);
    expect(b.filter((s) => s.role !== 'boots').length).toBeLessThanOrEqual(5);
    expect(new Set(b.map((s) => s.item.id)).size).toBe(b.length);
  });

  it('R1: boots match the direction (AP -> Sorcerer\'s Shoes, Tank -> Plated Steelcaps)', () => {
    expect(assembleBuild([...apItems, ...boots], 'AP').find((s) => s.role === 'boots')!.item.id).toBe(3020);
    expect(assembleBuild([...tankItems, ...boots], 'Tank').find((s) => s.role === 'boots')!.item.id).toBe(3047);
    expect(assembleBuild([...critItems, ...boots], 'Crit').find((s) => s.role === 'boots')!.item.id).toBe(3006);
  });

  it('R1: bootsPropertyOf derives the property from tags (with a plain fallback)', () => {
    expect(bootsPropertyOf(boots.find((b) => b.id === 3047)!)).toBe('armor');
    expect(bootsPropertyOf(boots.find((b) => b.id === 3111)!)).toBe('magicResist');
    expect(bootsPropertyOf(boots.find((b) => b.id === 3020)!)).toBe('magicPen');
    expect(bootsPropertyOf(boots.find((b) => b.id === 3158)!)).toBe('abilityHaste');
    expect(bootsPropertyOf(boots.find((b) => b.id === 3006)!)).toBe('attackSpeed');
    expect(bootsPropertyOf(item({ id: 1001, name: 'Boots', tags: ['Boots'], isCompleted: false }))).toBe('plain');
    expect(bootsPropertyOf(item({ id: 3009, name: 'Boots of Swiftness', tags: ['Boots'], isCompleted: false }))).toBe('mobility');
  });

  it('R1: falls back through the property preference list, then to any non-plain boots', () => {
    // Bruiser wants ['magicResist','armor']; give it only armor boots -> Plated.
    const armorOnly = boots.filter((b) => b.id === 3047);
    expect(assembleBuild([...tankItems, ...armorOnly], 'Bruiser').find((s) => s.role === 'boots')!.item.id).toBe(3047);
    // No preferred property present at all -> still returns a boots item.
    const plainOnly = [item({ id: 1001, name: 'Boots', tags: ['Boots'], isCompleted: false, into: [3009] })];
    expect(assembleBuild([...apItems, ...plainOnly], 'AP').find((s) => s.role === 'boots')!.item.id).toBe(1001);
  });

  it('R3: signature is the structural pick (priciest core on a score tie) and is always included', () => {
    const b = assembleBuild([...apItems, ...boots], 'AP');
    const sig = b.find((s) => s.role === 'signature')!;
    expect(sig.item.id).toBe(4); // "AP Delta", priciest
  });

  it('R6: a pure-scaling stat-stick is never the signature and never a top-2 non-boots slot', () => {
    const scalingId = [...PURE_SCALING_ITEM_IDS][0]; // 3089 Rabadon's Deathcap
    // Make it the "best" AP item (priciest, most on-theme) so, without R6, it
    // would win the signature slot the way it did before this fix.
    const rabadon = item({ id: scalingId, name: "Rabadon's Deathcap", tags: ['SpellDamage'], price: 3600 });
    const b = assembleBuild([rabadon, ...apItems, ...boots], 'AP');
    const nonBoots = b.filter((s) => s.role !== 'boots');

    expect(b.find((s) => s.role === 'signature')!.item.id).not.toBe(scalingId);
    const idx = nonBoots.findIndex((s) => s.item.id === scalingId);
    if (idx !== -1) expect(idx).toBeGreaterThanOrEqual(2); // still in the build, just later
  });

  it('R6: pure-scaling items are ordered behind flat-stat core items', () => {
    const s1 = item({ id: [...PURE_SCALING_ITEM_IDS][0], name: 'Scaling A', tags: ['SpellDamage'], price: 3600 });
    const s2 = item({ id: [...PURE_SCALING_ITEM_IDS][1], name: 'Scaling B', tags: ['SpellDamage'], price: 3500 });
    const b = assembleBuild([s1, s2, ...apItems, ...boots], 'AP');
    const nonBoots = b.filter((s) => s.role !== 'boots').map((s) => s.item.id);
    const lastFlat = Math.max(...nonBoots.map((id, i) => (PURE_SCALING_ITEM_IDS.has(id) ? -1 : i)));
    const firstScaling = nonBoots.findIndex((id) => PURE_SCALING_ITEM_IDS.has(id));
    if (firstScaling !== -1) expect(firstScaling).toBeGreaterThan(lastFlat);
  });

  it('R4: Tank build caps pure-Armor and pure-MR at 2 each and covers Armor/MR/Health', () => {
    const b = assembleBuild([...tankItems, ...boots], 'Tank');
    const nonBoots = b.filter((s) => s.role !== 'boots').map((s) => s.item);
    const pureArmor = nonBoots.filter((i) => i.tags.includes('Armor') && !i.tags.includes('SpellBlock'));
    const pureMR = nonBoots.filter((i) => i.tags.includes('SpellBlock') && !i.tags.includes('Armor'));
    expect(pureArmor.length).toBeLessThanOrEqual(2);
    expect(pureMR.length).toBeLessThanOrEqual(2);
    const all = b.map((s) => s.item);
    expect(all.some((i) => i.tags.includes('Armor'))).toBe(true);
    expect(all.some((i) => i.tags.includes('SpellBlock') || i.tags.includes('MagicResist'))).toBe(true);
    expect(all.some((i) => i.tags.includes('Health'))).toBe(true);
  });

  it('R4: Bruiser build with no MR in the pure pool still pulls in a resist-covering item', () => {
    const noMr = tankItems.filter((i) => !i.tags.includes('SpellBlock') || i.tags.includes('Armor'));
    const b = assembleBuild([...noMr, ...boots], 'Bruiser');
    // "Bruiser Both" (id 30) is the only MR source -> coverage rule must keep it, or Mercury's boots.
    const covered =
      b.some((s) => s.item.tags.includes('SpellBlock') || s.item.tags.includes('MagicResist'));
    expect(covered).toBe(true);
  });

  it('R5: Crit build reaches the ~100% crit estimate (>=4 crit items)', () => {
    const b = assembleBuild([...critItems, ...boots], 'Crit');
    const critCount = b.filter((s) => s.role !== 'boots' && s.item.tags.includes('CriticalStrike')).length;
    expect(critCount * 25).toBeGreaterThanOrEqual(100);
  });

  it('R2: degrades gracefully on a tiny pool — never pads past what exists, never exceeds 6', () => {
    const b = assembleBuild([apItems[0], boots[0]], 'AP');
    expect(b.length).toBeLessThanOrEqual(6);
    expect(b.filter((s) => s.role === 'boots').length).toBeLessThanOrEqual(1);
  });

  it('produces a boots slot even when the preferred boots id is absent (fallback)', () => {
    const onlyPlated = boots.filter((x) => x.id === 3047);
    const b = assembleBuild([...apItems, ...onlyPlated], 'AP');
    expect(b.filter((s) => s.role === 'boots')).toHaveLength(1);
    expect(b.find((s) => s.role === 'boots')!.item.id).toBe(3047);
  });
});
