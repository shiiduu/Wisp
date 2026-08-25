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
}

export interface ItemsFile {
  /** Data Dragon patch version this data was generated from (e.g. "16.16.1"). */
  source: string;
  generatedAt: string;
  items: Item[];
}
