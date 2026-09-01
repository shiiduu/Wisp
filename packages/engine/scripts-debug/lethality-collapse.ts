/**
 * THROWAWAY DIAGNOSTIC — safe to delete after use.
 *
 * Verifies empirically whether Stage-3 item selection collapses to a single
 * item set for BuildTag = "Lethality" regardless of champion scaling.
 *
 * Run from repo root:
 *   node_modules/.pnpm/node_modules/.bin/tsx packages/engine/scripts-debug/lethality-collapse.ts
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Champion, Item } from '@wisp/data/types';
import {
  scoreAllTags,
  resolveItemStyle,
  recommendItemsForTag,
  scoreItemForTag,
  assembleBuild,
  deriveStatProfile,
  itemStylesOf,
  BUILD_TAGS,
  type BuildTag,
} from '../src/index';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '../../data');

const items: Item[] = JSON.parse(readFileSync(join(DATA, 'items.json'), 'utf8')).items;
const champDir = join(DATA, 'champions');
const champions: Champion[] = readdirSync(champDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(champDir, f), 'utf8')));

const TAG: BuildTag = 'Lethality';

// --- Replicate pickTrollDirection's pool logic to test eligibility ----------
// (defaults: realRoleThreshold 0.65, coherenceFloor 0.25)
function canRoll(champion: Champion, tag: BuildTag): boolean {
  const sorted = scoreAllTags(champion); // already sorted desc
  const top = sorted[0];
  const offRole = sorted.filter((s) => s.score < top.score * 0.65);
  const coherent = offRole.filter((s) => s.score >= top.score * 0.25);
  const nonTop = sorted.filter((s) => s.tag !== top.tag);
  const pool = coherent.length > 0 ? coherent : offRole.length > 0 ? offRole : nonTop.length > 0 ? nonTop : sorted.slice(0, 1);
  return pool.some((s) => s.tag === tag);
}

const eligible = champions.filter((c) => canRoll(c, TAG));

// --- scaling-profile fingerprint (what a "real" Stage 3 would key off) ------
type Slot = 'passive' | 'Q' | 'W' | 'E' | 'R';
const SLOTS: Slot[] = ['passive', 'Q', 'W', 'E', 'R'];
const countScaling = (c: Champion, sig: string) =>
  SLOTS.reduce((n, s) => n + ((c.abilities[s].scaling as string[]).includes(sig) ? 1 : 0), 0);
function profile(c: Champion) {
  return {
    tags: c.tags.join('/'),
    atk: c.info.attack,
    phys: countScaling(c, 'physical'),
    magic: countScaling(c, 'magic'),
    true: countScaling(c, 'true'),
    adPerLvl: c.stats.attackdamageperlevel,
    asPerLvl: c.stats.attackspeedperlevel,
  };
}

// --- run the real pipeline for one champion --------------------------------
function runPipeline(c: Champion) {
  const itemStyle = resolveItemStyle(c, TAG);
  // exactly what buildPlan() now passes (STEP 1 fix): itemStyle + statProfile
  const build = assembleBuild(items, TAG, { itemStyle, statProfile: deriveStatProfile(c) });
  const slots = build.map((s) => `${s.item.name}${s.role === 'signature' ? ' *SIG*' : s.role === 'boots' ? ' (boots)' : ''}`);
  const signature = build.find((s) => s.role === 'signature')?.item.name ?? '(none)';
  return { itemStyle, signature, slots, key: slots.join(' | ') };
}

// ==========================================================================
console.log('# Lethality Stage-3 collapse — empirical diagnostic\n');
console.log(`champions loaded: ${champions.length}   |   Lethality-eligible (real pickTrollDirection pool): ${eligible.length}\n`);

// --- candidate pool the itemStyle gate actually exposes --------------------
const gated = recommendItemsForTag(items, TAG, { itemStyle: 'lethality' });
console.log('## itemStyle="lethality" candidate pool (recommendItemsForTag), score-sorted');
for (const it of gated) {
  console.log(
    `  ${String(scoreItemForTag(it, TAG, { itemStyle: 'lethality' })).padStart(4)}  ${it.name}  ` +
      `[tags ${it.tags.join(',')}]  styles=${itemStylesOf(it).join('+')}`,
  );
}
console.log(`  pool size: ${gated.length}\n`);

// ================= TEST A =================================================
const subject = eligible[0];
console.log(`## TEST A — ${subject.name} (${subject.tags.join('/')}), BuildTag=Lethality x10\n`);
const aRuns = Array.from({ length: 10 }, () => runPipeline(subject));
aRuns.forEach((r, i) => console.log(`  run ${String(i + 1).padStart(2)}: style=${r.itemStyle}  sig=${r.signature}\n            ${r.slots.join(' | ')}`));
const aDistinct = new Set(aRuns.map((r) => r.key));
console.log(`\n  distinct results across 10 runs: ${aDistinct.size}`);
console.log(`  => ${aDistinct.size === 1 ? 'NO VARIATION across 10 rolls' : 'VARIATION FOUND'}`);
console.log('  (note: resolveItemStyle + assembleBuild contain no Math.random() — deterministic by design)\n');

// ================= TEST B =================================================
// pick 10 eligible champions spread across scaling profiles
const byProfile = [...eligible].sort((a, b) => {
  const pa = profile(a);
  const pb = profile(b);
  return pb.phys - pa.phys || pb.adPerLvl - pa.adPerLvl || pb.asPerLvl - pa.asPerLvl;
});
const pick = [
  ...byProfile.slice(0, 4), // strongest physical-ability / AD-growth
  ...byProfile.slice(Math.floor(byProfile.length / 2) - 1, Math.floor(byProfile.length / 2) + 2), // middle
  ...byProfile.slice(-3), // crit/AS-leaning or low physical-ability
].filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i).slice(0, 10);

console.log(`## TEST B — 10 different Lethality-eligible champions, one pipeline run each\n`);
const bRows = pick.map((c) => ({ c, p: profile(c), r: runPipeline(c) }));
for (const { c, p, r } of bRows) {
  console.log(`  ${c.name.padEnd(12)} tags=${p.tags.padEnd(20)} phys=${p.phys} magic=${p.magic} true=${p.true} ad/lvl=${p.adPerLvl} as/lvl=${p.asPerLvl}`);
  console.log(`    style=${r.itemStyle}  sig=${r.signature}`);
  console.log(`    ${r.slots.join(' | ')}`);
}
const bDistinct = new Set(bRows.map((x) => x.r.key));
const bDistinctSig = new Set(bRows.map((x) => x.r.signature));
const bDistinctStyle = new Set(bRows.map((x) => x.r.itemStyle));
console.log(`\n  distinct final item sets: ${bDistinct.size} / 10`);
console.log(`  distinct signature items: ${bDistinctSig.size} / 10  (${[...bDistinctSig].join(', ')})`);
console.log(`  distinct ItemStyles:      ${bDistinctStyle.size} / 10  (${[...bDistinctStyle].join(', ')})`);

// ================= ROOT CAUSE PROBES ====================================
console.log(`\n## ROOT-CAUSE PROBES\n`);
console.log(`  1. resolveItemStyle(champion,'Lethality') for all ${eligible.length} eligible champions:`);
const allStyles = new Set(eligible.map((c) => resolveItemStyle(c, TAG)));
console.log(`     distinct values returned: ${allStyles.size}  -> {${[...allStyles].join(', ')}}`);

console.log(`\n  2. Does scoreItemForTag take champion data? signature: scoreItemForTag(item, tag, ctx)`);
console.log(`     ctx = ArchetypeContext { itemStyle?, statProfile? } — no Champion, no scaling stats.`);
console.log(`     buildPlan() call: assembleBuild(items, tag, { itemStyle })  — statProfile is NEVER passed.`);

console.log(`\n  3. Raw scoreItemForTag for every lethality-gated item (all identical => no ranking signal):`);
for (const it of gated) {
  const overlap = it.tags.filter((t) => t === 'Lethality' || t === 'ArmorPenetration').length;
  console.log(`     ${it.name.padEnd(22)} score=${scoreItemForTag(it, TAG, { itemStyle: 'lethality' })}  tagOverlap=${overlap}`);
}

// ================= CROSS-TAG CONTEXT ("possibly others") =================
console.log(`\n## CROSS-TAG — is Lethality special, or do other BuildTags collapse too?`);
console.log(`   (all 173 champions forced to each tag; distinct ItemStyles / distinct final builds)\n`);
for (const t of BUILD_TAGS) {
  const styles = new Set<string>();
  const buildsStyleOnly = new Set<string>(); // pre-STEP-1: itemStyle only
  const buildsWithProfile = new Set<string>(); // post-STEP-1: itemStyle + statProfile
  for (const c of champions) {
    const st = resolveItemStyle(c, t);
    styles.add(st);
    buildsStyleOnly.add(assembleBuild(items, t, { itemStyle: st }).map((s) => s.item.name).join('|'));
    buildsWithProfile.add(
      assembleBuild(items, t, { itemStyle: st, statProfile: deriveStatProfile(c) }).map((s) => s.item.name).join('|'),
    );
  }
  console.log(
    `   ${t.padEnd(12)} ItemStyles=${styles.size}  builds(style-only)=${String(buildsStyleOnly.size).padStart(2)}  builds(+statProfile)=${String(buildsWithProfile.size).padStart(2)}   {${[...styles].join(', ')}}`,
  );
}
