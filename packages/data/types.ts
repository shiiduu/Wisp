export type AugmentRarity = 'silver' | 'gold' | 'prismatic' | 'unknown';

export interface Augment {
  id: number;
  apiName: string;
  name: string;
  /** Plain-text, tag-stripped short description (no stat/formula placeholders resolved). */
  description: string;
  rarity: AugmentRarity;
  /** Relative to this package's root, e.g. "assets/augments/typhoon.png". */
  iconPath: string;
}

export interface AugmentsFile {
  /** Community Dragon patch version this data was generated from (e.g. "15.16" or "latest"). */
  source: string;
  generatedAt: string;
  augments: Augment[];
}

/**
 * Output of scripts/filter-aram-mayhem-augments.ts: the subset of
 * AugmentsFile's apiNames that are actually obtainable in ARAM Mayhem,
 * cross-referenced against the League of Legends Wiki's maintained
 * Module:MayhemAugmentData/data. Arena and ARAM Mayhem have different
 * augment rosters, so this is a strict subset — see the script's header
 * comment for why and how the match was verified.
 */
export interface AramMayhemAugmentsFile {
  /** URL of the wiki module this was generated from. */
  source: string;
  generatedAt: string;
  validApiNames: string[];
}

/**
 * Numeric stat block parsed from the leading stat line of an item's
 * description (e.g. "350 Health 45 Armor ..." -> { health: 350, armor: 45 }).
 * Best-effort — see parseItemStats in fetch-items.ts. Percentage stats
 * (attackSpeed, critChance, lifeSteal, …) are stored as the number, e.g.
 * `attackSpeed: 25` means +25%. Absent when the description has no
 * parseable stat prefix.
 */
export interface ItemStats {
  abilityPower?: number;
  attackDamage?: number;
  health?: number;
  armor?: number;
  magicResist?: number;
  attackSpeed?: number;
  abilityHaste?: number;
  critChance?: number;
  critDamage?: number;
  lifeSteal?: number;
  omnivamp?: number;
  moveSpeed?: number;
  magicPen?: number;
  lethality?: number;
  mana?: number;
  tenacity?: number;
  healShieldPower?: number;
}

export interface Item {
  id: number;
  name: string;
  /** Plain-text, tag-stripped short description. */
  description: string;
  /** Parsed numeric stats from the description's stat prefix (optional — absent when unparseable). */
  stats?: ItemStats;
  /** Total gold cost (buy price). */
  price: number;
  /** Relative to this package's root, e.g. "assets/items/3089.png". */
  iconPath: string;
  /** True for a top-tier item with no further upgrade (no "into" build path). */
  isCompleted: boolean;
  /** Item tags/categories, e.g. ["SpellDamage", "Mana"] — raw from Community Dragon's `categories` (same vocabulary as Data Dragon's `tags`). */
  tags: string[];
  /** Build-tree depth (1 = basic component, higher = more built-up), reconstructed from the `from` chain. */
  depth?: number;
  /** Item ids this is built from (components). Absent/empty for a basic component. */
  from?: number[];
  /** Item ids this upgrades into. Absent/empty = top-tier, no further upgrade. */
  into?: number[];
}

export interface ItemsFile {
  /**
   * Where this data was generated from. Items are sourced from Community
   * Dragon (`latest`), cross-referenced against a Data Dragon patch for
   * map legality — e.g. "cdragon-latest (data) + ddragon-16.17.1 (map 12
   * legality)". See packages/data/scripts/fetch-items.ts.
   */
  source: string;
  generatedAt: string;
  items: Item[];
}

// --- Champions -------------------------------------------------------------

export interface ChampionInfo {
  attack: number;
  defense: number;
  magic: number;
  difficulty: number;
}

export interface ChampionStats {
  hp: number;
  hpperlevel: number;
  mp: number;
  mpperlevel: number;
  armor: number;
  armorperlevel: number;
  spellblock: number;
  spellblockperlevel: number;
  attackdamage: number;
  attackdamageperlevel: number;
  attackspeed: number;
  attackspeedperlevel: number;
}

