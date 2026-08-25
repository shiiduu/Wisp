import type { Ability, Champion } from '@wisp/data/types';
import type { BuildTag } from './types';

export type LaneAbilityKey = 'Q' | 'W' | 'E';

/** Generic fallback order used when a tag has no meaningful ability-scaling signal. */
const FALLBACK_ORDER: LaneAbilityKey[] = ['Q', 'E', 'W'];

function scoreAbilityForTag(ability: Ability, tag: BuildTag): number {
  const has = (s: string) => ability.scaling.includes(s as never);
  switch (tag) {
    case 'AP':
      return has('magic') ? 2 : 0;
    case 'AD':
      return has('physical') ? 2 : 0;
    case 'Lethality':
      return (has('physical') ? 1 : 0) + (has('true') ? 2 : 0);
    case 'Tank':
      return has('tank') ? 2 : 0;
    case 'Support':
      return (has('heal') ? 2 : 0) + (has('shield') ? 2 : 0);
    case 'Bruiser':
      return (has('physical') ? 1 : 0) + (has('tank') ? 1 : 0);
    case 'AttackSpeed':
    case 'Crit':
      return 0;
  }
}

/**
 * Picks which of Q/W/E to max first/second/third for a build direction,
 * from the champion's real per-ability scaling signals. Some tags
 * (AttackSpeed, Crit) have no ability-scaling signal to key off at all, and
 * a champion's own kit may simply not lean any direction for the chosen
 * tag — in both cases every ability scores 0 and this falls back to a
 * generic Q > E > W order rather than pretending to know better.
 */
export function pickSkillPriority(champion: Champion, tag: BuildTag): LaneAbilityKey[] {
  const scored: { key: LaneAbilityKey; score: number }[] = (['Q', 'W', 'E'] as const).map((key) => ({
    key,
    score: scoreAbilityForTag(champion.abilities[key], tag),
  }));

  const total = scored.reduce((sum, s) => sum + s.score, 0);
  if (total === 0) return FALLBACK_ORDER;

  return scored.sort((a, b) => b.score - a.score).map((s) => s.key);
}
