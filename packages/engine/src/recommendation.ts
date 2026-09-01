import type { Champion, Item, ItemStats } from '@wisp/data/types';
import { itemMatchesStyle, type ItemStyle } from './archetype';
import { classifyItemTier } from './itemTier';
import { BUILD_TAGS, type BuildTag, type TagScore } from './types';

type AbilitySlot = 'passive' | 'Q' | 'W' | 'E' | 'R';
const ABILITY_SLOTS: AbilitySlot[] = ['passive', 'Q', 'W', 'E', 'R'];

function countScaling(champion: Champion, signal: string): number {
  return ABILITY_SLOTS.reduce(
    (n, slot) => n + (champion.abilities[slot].scaling.includes(signal as never) ? 1 : 0),
    0,
  );
}

/**
 * Scores how well a champion's kit synergizes with ONE build direction —
 * every tag is scored for every champion (not just their typical role), so
 * a Cho'Gath still gets an AD/AttackSpeed/Crit score even though those are
 * clearly not his strength. Signals combine:
 *  - `info.{attack,defense,magic}` (Riot's own 0-10 role-fit ratings)
 *  - ability scaling signals (magic/physical/true/heal/shield/tank — see
 *    Champion type doc for why this, not numeric ratios, is what's available)
 *  - base stat growth (attackdamageperlevel, attackspeedperlevel, etc.)
 *  - champion tags (Fighter/Tank/Mage/Assassin/Marksman/Support) as a
 *    coarse role prior
 * This is Wisp's own heuristic, not a published formula — there isn't one.
 */
export function scoreChampionForTag(champion: Champion, tag: BuildTag): number {
  const { info, stats, tags } = champion;
  const has = (t: string) => tags.includes(t);

  switch (tag) {
    case 'AP':
      return countScaling(champion, 'magic') * 10 + info.magic * 3 + (has('Mage') ? 15 : 0);
    case 'AD':
      return (
        countScaling(champion, 'physical') * 10 +
        info.attack * 3 +
        (has('Marksman') ? 10 : 0) +
        (has('Fighter') ? 8 : 0) +
        stats.attackdamageperlevel * 1.5
      );
    case 'Tank':
      // A champion must earn a Tank score from something tank-specific — a
      // Tank/Fighter role tag, abilities that scale with resistances/health
      // (countScaling('tank')), or a genuinely high defensive profile —
      // NOT from base stat growth, which every champion has. Base bulk only
      // contributes the portion ABOVE roster-typical, and lightly:
      //   info.defense: mages ~2-4, bruisers ~5-7, tanks ~8-10 (only >4 counts)
      //   hpperlevel:   roster median ~104 (only >95 counts)
      //   armor+MR:     roster median ~61  (only >52 counts)
      return (
        (has('Tank') ? 26 : 0) +
        (has('Fighter') ? 8 : 0) +
        countScaling(champion, 'tank') * 12 +
        Math.max(0, info.defense - 4) * 7 +
        Math.max(0, stats.hpperlevel - 95) * 0.25 +
        Math.max(0, stats.armor + stats.spellblock - 52) * 0.35
      );
    case 'Bruiser':
      return (
        (info.attack + info.defense) * 2 +
        (has('Fighter') ? 15 : 0) +
        countScaling(champion, 'physical') * 5 +
        countScaling(champion, 'tank') * 3
      );
    case 'AttackSpeed':
      return (
        stats.attackspeedperlevel * 6 + (has('Marksman') ? 12 : 0) + countScaling(champion, 'physical') * 3
      );
    case 'Crit':
      // Was floored so low it never cleared pickTrollDirection's 0.5×top
      // cutoff for anyone — Crit could never be rolled. A crit build is an
      // auto-attack build: marksman prior + AD/attack-speed growth + how
      // physical the kit's damage is.
      return (
        (has('Marksman') ? 26 : 0) +
        (has('Fighter') ? 4 : 0) +
        countScaling(champion, 'physical') * 3 +
        stats.attackdamageperlevel * 2 +
        stats.attackspeedperlevel * 4
      );
    case 'Support':
      return (
        (has('Support') ? 20 : 0) +
        countScaling(champion, 'heal') * 10 +
        countScaling(champion, 'shield') * 10 +
        (10 - info.attack) * 1
      );
    case 'Lethality':
      return (
        (has('Assassin') ? 20 : 0) +
        countScaling(champion, 'physical') * 6 +
        countScaling(champion, 'true') * 8 +
        info.attack * 2
      );
  }
}

