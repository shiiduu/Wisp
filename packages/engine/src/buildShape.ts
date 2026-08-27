import type { Item } from '@wisp/data/types';
import { isPureScalingItem } from './archetype';
import { classifyItemTier } from './itemTier';
import {
  recommendItemsForTag,
  scoreItemForTag,
  tagOverlapForTag,
  type ArchetypeContext,
} from './recommendation';
import type { BuildTag } from './types';

/**
 * Hard build-shape rules for the final recommended build.
 *
 * Real League builds are not "the top N highest-scoring items" — they have
 * a fixed structure. `assembleBuild` turns the open-ended candidate ranking
 * from `recommendItemsForTag` into one coherent, inventory-legal build:
 *
 *  R1. BOOTS — exactly one boots item, its own guaranteed slot. Chosen by
 *      matching the direction's ordered boots-property preference
 *      (BOOTS_PREFERENCE_BY_TAG) against each candidate's derived property
 *      (bootsPropertyOf) — defensive boots for Tank/Bruiser, pen/haste/AS
 *      otherwise. Boots never competes with a core item for a slot.
 *  R2. SIZE — at most 6 items total: 1 boots + up to 5 non-boots. This is a
 *      hard cap on the returned array, never a display-layer truncation.
 *  R3. SIGNATURE — exactly one signature item, guaranteed a slot inside the
 *      6, picked by a structural tie-break (core tier, then on-theme tag
 *      overlap, then price) rather than left to compete on raw score where
 *      it could be crowded out.
 *  R4. TANK/BRUISER RESISTANCE BALANCE — don't stack redundant single
 *      resistances: cap "pure Armor" and "pure MR" items at 2 each, and
 *      ensure the finished build broadly covers Armor, Magic Resist and
 *      Health (boots count toward coverage).
 *  R5. CRIT THRESHOLD — a Crit build should itemize toward the ~100% crit
 *      cap: estimate crit from crit-tagged items and, if short, swap the
 *      weakest non-crit core item for the best remaining crit item.
 *  R6. PURE-SCALING SLOT GATE — "stat-stick" items (Rabadon's, Void Staff,
 *      % pen items — see archetype.ts PURE_SCALING_ITEM_IDS) are never the
 *      signature and never the 1st/2nd non-boots item; they sit after the
 *      flat-stat core items in slot order. (The precise stat-breakpoint
 *      gate — "requires >= X AP already" — is GEP-blocked and deliberately
 *      out of scope; "at least one flat core item first" stands in for it.)
 *
 * These are deliberately simple heuristics standing in for real build
 * logic, not a simulation. Sub-archetype nuance (AP burst vs AP on-hit vs
 * AP tank, matchup-specific boots, exact crit values per item) is a
 * separate, later refinement that can layer on top of this — not now.
 */

export type BuildSlotRole = 'signature' | 'boots' | 'core';

export interface BuildSlot {
  item: Item;
  role: BuildSlotRole;
}

const MAX_BUILD_SIZE = 6;
const MAX_NON_BOOTS = 5;

const PLAIN_BOOTS_ID = 1001;

/** R5 tuning — rough average crit chance per crit-tagged completed item, and the cap it targets. */
const CRIT_PER_ITEM = 25;
const CRIT_TARGET = 100;

// --- R1: boots slot ------------------------------------------------------

/** What a pair of boots primarily answers. */
export type BootsProperty =
  | 'armor'
  | 'magicResist'
  | 'magicPen'
  | 'abilityHaste'
  | 'attackSpeed'
  | 'mobility'
  | 'plain';

/** Ids whose property can't be read off `tags` (plain-tagged boots that still have an identity). */
const BOOTS_PROPERTY_OVERRIDES: Record<number, BootsProperty> = {
  3009: 'mobility', // Boots of Swiftness — tags are just ["Boots"]
};

/** Derive a boots item's property from its Community Dragon tags, else an override, else 'plain'. */
export function bootsPropertyOf(item: Item): BootsProperty {
  if (item.tags.includes('Armor')) return 'armor';
  if (item.tags.includes('SpellBlock') || item.tags.includes('MagicResist')) return 'magicResist';
  if (item.tags.includes('MagicPenetration')) return 'magicPen';
  if (item.tags.includes('CooldownReduction')) return 'abilityHaste';
  if (item.tags.includes('AttackSpeed')) return 'attackSpeed';
  return BOOTS_PROPERTY_OVERRIDES[item.id] ?? 'plain';
}

