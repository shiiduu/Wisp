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

export interface Item {
  id: number;
  name: string;
  /** Plain-text, tag-stripped short description. */
  description: string;
  /** Total gold cost (buy price). */
  price: number;
  /** Relative to this package's root, e.g. "assets/items/3089.png". */
  iconPath: string;
  /** True for a top-tier item with no further upgrade (no "into" build path). */
  isCompleted: boolean;
  /** Data Dragon's own item tags, e.g. ["SpellDamage", "Mana"] — raw, unmodified. */
  tags: string[];
  /** Data Dragon's build-tree depth (1 = basic component, higher = more built-up). Absent for untiered items (consumables, trinkets). */
  depth?: number;
  /** Item ids this is built from (components). Absent/empty for a basic component. */
  from?: number[];
  /** Item ids this upgrades into. Absent/empty = top-tier, no further upgrade. */
  into?: number[];
}

export interface ItemsFile {
  /** Data Dragon patch version this data was generated from (e.g. "16.16.1"). */
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
