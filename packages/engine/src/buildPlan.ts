import type { Augment, Champion, Item } from '@wisp/data/types';
import type { ItemStyle } from './archetype';
import { pickBestAugmentForTag, rankAugmentsForTag } from './augment-matcher';
import { assembleBuild, type BuildSlot } from './buildShape';
import { resolveItemStyle } from './recommendation';
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

export interface BuildPlan {
  championId: string;
  championName: string;
  tag: BuildTag;
  /** Finer archetype axis within `tag`, resolved from the champion's kit (see resolveItemStyle). */
  itemStyle: ItemStyle;
  challengeTitle: string;
  challengeSubtitle: string;
  /**
   * The real, inventory-legal recommended build: at most 6 slots
   * (1 boots + up to 5 non-boots, one of which is the signature). This is
   * the whole build, not a candidate pool for the UI to trim — see
   * assembleBuild for the shape rules.
   */
  build: BuildSlot[];
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
 *
 * `itemStyle` (the finer archetype axis) is resolved from the champion's
 * kit by default; apps/select passes its own resolved value forward via
 * the URL so the preview and the mockup can't disagree — same pattern as
 * `tag`.
 */
export function buildPlan(
  champion: Champion,
  tag: BuildTag,
  items: Item[],
  augments: Augment[],
  itemStyle: ItemStyle = resolveItemStyle(champion, tag),
): BuildPlan {
  const build = assembleBuild(items, tag, { itemStyle });

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
    itemStyle,
    challengeTitle: `${tag} ${champion.name}`,
    challengeSubtitle: CHALLENGE_SUBTITLES[tag],
    build,
    featuredAugment,
    otherAugmentNames,
    skillPriority: pickSkillPriority(champion, tag),
  };
}