/**
 * Ordered boots-property preference per build direction. This is the seam
 * where Stage 1's future `damageType` / `itemStyle` will plug in — replace
 * the `BuildTag` key with the challenge's damage type once that data
 * exists. Behaviour is unchanged from the old flat id map: the first
 * property in each list resolves to the same boots item as before.
 */
const BOOTS_PREFERENCE_BY_TAG: Record<BuildTag, BootsProperty[]> = {
  AP: ['magicPen', 'abilityHaste'], //         -> Sorcerer's Shoes
  AD: ['attackSpeed', 'abilityHaste'], //      -> Berserker's Greaves
  AttackSpeed: ['attackSpeed'], //             -> Berserker's Greaves
  Crit: ['attackSpeed'], //                    -> Berserker's Greaves
  Lethality: ['abilityHaste', 'mobility'], //  -> Ionian Boots of Lucidity
  Tank: ['armor', 'magicResist'], //           -> Plated Steelcaps
  Bruiser: ['magicResist', 'armor'], //        -> Mercury's Treads
  Support: ['abilityHaste', 'mobility'], //    -> Ionian Boots of Lucidity
};

function pickBoots(items: Item[], tag: BuildTag): Item | undefined {
  const allBoots = items.filter((i) => i.tags.includes('Boots'));
  if (allBoots.length === 0) return undefined;

  for (const wanted of BOOTS_PREFERENCE_BY_TAG[tag]) {
    const match = allBoots.find((b) => bootsPropertyOf(b) === wanted);
    if (match) return match;
  }
  // Fall back to any non-plain boots, then plain Boots as the last resort.
  return (
    allBoots.find((b) => b.id !== PLAIN_BOOTS_ID && bootsPropertyOf(b) !== 'plain') ??
    allBoots.find((b) => b.id !== PLAIN_BOOTS_ID) ??
    allBoots.find((b) => b.id === PLAIN_BOOTS_ID)
  );
}

/** Structural signature tie-break (R3): core tier first, then how on-theme, then how "big". */
function pickSignature(candidates: Item[], tag: BuildTag, ctx?: ArchetypeContext): Item | undefined {
  if (candidates.length === 0) return undefined;
  // R6: pure-scaling stat-sticks can never be the signature. Only relax this
  // if the whole candidate pool is pure-scaling (nothing else to pick).
  const flat = candidates.filter((c) => !isPureScalingItem(c));
  const pool = flat.length > 0 ? flat : candidates;
  return [...pool].sort((a, b) => {
    const scoreDelta = scoreItemForTag(b, tag, ctx) - scoreItemForTag(a, tag, ctx);
    if (scoreDelta !== 0) return scoreDelta;
    const coreDelta =
      Number(classifyItemTier(b) === 'core') - Number(classifyItemTier(a) === 'core');
    if (coreDelta !== 0) return coreDelta;
    const overlapDelta = tagOverlapForTag(b, tag) - tagOverlapForTag(a, tag);
    if (overlapDelta !== 0) return overlapDelta;
    if (b.price !== a.price) return b.price - a.price;
    return a.name.localeCompare(b.name);
  })[0];
}

const givesArmor = (i: Item) => i.tags.includes('Armor');
const givesMR = (i: Item) => i.tags.includes('SpellBlock') || i.tags.includes('MagicResist');
const givesHealth = (i: Item) => i.tags.includes('Health');
/** "Pure" single-resistance: contributes exactly one of Armor / MR (Thornmail yes, Jak'Sho no). */
const isPureArmor = (i: Item) => givesArmor(i) && !givesMR(i);
const isPureMR = (i: Item) => givesMR(i) && !givesArmor(i);

/**
 * Fill up to `MAX_NON_BOOTS` non-boots slots from `ranked` (already
 * score-sorted), starting with the signature, applying R4 (resistance
 * balance) for Tank/Bruiser and R5 (crit threshold) for Crit.
 */
function fillCore(ranked: Item[], signature: Item | undefined, tag: BuildTag): Item[] {
  const chosen: Item[] = signature ? [signature] : [];
  const isDefensive = tag === 'Tank' || tag === 'Bruiser';
  const pool = ranked.filter((i) => i.id !== signature?.id);

  // R4: cap "pure Armor" and "pure MR" items at 2 each. Over-cap items are
  // deferred, not dropped — only pulled back in if the cap left the build
  // short of a full 5 non-boots (small item pool).
  const deferred: Item[] = [];
  for (const item of pool) {
    if (chosen.length >= MAX_NON_BOOTS) break;
    if (isDefensive) {
      const pureArmorCount = chosen.filter(isPureArmor).length;
      const pureMRCount = chosen.filter(isPureMR).length;
      if ((isPureArmor(item) && pureArmorCount >= 2) || (isPureMR(item) && pureMRCount >= 2)) {
        deferred.push(item);
        continue;
      }
    }
    chosen.push(item);
  }
  for (const item of deferred) {
    if (chosen.length >= MAX_NON_BOOTS) break;
    chosen.push(item);
  }

  return isDefensive
    ? enforceResistanceCoverage(chosen, pool, signature)
    : tag === 'Crit'
      ? enforceCritThreshold(chosen, pool, signature)
      : chosen;
}

