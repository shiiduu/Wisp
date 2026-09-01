import type { Augment } from '@wisp/data/types';
import type { BuildTag } from './types';

/**
 * LIMITATION: real Arena/ARAM Mayhem augment filtering (matching an
 * augment's actual mechanical tags to a build direction) is a separate,
 * later task — Community Dragon's augment data doesn't expose structured
 * tags we can rely on. This is a mock/heuristic stand-in: it scores an
 * augment purely by keyword matches in its name + description against a
 * fixed word list per tag. Good enough to make the "best augments" panel
 * feel responsive to the chosen build direction; not a real classifier.
 */
const TAG_KEYWORDS: Record<BuildTag, string[]> = {
  AP: ['ability power', 'magic damage', 'ability haste', 'spell'],
  AD: ['attack damage', 'physical damage', 'bonus ad'],
  Tank: ['armor', 'health', 'magic resist', 'shield', 'tenacity', 'max health'],
  Bruiser: ['attack damage', 'health', 'omnivamp', 'lifesteal'],
  AttackSpeed: ['attack speed', 'attacks'],
  Crit: ['critical', 'crit'],
  Support: ['heal', 'ally', 'allies', 'shield', 'mana'],
  Lethality: ['lethality', 'armor penetration', 'execute', 'true damage'],
};

function keywordScore(augment: Augment, tag: BuildTag): number {
  const haystack = `${augment.name} ${augment.description}`.toLowerCase();
  return TAG_KEYWORDS[tag].reduce((n, kw) => (haystack.includes(kw) ? n + 1 : n), 0);
}

/** Ranks augments by keyword-match fit for a build tag, highest first. */
export function rankAugmentsForTag(augments: Augment[], tag: BuildTag): Augment[] {
  return [...augments]
    .map((augment) => ({ augment, score: keywordScore(augment, tag) }))
    .sort((a, b) => b.score - a.score)
    .map(({ augment }) => augment);
}

/** Picks the single best-fit augment for a tag, falling back to the first entry if nothing matches. */
export function pickBestAugmentForTag(augments: Augment[], tag: BuildTag): Augment {
  const ranked = rankAugmentsForTag(augments, tag);
  return ranked[0] ?? augments[0];
}

/**
 * Restricts an augment list to only those actually obtainable in ARAM
 * Mayhem (`validApiNames` from packages/data/aram-mayhem-augments.json —
 * see scripts/filter-aram-mayhem-augments.ts). augments.json itself is
 * Community Dragon's Arena pool, which is a superset/non-subset of
 * Mayhem's roster, so every augment consumer (random popup pool, "best
 * augment" recommendation) must apply this before ranking or sampling.
 */
export function filterAramMayhemAugments(augments: Augment[], validApiNames: string[]): Augment[] {
  const valid = new Set(validApiNames);
  return augments.filter((a) => valid.has(a.apiName));
}