/** Scores a champion against every build tag, ranked highest first. */
export function scoreAllTags(champion: Champion): TagScore[] {
  return BUILD_TAGS.map((tag) => ({ tag, score: scoreChampionForTag(champion, tag) })).sort(
    (a, b) => b.score - a.score,
  );
}

export interface PickTrollDirectionOptions {
  /**
   * Any tag scoring at least (topScore * this) counts as one of the
   * champion's *real* roles and is removed from the troll pool — not just
   * the literal #1. Handles champions with 2+ genuine directions (e.g. a
   * viable Tank AND Bruiser). Default 0.65.
   */
  realRoleThreshold?: number;
  /**
   * Directions scoring below (topScore * this) are dropped as absurd — but
   * only while that still leaves something to roll. Low bar: a troll build
   * should be a bad fit, just not literally nonsensical. Default 0.25.
   */
  coherenceFloor?: number;
  /** Injectable RNG for deterministic tests. Default Math.random. */
  rng?: () => number;
}

/**
 * Weighted-random pick of the "troll build direction" for a champion.
 *
 * 1. Identify the champion's real role(s): every tag within
 *    `realRoleThreshold` of the top score. Remove them all — the point of
 *    a troll build is to avoid what the champion is actually good at, and
 *    a champion can have more than one genuine direction.
 * 2. Drop the absurd tail (below `coherenceFloor` of the top) if anything
 *    survives it.
 * 3. Weighted-random pick over what's left, weight = score — a
 *    less-terrible troll direction is favoured but every remaining
 *    direction stays possible (a troll build is *meant* to be a bad fit).
 *
 * Only falls back toward a real role for the degenerate case of a
 * champion whose every direction scores within `realRoleThreshold` of the
 * top — then it still avoids the literal #1.
 */
export function pickTrollDirection(
  scores: TagScore[],
  {
    realRoleThreshold = 0.65,
    coherenceFloor = 0.25,
    rng = Math.random,
  }: PickTrollDirectionOptions = {},
): TagScore {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const top = sorted[0];

  const offRole = sorted.filter((s) => s.score < top.score * realRoleThreshold);
  const coherent = offRole.filter((s) => s.score >= top.score * coherenceFloor);
  const nonTop = sorted.filter((s) => s.tag !== top.tag);
  const pool =
    coherent.length > 0 ? coherent : offRole.length > 0 ? offRole : nonTop.length > 0 ? nonTop : sorted.slice(0, 1);

  const total = pool.reduce((sum, s) => sum + Math.max(s.score, 0), 0);
  if (total <= 0) return pool[0];

  let r = rng() * total;
  for (const entry of pool) {
    r -= Math.max(entry.score, 0);
    if (r <= 0) return entry;
  }
  return pool[pool.length - 1];
}

// --- Item recommendation ----------------------------------------------------

const TAG_TO_ITEM_TAGS: Record<BuildTag, string[]> = {
  AP: ['SpellDamage'],
  AD: ['Damage'],
  Tank: ['Health', 'Armor', 'SpellBlock'],
  Bruiser: ['Damage', 'Health', 'Armor'],
  AttackSpeed: ['AttackSpeed', 'OnHit'],
  Crit: ['CriticalStrike'],
  Support: ['GoldPer', 'Aura', 'HealthRegen'],
  Lethality: ['Lethality', 'ArmorPenetration'],
};

const TIER_WEIGHT: Record<string, number> = {
  core: 3,
  penetration: 2.5,
  situational: 1,
  component: 0,
  starter: 0,
  boots: 0,
  consumable: 0,
};

/**
 * Optional Stage-3 archetype context. Purely ADDITIVE — when omitted (every
 * current call site), scoreItemForTag / recommendItemsForTag behave exactly
 * as before.
 *  - `itemStyle`: hard-gates candidates to those tagged with this style in
 *    ITEM_ARCHETYPE_TAGS (non-matching -> score 0 -> filtered out).
 *  - `statProfile`: stat weights (e.g. { abilityPower: 0.7, health: 0.3 }),
 *    added as a small sub-tier tie-break bonus between matching candidates.
 */