/**
 * R4 coverage: the finished non-boots set should touch Armor, MR and
 * Health. If one is missing, swap the most-redundant non-signature item
 * for the best remaining candidate that provides the gap.
 */
function enforceResistanceCoverage(
  chosen: Item[],
  pool: Item[],
  signature: Item | undefined,
): Item[] {
  const result = [...chosen];
  const needs: { has: (i: Item) => boolean; label: string }[] = [
    { has: givesArmor, label: 'Armor' },
    { has: givesMR, label: 'MR' },
    { has: givesHealth, label: 'Health' },
  ];

  for (const need of needs) {
    if (result.some(need.has)) continue;
    const replacement = pool.find((p) => need.has(p) && !result.some((r) => r.id === p.id));
    if (!replacement) continue;
    // Drop the lowest-ranked swappable item (never the signature).
    const dropIndex = [...result]
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.id !== signature?.id)
      .pop()?.index;
    if (dropIndex === undefined) continue;
    result.splice(dropIndex, 1, replacement);
  }

  return result;
}

/**
 * R5: estimate crit% from crit-tagged items; while below the cap and slots
 * allow, swap the weakest non-crit core item for the best unused crit item.
 */
function enforceCritThreshold(chosen: Item[], pool: Item[], signature: Item | undefined): Item[] {
  const result = [...chosen];
  const isCrit = (i: Item) => i.tags.includes('CriticalStrike');
  const estCrit = () => result.filter(isCrit).length * CRIT_PER_ITEM;

  while (estCrit() < CRIT_TARGET) {
    const nextCrit = pool.find((p) => isCrit(p) && !result.some((r) => r.id === p.id));
    if (!nextCrit) break;
    const dropIndex = [...result]
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.id !== signature?.id && !isCrit(item))
      .pop()?.index;
    if (dropIndex === undefined) break; // nothing non-crit left to trade out
    result.splice(dropIndex, 1, nextCrit);
  }

  return result;
}

/**
 * R6: keep pure-scaling stat-sticks out of the first two non-boots slots by
 * pushing every pure-scaling item behind every flat-stat core item, order
 * otherwise preserved. The signature (slot 0) is already guaranteed
 * non-pure-scaling by pickSignature, so this only reorders slots 1..n.
 */
function deferPureScaling(core: Item[]): Item[] {
  if (core.length === 0) return core;
  const [head, ...rest] = core;
  const flat = rest.filter((i) => !isPureScalingItem(i));
  const scaling = rest.filter(isPureScalingItem);
  return [head, ...flat, ...scaling];
}

/**
 * Assemble the final, inventory-legal 6-item build for a direction:
 * `[signature, ...core, boots]`, at most 6 slots (1 boots + up to 5
 * non-boots). Returns fewer only when the item pool genuinely can't fill
 * it — never pads, never exceeds 6.
 *
 * With a Stage-3 `ctx.itemStyle`, signature + core come from the
 * archetype-gated pool first; if that pool can't fill 5 non-boots slots
 * the remainder is topped up from the un-gated ranking, so the build is
 * always complete. Without `ctx`, behaviour is exactly as before.
 */
export function assembleBuild(items: Item[], tag: BuildTag, ctx?: ArchetypeContext): BuildSlot[] {
  const base = recommendItemsForTag(items, tag); // completed, non-boots, support-filtered, score-sorted
  const gated = ctx?.itemStyle ? recommendItemsForTag(items, tag, ctx) : base;
  const ranked =
    ctx?.itemStyle && gated.length < MAX_NON_BOOTS + 1
      ? [...gated, ...base.filter((b) => !gated.some((g) => g.id === b.id))]
      : gated;

  const signature = pickSignature(ranked, tag, ctx);
  const core = deferPureScaling(fillCore(ranked, signature, tag).slice(0, MAX_NON_BOOTS));
  const boots = pickBoots(items, tag);

  const slots: BuildSlot[] = core.map((item) => ({
    item,
    role: item.id === signature?.id ? ('signature' as const) : ('core' as const),
  }));
  if (boots) slots.push({ item: boots, role: 'boots' });

  return slots.slice(0, MAX_BUILD_SIZE);
}
