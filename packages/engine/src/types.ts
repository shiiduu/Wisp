/** Fixed set of "build direction" tags Wisp can steer a troll build toward. */
export const BUILD_TAGS = [
  'AD',
  'AP',
  'Tank',
  'Bruiser',
  'AttackSpeed',
  'Crit',
  'Support',
  'Lethality',
] as const;

export type BuildTag = (typeof BUILD_TAGS)[number];

export interface TagScore {
  tag: BuildTag;
  score: number;
}

export type ItemTier = 'consumable' | 'boots' | 'starter' | 'component' | 'penetration' | 'core' | 'situational';