export interface ArchetypeContext {
  itemStyle?: ItemStyle;
  statProfile?: Partial<Record<keyof ItemStats, number>>;
}

/** Small tie-break only: weights ~0..1, stats ~10..1000, scaled so it never crosses a tier step (~10+). */
const STAT_PROFILE_SCALE = 0.01;

function statProfileBonus(item: Item, profile: Partial<Record<keyof ItemStats, number>>): number {
  if (!item.stats) return 0;
  let sum = 0;
  for (const [key, weight] of Object.entries(profile)) {
    const value = item.stats[key as keyof ItemStats];
    if (value && weight) sum += value * weight;
  }
  return sum * STAT_PROFILE_SCALE;
}

export function scoreItemForTag(item: Item, tag: BuildTag, ctx?: ArchetypeContext): number {
  if (ctx?.itemStyle && !itemMatchesStyle(item, ctx.itemStyle)) return 0;

  const wantedTags = TAG_TO_ITEM_TAGS[tag];
  const overlap = item.tags.filter((t) => wantedTags.includes(t)).length;
  if (overlap === 0) return 0;
  const tier = classifyItemTier(item);
  const base = overlap * 10 * (TIER_WEIGHT[tier] ?? 0);

  return ctx?.statProfile ? base + statProfileBonus(item, ctx.statProfile) : base;
}

/** How many of the tag's wanted item-tags this item carries — used as a tie-break "on-theme-ness" signal. */
export function tagOverlapForTag(item: Item, tag: BuildTag): number {
  const wantedTags = TAG_TO_ITEM_TAGS[tag];
  return item.tags.filter((t) => wantedTags.includes(t)).length;
}

/**
 * Component ids every enchanter/support item is built up from — Forbidden
 * Idol and Bandleglass Mirror. Nothing outside the support class builds
 * from these (verified against the full Community Dragon item set), so
 * build-tree ancestry is a reliable, data-driven support signal.
 */
const SUPPORT_ROOT_COMPONENT_IDS = new Set([3114, 4642]);

/**
 * Support items that carry NO distinguishing field in the item data: their
 * `tags` read exactly like a tank item (Health/Armor/SpellBlock/AbilityHaste)
 * and their ally-buff passives aren't reflected in tags or build tree.
 * Community/Data Dragon simply don't classify them, so these few ids are
 * hard-coded.
 *
 * FRAGILE POINT — revisit if this recurs: this list has needed correction
 * more than once because item ids/names/shapes shift between patches and
 * data-source migrations. Prefer extending the data-driven checks in
 * isSupportItemization (root-component ancestry, GoldPer+Lane) over
 * growing this list. Verify every id against the CURRENT items.json when
 * touching it.
 */
const EXPLICIT_SUPPORT_ITEM_IDS = new Set([
  2524, // Bandlepipes
  3050, // Zeke's Convergence
  3109, // Knight's Vow
  3190, // Locket of the Iron Solari
]);

/**
 * Is this a support-itemization item (should not appear in a non-Support
 * build direction)? Data-driven where the data allows it:
 *  1. Gold-income line — carries BOTH `GoldPer` and `Lane` tags. (Damage
 *     items with a gold-on-takedown passive, e.g. Stormsurge, have
 *     `GoldPer` only, so requiring `Lane` too keeps them out.)
 *  2. Enchanter line — transitively built from a SUPPORT_ROOT_COMPONENT_ID.
 *  3. A short hard-coded id set for items the data doesn't classify at all.
 */
