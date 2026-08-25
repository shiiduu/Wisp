import type { Augment, Champion, Item } from '@wisp/data/types';
import { pickBestAugmentForTag, rankAugmentsForTag } from './augment-matcher';
import { recommendItemsForTag } from './recommendation';
import { pickSkillPriority, type LaneAbilityKey } from './skillOrder';
import type { BuildTag } from './types';

const CHALLENGE_SUBTITLES: Record<BuildTag, string> = {
  AP: 'Full magic damage, zero shame',
  AD: 'Sharpen everything, cast nothing',
  Tank: 'Stack armor, forget you have a Q',
  Bruiser: 'Numbers go up, so do you',
  AttackSpeed: 'Click faster than you think',
  Crit: 'Feast or famine, mostly famine',
  Support: 'Peel for everyone but yourself',
  Lethality: 'One shot, zero patience',
};

export interface ShopItemPlan {
  item: Item;
  recommended: boolean;
}

export interface BuildPlan {
  championId: string;
  championName: string;
  tag: BuildTag;
  challengeTitle: string;
  challengeSubtitle: string;
  ownedItems: Item[];
  shopItems: ShopItemPlan[];
  featuredAugment: Augment;
  otherAugmentNames: string[];
  skillPriority: LaneAbilityKey[];
}

/**
 * Builds the full "troll build" recommendation for one champion + chosen
 * tag — pure function, no UI/state. Both apps/select (to preview the pick)
 * and apps/mockup (to render it) call this with the same inputs and get
 * the same output, so the tag chosen on the select page is exactly what
 * the mockup shows (the only randomness — which tag — already happened in
 * pickTrollDirection and is passed in here as a fixed value).
 */
export function buildPlan(champion: Champion, tag: BuildTag, items: Item[], augments: Augment[]): BuildPlan {
  const ranked = recommendItemsForTag(items, tag);
  const half = Math.min(6, Math.ceil(ranked.length / 2));
  const ownedItems = ranked.slice(0, half);
  const shopCandidates = ranked.slice(half, half + 6);
  const shopItems: ShopItemPlan[] = shopCandidates.map((item, i) => ({ item, recommended: i < 2 }));

  const rankedAugments = rankAugmentsForTag(augments, tag);
  const featuredAugment = pickBestAugmentForTag(augments, tag);
  const otherAugmentNames = rankedAugments
    .filter((a) => a.apiName !== featuredAugment.apiName)
    .slice(0, 2)
    .map((a) => a.name);

  return {
    championId: champion.id,
    championName: champion.name,
    tag,
    challengeTitle: `${tag} ${champion.name}`,
    challengeSubtitle: CHALLENGE_SUBTITLES[tag],
    ownedItems,
    shopItems,
    featuredAugment,
    otherAugmentNames,
    skillPriority: pickSkillPriority(champion, tag),
  };
}
