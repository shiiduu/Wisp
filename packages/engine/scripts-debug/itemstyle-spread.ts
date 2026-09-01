/**
 * THROWAWAY DIAGNOSTIC — safe to delete after use.
 *
 * For every ItemStyle: measure the candidate-pool score spread (root cause
 * (c) test) and the post-Step-1 Test-B distinct-build count.
 *
 * Run from repo root:
 *   node_modules/.pnpm/node_modules/.bin/tsx packages/engine/scripts-debug/itemstyle-spread.ts
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Augment, Champion, Item } from '@wisp/data/types';
import {
  scoreAllTags,
  resolveItemStyle,
  recommendItemsForTag,
  scoreItemForTag,
  deriveStatProfile,
  buildPlan,
  ITEM_STYLES,
  BUILD_TAGS,
  type BuildTag,
  type ItemStyle,
} from '../src/index';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '../../data');
const items: Item[] = JSON.parse(readFileSync(join(DATA, 'items.json'), 'utf8')).items;
const augments: Augment[] = JSON.parse(readFileSync(join(DATA, 'augments.json'), 'utf8')).augments;
const champDir = join(DATA, 'champions');
const champions: Champion[] = readdirSync(champDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(champDir, f), 'utf8')));

// primary parent BuildTag per ItemStyle (on-hit also reachable from AD)
const STYLE_PARENT: Record<ItemStyle, BuildTag> = {
  'burst-caster': 'AP',
  'dot-caster': 'AP',
  'artillery-caster': 'AP',
  'ap-bruiser': 'AP',
  'on-hit': 'AttackSpeed',
  'crit-marksman': 'Crit',
  lethality: 'Lethality',
  'ad-caster': 'AD',
  bruiser: 'Bruiser',
  juggernaut: 'Bruiser',
  'warden-tank': 'Tank',
  'aura-tank': 'Tank',
  enchanter: 'Support',
};

function canRoll(champion: Champion, tag: BuildTag): boolean {
  const sorted = scoreAllTags(champion);
  const top = sorted[0];
  const offRole = sorted.filter((s) => s.score < top.score * 0.65);
  const coherent = offRole.filter((s) => s.score >= top.score * 0.25);
  const nonTop = sorted.filter((s) => s.tag !== top.tag);
  const pool = coherent.length > 0 ? coherent : offRole.length > 0 ? offRole : nonTop.length > 0 ? nonTop : sorted.slice(0, 1);
  return pool.some((s) => s.tag === tag);
}

// champions that actually resolve to each ItemStyle, grouped
const byStyle = new Map<ItemStyle, Champion[]>();
for (const s of ITEM_STYLES) byStyle.set(s, []);
for (const c of champions) {
  for (const tag of BUILD_TAGS) {
    if (!canRoll(c, tag)) continue;
    byStyle.get(resolveItemStyle(c, tag))!.push(c);
  }
}

const uniq = <T,>(a: T[]) => [...new Set(a)];
const round = (n: number) => Math.round(n * 100) / 100;

console.log('# ItemStyle score-spread + Test-B diagnostic (post Step 1, pre Step 2)\n');

for (const style of ITEM_STYLES) {
  const parent = STYLE_PARENT[style];
  const eligible = uniq(byStyle.get(style)!);
  const pool = recommendItemsForTag(items, parent, { itemStyle: style });

  // root cause (c): base score spread with NO statProfile
  const baseScores = pool.map((i) => scoreItemForTag(i, parent, { itemStyle: style }));
  const distinctBase = uniq(baseScores.map(round)).sort((a, b) => a - b);

  // with a sample champion's statProfile — does the profile move anything?
  const sampleChamp = eligible[0];
  const withProfile = sampleChamp
    ? pool.map((i) => round(scoreItemForTag(i, parent, { itemStyle: style, statProfile: deriveStatProfile(sampleChamp) })))
    : [];
  const distinctProfile = uniq(withProfile);

  // Test B: up to 10 eligible champions, forced parent tag, real buildPlan path
  const sample = eligible.slice(0, 10);
  const builds = sample.map((c) =>
    buildPlan(c, parent, items, augments)
      .build.map((s) => `${s.role}:${s.item.id}`)
      .join('|'),
  );
  const distinctBuilds = uniq(builds).length;

  console.log(
    `## ${style}  (parent ${parent})\n` +
      `   eligible champions resolving here: ${eligible.length}\n` +
      `   candidate pool size:               ${pool.length}\n` +
      `   BASE distinct scores:              ${distinctBase.length}  min ${round(Math.min(...baseScores))} / max ${round(Math.max(...baseScores))}\n` +
      `   +statProfile distinct scores:      ${distinctProfile.length}\n` +
      `   Test B distinct builds:            ${distinctBuilds} / ${sample.length}`,
  );
  // show which champions diverge onto which build
  const seen = new Map<string, string[]>();
  sample.forEach((c, i) => {
    const arr = seen.get(builds[i]) ?? [];
    arr.push(c.id);
    seen.set(builds[i], arr);
  });
  for (const [b, champs] of seen) {
    const names = b
      .split('|')
      .filter((s) => !s.startsWith('boots'))
      .map((s) => items.find((it) => it.id === Number(s.split(':')[1]))?.name)
      .join(', ');
    console.log(`     [${champs.join(', ')}] -> ${names}`);
  }
  console.log();
}
