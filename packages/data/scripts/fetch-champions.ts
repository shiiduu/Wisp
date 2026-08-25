#!/usr/bin/env tsx
/**
 * Downloads current champion data + icons from Riot's Data Dragon and
 * writes a normalized, static packages/data/champions.json plus icon
 * assets under packages/data/assets/champions/. Run on demand with
 * `pnpm fetch:champions` — never at dev/build time.
 *
 * Endpoints (public, keyless):
 *   - Current patch version: https://ddragon.leagueoflegends.com/api/versions.json
 *   - Champion summary list:  https://ddragon.leagueoflegends.com/cdn/<version>/data/en_US/champion.json
 *   - Champion detail (per champion, for full spell data):
 *       https://ddragon.leagueoflegends.com/cdn/<version>/data/en_US/champion/<Id>.json
 *   - Icon asset: https://ddragon.leagueoflegends.com/cdn/<version>/img/champion/<image.full>
 *
 * IMPORTANT DATA LIMITATION (verified live against 3 champions + the
 * current LoL Wiki — see CLAUDE.md): Data Dragon's `vars` and `effect`
 * scaling arrays are EMPTY for every champion under the current tooltip
 * format. Riot no longer exposes numeric AP/AD ratios through this API —
 * only the wiki (manually maintained) has those. The only scaling signal
 * left in the API is the semantic markup Riot embeds directly in each
 * spell's tooltip text (`<magicDamage>`, `<physicalDamage>`, etc.), which
 * this script classifies into `AbilityScalingSignal[]`. That classification
 * was spot-checked against the wiki for Cho'Gath, Kayle and Swain and
 * matched exactly on damage type for every ability — reliable for type,
 * not for exact percentages.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Ability, AbilityScalingSignal, Champion, ChampionsFile } from '../types';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_DIR = join(PACKAGE_ROOT, 'assets', 'champions');
const DETAILS_DIR = join(PACKAGE_ROOT, 'champions');
const OUTPUT_FILE = join(PACKAGE_ROOT, 'champions.json');

const VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
const MAX_DESCRIPTION_LENGTH = 160;

interface DDragonImage {
  full: string;
}

interface DDragonSpell {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  maxrank: number;
  cooldown: number[];
  cost: number[];
}

interface DDragonPassive {
  name: string;
  description: string;
}

interface DDragonChampionDetail {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
  partype: string;
  info: Champion['info'];
  stats: Champion['stats'];
  spells: DDragonSpell[];
  passive: DDragonPassive;
  image: DDragonImage;
}

interface DDragonChampionSummaryFile {
  data: Record<string, { id: string }>;
}

interface DDragonChampionDetailFile {
  data: Record<string, DDragonChampionDetail>;
}

function cleanDescription(raw: string): string {
  const plain = raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= MAX_DESCRIPTION_LENGTH) return plain;
  return `${plain.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

/** Classify a spell's scaling signal(s) from the semantic tags in its tooltip — see module doc. */
function classifyScaling(tooltip: string): AbilityScalingSignal[] {
  const signals = new Set<AbilityScalingSignal>();
  if (/<magicDamage>/.test(tooltip)) signals.add('magic');
  if (/<physicalDamage>/.test(tooltip)) signals.add('physical');
  if (/<trueDamage>/.test(tooltip)) signals.add('true');
  if (/<healing>/.test(tooltip)) signals.add('heal');
  if (/<shield>/.test(tooltip)) signals.add('shield');
  if (/<scaleArmor>|<scaleMR>|<scaleHealth>/.test(tooltip)) signals.add('tank');
  if (signals.size === 0) signals.add('none');
  return [...signals];
}

function toAbility(spell: DDragonSpell): Ability {
  return {
    id: spell.id,
    name: spell.name,
    description: cleanDescription(spell.description),
    maxRank: spell.maxrank,
    cooldown: spell.cooldown,
    cost: spell.cost,
    scaling: classifyScaling(spell.tooltip),
  };
}

async function downloadIcon(version: string, imageFull: string): Promise<void> {
  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${imageFull}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download icon ${url}: HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(join(ASSETS_DIR, imageFull), buffer);
}

async function main() {
  console.log(`Fetching current patch version from ${VERSIONS_URL} ...`);
  const versionsRes = await fetch(VERSIONS_URL);
  if (!versionsRes.ok) {
    throw new Error(`Failed to fetch versions: HTTP ${versionsRes.status}`);
  }
  const versions = (await versionsRes.json()) as string[];
  const version = versions[0];
  console.log(`Using patch ${version}`);

  const summaryUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
  console.log(`Fetching champion summary list from ${summaryUrl} ...`);
  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) {
    throw new Error(`Failed to fetch champion summary: HTTP ${summaryRes.status}`);
  }
  const summary = (await summaryRes.json()) as DDragonChampionSummaryFile;
  const ids = Object.keys(summary.data).sort();
  console.log(`Got ${ids.length} champions. Fetching detail + icon for each...`);

  await mkdir(ASSETS_DIR, { recursive: true });
  await mkdir(DETAILS_DIR, { recursive: true });

  // champions.json stays a lightweight index (id/name/tags/icon only) so
  // every consumer can list all 173 champions cheaply. Each champion's
  // full stats + ability data — the part actually needed for scoring —
  // goes into its own champions/<id>.json, loaded lazily (same
  // non-eager import.meta.glob pattern already used for icons) only for
  // the one champion actually being scored at a time.
  const summaries: ChampionsFile['champions'] = [];
  let done = 0;
  for (const id of ids) {
    const detailUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${id}.json`;
    const detailRes = await fetch(detailUrl);
    if (!detailRes.ok) {
      throw new Error(`Failed to fetch champion detail ${detailUrl}: HTTP ${detailRes.status}`);
    }
    const detailFile = (await detailRes.json()) as DDragonChampionDetailFile;
    const detail = detailFile.data[id];

    await downloadIcon(version, detail.image.full);

    const [q, w, e, r] = detail.spells;
    const iconPath = `assets/champions/${detail.image.full}`;
    const champion: Champion = {
      id: detail.id,
      key: Number(detail.key),
      name: detail.name,
      title: detail.title,
      tags: detail.tags,
      partype: detail.partype,
      info: detail.info,
      stats: detail.stats,
      abilities: {
        passive: {
          name: detail.passive.name,
          description: cleanDescription(detail.passive.description),
          scaling: classifyScaling(detail.passive.description),
        },
        Q: toAbility(q),
        W: toAbility(w),
        E: toAbility(e),
        R: toAbility(r),
      },
      iconPath,
    };

    await writeFile(join(DETAILS_DIR, `${detail.id}.json`), JSON.stringify(champion) + '\n');

    summaries.push({
      id: champion.id,
      key: champion.key,
      name: champion.name,
      title: champion.title,
      tags: champion.tags,
      info: champion.info,
      iconPath: champion.iconPath,
    });

    done += 1;
    if (done % 25 === 0 || done === ids.length) {
      console.log(`  ${done}/${ids.length} champions fetched`);
    }
  }

  summaries.sort((a, b) => a.name.localeCompare(b.name));

  const output: ChampionsFile = {
    source: version,
    generatedAt: new Date().toISOString(),
    champions: summaries,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote ${summaries.length} champions to ${OUTPUT_FILE} and ${DETAILS_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
