#!/usr/bin/env tsx
/**
 * First-pass item -> ItemStyle guesser (6-stage architecture, Stage 3).
 *
 * NOT a source of truth. This produces a consistent starting draft from
 * each item's Community Dragon `tags` + a keyword scan of its description
 * text; a human then hand-reviews and corrects the result, and the
 * corrected table is stored (hand-maintained) as ITEM_ARCHETYPE_TAGS in
 * packages/engine/src/archetype.ts.
 *
 * Run: `pnpm --filter @wisp/data tsx scripts/tag-item-archetypes.ts`
 * Prints a `Record<itemId, ItemStyle[]>` literal + a review report.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Item, ItemsFile } from '../types';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const items = (JSON.parse(readFileSync(join(PKG, 'items.json'), 'utf8')) as ItemsFile).items;

// Kept in sync with archetype.ts PURE_SCALING_ITEM_IDS — those are Stage 5's
// job and get no ItemStyle.
const PURE_SCALING = new Set([3089, 3135, 3137, 3036, 6694, 3033]);

type Style =
  | 'burst-caster'
  | 'dot-caster'
  | 'artillery-caster'
  | 'ap-bruiser'
  | 'on-hit'
  | 'crit-marksman'
  | 'lethality'
  | 'ad-caster'
  | 'bruiser'
  | 'juggernaut'
  | 'warden-tank'
  | 'aura-tank'
  | 'enchanter';

function guess(item: Item): Style[] {
  const t = new Set(item.tags);
  const d = item.description.toLowerCase();
  const has = (...k: string[]) => k.some((x) => d.includes(x));
  const styles = new Set<Style>();

  const isAP = t.has('SpellDamage');
  const isAD = t.has('Damage');
  const isHealthy = t.has('Health');
  const bigHealth = /(\d{3,})\s*health/.test(d) && Number(/(\d{3,})\s*health/.exec(d)?.[1] ?? 0) >= 450;

  // --- caster styles ---
  if (isAP) {
    if (has('per second', 'burn', '% max health', 'for 3 seconds', 'grievous')) styles.add('dot-caster');
    if (has('range or greater', '600 range', 'distant', 'hypershot')) styles.add('artillery-caster');
    if (isHealthy && (t.has('AbilityHaste') || t.has('CooldownReduction'))) styles.add('ap-bruiser');
    // burst = an AP damage item that isn't primarily DoT/enchanter
    if (has('missile', 'dash', 'bonus magic damage', 'echo', 'blast', 'nuke') || t.has('Mana'))
      styles.add('burst-caster');
    if (styles.size === 0) styles.add('burst-caster');
  }

  // --- attack styles ---
  if (t.has('OnHit')) styles.add('on-hit');
  if (t.has('CriticalStrike')) styles.add('crit-marksman');
  if (has('lethality') || t.has('ArmorPenetration')) {
    // ArmorPenetration also covers % pen bruiser items — only call it
    // lethality when the flat "Lethality" stat is on the card.
    if (has('lethality')) styles.add('lethality');
  }
  if (isAD && t.has('Mana')) styles.add('ad-caster');
  if (isAD && has('spellblade', 'ability', 'on-attack')) styles.add('ad-caster');

  // --- bruiser / juggernaut ---
  if (isAD && isHealthy && !isAP) {
    styles.add('bruiser');
    if (bigHealth || has('bonus health as attack damage', 'colossal', 'tyranny')) styles.add('juggernaut');
  }

  // --- tanks ---
  const isResist = t.has('Armor') || t.has('SpellBlock') || t.has('MagicResist');
  if (isHealthy && isResist && !isAD && !isAP) styles.add('warden-tank');
  if ((t.has('Aura') || t.has('Active')) && isResist && isHealthy) styles.add('aura-tank');

  // --- enchanter (rough — the engine has isSupportItemization for the real signal) ---
  if (has('heal', 'shield', 'shielding', 'allied', 'nearby allies') && (isAP || t.has('ManaRegen')))
    styles.add('enchanter');

  return [...styles];
}

const table: Record<number, Style[]> = {};
const report: string[] = [];
for (const item of items) {
  if (!item.isCompleted) continue;
  if (item.tags.includes('Boots') || item.tags.includes('Consumable') || item.tags.includes('Trinket')) continue;
  if (PURE_SCALING.has(item.id)) continue;
  const g = guess(item);
  table[item.id] = g;
  const flag = g.length === 0 ? ' <<< NO GUESS' : g.length >= 3 ? ' <<< 3+ styles' : '';
  report.push(
    `${String(item.id).padEnd(6)} ${item.name.padEnd(28)} ${JSON.stringify(g).padEnd(48)} [${item.tags.join(',')}]${flag}`,
  );
}

console.log('// --- draft ITEM_ARCHETYPE_TAGS (review before use) ---');
console.log(JSON.stringify(table, null, 2));
console.log('\n// --- review report ---');
console.log(report.sort().join('\n'));
console.log(`\n// ${Object.keys(table).length} items tagged`);