/**
 * Data Dragon's `vars`/`effect` scaling arrays are empty for every champion
 * under the current tooltip format (verified live — see CLAUDE.md) — Riot
 * no longer exposes numeric AP/AD ratios through this API at all, only
 * through the (manually maintained) wiki. The only scaling signal left is
 * the semantic markup Riot embeds in the tooltip text itself
 * (`<magicDamage>`, `<physicalDamage>`, etc.), which this classifies into.
 * Reliable for damage TYPE (spot-checked against the wiki, exact match on
 * 3 champions), not for exact percentages.
 */
export type AbilityScalingSignal =
  | 'magic'
  | 'physical'
  | 'true'
  | 'heal'
  | 'shield'
  | 'tank'
  | 'none';

export interface Ability {
  id: string;
  name: string;
  /** Plain-text, tag-stripped short description. */
  description: string;
  maxRank: number;
  cooldown: number[];
  cost: number[];
  scaling: AbilityScalingSignal[];
}

export interface ChampionAbilities {
  passive: Pick<Ability, 'name' | 'description' | 'scaling'>;
  Q: Ability;
  W: Ability;
  E: Ability;
  R: Ability;
}

export interface Champion {
  id: string;
  key: number;
  name: string;
  title: string;
  tags: string[];
  partype: string;
  info: ChampionInfo;
  stats: ChampionStats;
  abilities: ChampionAbilities;
  /** Relative to this package's root, e.g. "assets/champions/Chogath.png". */
  iconPath: string;
}

/**
 * Lightweight per-champion entry for the champions.json index — enough to
 * render a picker grid and look up an id, without every consumer having to
 * pull in all 173 champions' full stats/ability data (which is what
 * actually needs scoring, and is only ever needed for ONE champion at a
 * time — see champions/<id>.json, loaded lazily by the apps that need it).
 */
export type ChampionSummary = Pick<Champion, 'id' | 'key' | 'name' | 'title' | 'tags' | 'info' | 'iconPath'>;

export interface ChampionsFile {
  /** Data Dragon patch version this data was generated from (e.g. "16.16.1"). */
  source: string;
  generatedAt: string;
  champions: ChampionSummary[];
}

// --- Challenges (6-stage architecture, Stage 1) --------------------------

/**
 * Stat vocabulary a challenge can prioritize / tolerate. Deliberately
 * coarse — these are build-direction stats, not exact item stat lines.
 */
export type Stat =
  | 'AP'
  | 'AD'
  | 'HP'
  | 'Armor'
  | 'MR'
  | 'AttackSpeed'
  | 'Crit'
  | 'AbilityHaste'
  | 'Lethality'
  | 'ArmorPen'
  | 'MagicPen'
  | 'Mana'
  | 'MoveSpeed';

export type ChallengeDamageType = 'AP' | 'AD' | 'mixed';

/**
 * A troll-challenge definition: the authored bridge from "what challenge
 * was rolled" to "what build the engine should steer toward". This is the
 * Stage-1 skeleton — an 8-row 1:1 formalization of the build directions
 * that already exist implicitly (CHALLENGE_SUBTITLES + TAG_TO_ITEM_TAGS in
 * @wisp/engine). NOT yet consumed by buildPlan/apps; the finer named-
 * challenge list and the real `itemStyle` vocabulary are later passes.
 */
export interface Challenge {
  /** Stable slug, e.g. "ap", "attack-speed". */
  id: string;
  /** Must be one of @wisp/engine's BUILD_TAGS (kept as a string here to avoid a data->engine dependency; the validator enforces the match). */
  direction: string;
  /**
   * Item-archetype tag (DoT-caster, burst-caster, on-hit, …). PLACEHOLDER:
   * the real closed vocabulary is Stage 3 work — treat these values as
   * provisional until then.
   */
  itemStyle: string;
  damageType: ChallengeDamageType;
  /** Ordered — most build-defining stat first. */
  primaryStatPriority: Stat[];
  /** Off-archetype stats still considered acceptable, with a 0..1 tolerance weight (e.g. AP build still wants some HP). */
  secondaryStatAllowance: Partial<Record<Stat, number>>;
  /** Flavor line shown under the challenge title — seeded from CHALLENGE_SUBTITLES. */
  subtitle: string;
}

export interface ChallengesFile {
  challenges: Challenge[];
}