export function isSupportItemization(item: Item, itemsById: Map<number, Item>): boolean {
  if (EXPLICIT_SUPPORT_ITEM_IDS.has(item.id)) return true;
  if (item.tags.includes('GoldPer') && item.tags.includes('Lane')) return true;

  const seen = new Set<number>();
  const stack = [...(item.from ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (SUPPORT_ROOT_COMPONENT_IDS.has(id)) return true;
    const component = itemsById.get(id);
    if (component?.from) stack.push(...component.from);
  }
  return false;
}

/**
 * Ranks completed (non-boots, non-consumable) items by fit for a build tag.
 * The fetch script's `id < 100000` filter drops the per-mode ID-namespace
 * copies (663039 "Atma's Reckoning" etc.), but Riot still occasionally
 * lists two real ids for the same item — dedupe by name, keeping the
 * highest-scoring variant, so the same item never appears twice.
 *
 * Support-itemization items (enchanter line, gold-income line, wardens) are
 * excluded for every direction EXCEPT `Support` — see isSupportItemization.
 *
 * `ctx` is optional Stage-3 archetype context (see ArchetypeContext). When
 * omitted, output is identical to before this hook existed.
 */
export function recommendItemsForTag(items: Item[], tag: BuildTag, ctx?: ArchetypeContext): Item[] {
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const scored = items
    .map((item) => ({ item, score: scoreItemForTag(item, tag, ctx) }))
    .filter(({ item, score }) => score > 0 && classifyItemTier(item) !== 'component')
    .filter(({ item }) => item.isCompleted)
    .filter(({ item }) => tag === 'Support' || !isSupportItemization(item, itemsById))
    // Lane-phase starters (Doran's / Guardian's items) keep their ItemStyle
    // tags for data completeness, but a core-identity (itemStyle-gated)
    // query must never surface them. The bare tag-only path is unchanged.
    .filter(({ item }) => !ctx?.itemStyle || classifyItemTier(item) !== 'starter')
    .sort((a, b) => b.score - a.score);

  const seenNames = new Set<string>();
  const deduped: Item[] = [];
  for (const { item } of scored) {
    if (seenNames.has(item.name)) continue;
    seenNames.add(item.name);
    deduped.push(item);
  }
  return deduped;
}

// --- ItemStyle resolution (Stage 3 integration) --------------------------

/**
 * Resolve the finer ItemStyle for a champion within a chosen BuildTag.
 *
 * Direction -> ItemStyle is 1:many for AP/AD/Tank/Bruiser and ~1:1 for the
 * rest. For the 1:1 tags we just map. For the fan-out tags we pick with a
 * small heuristic over the same signals pickTrollDirection already uses —
 * per-ability scaling counts (`Champion.abilities.*.scaling`), role tags,
 * and Riot's `info` ratings. Deliberately coarse (there is no ground truth
 * for "is this kit burst or DoT"); `artillery-caster` is never auto-picked
 * because the ARAM pool has a single artillery item.
 */
export function resolveItemStyle(champion: Champion, tag: BuildTag): ItemStyle {
  const has = (t: string) => champion.tags.includes(t);
  const magic = countScaling(champion, 'magic');
  const physical = countScaling(champion, 'physical');
  const sustain = countScaling(champion, 'heal') + countScaling(champion, 'shield');
  const tanky = countScaling(champion, 'tank');
  const { info } = champion;

  switch (tag) {
    case 'AttackSpeed':
      return 'on-hit';
    case 'Crit':
      return 'crit-marksman';
    case 'Lethality':
      return 'lethality';
    case 'Support':
      return 'enchanter';

    case 'AP': {
      // The split the data can actually support is durability, not
      // "burst vs DoT" (no over-time signal exists in ability scaling):
      //  - durable / drain-tanky kit            -> ap-bruiser
      //  - squishy but with a self-heal signal  -> dot-caster (attrition mage)
      //  - everything else                      -> burst-caster (default)
      if (has('Fighter') || has('Tank') || tanky > 0 || info.defense >= 6) return 'ap-bruiser';
      if (sustain >= 2 && magic >= 2) return 'ap-bruiser';
      if (sustain >= 2 && !has('Assassin')) return 'dot-caster';
      return 'burst-caster';
    }

    case 'AD': {
      // Ability-damage-heavy kits (Ezreal, Corki, …) -> ad-caster;
      // auto-attack carries -> on-hit (the default).
      if (physical >= 3 && info.attack < 9) return 'ad-caster';
      return 'on-hit';
    }

    case 'Tank': {
      // aura-tank is the ally-buffing / warding line (Locket, Knight's Vow,
      // Zeke's). Only a genuine enchanter-tank earns it — a Support tag
      // backed by a real heal/shield, or a heavily heal/shield kit.
      // Everything else (bruisers, mages, pure tanks turned tanky) ->
      // warden-tank, the correct default.
      if ((has('Support') && sustain > 0) || sustain >= 2) return 'aura-tank';
      return 'warden-tank';
    }

    case 'Bruiser': {
      // Low-mobility stat-stackers -> juggernaut; skirmishers -> bruiser.
      if (has('Fighter') && info.defense >= 6 && physical <= 1) return 'juggernaut';
      return 'bruiser';
    }
  }
}
