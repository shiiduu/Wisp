#!/usr/bin/env tsx
/**
 * Downloads current item data + icons and writes a normalized, static
 * packages/data/items.json plus icon assets under
 * packages/data/assets/items/. Run on demand with `pnpm fetch:items` —
 * never at dev/build time (see CLAUDE.md: static local JSON, no runtime
 * fetch).
 *
 * SOURCES (public, keyless):
 *
 *  - PRIMARY item data: Community Dragon
 *      https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/items.json
 *    CDragon actively curates the correctness bugs that Riot's own Data
 *    Dragon has left unfixed for years (missing Ornn upgrades since 2020,
 *    still-open "item.json missing stats" ticket, stale records). We take
 *    name / categories / build-tree / price / icon from here.
 *
 *  - MAP-LEGALITY ORACLE: Data Dragon item.json
 *      https://ddragon.leagueoflegends.com/api/versions.json  (current patch)
 *      https://ddragon.leagueoflegends.com/cdn/<version>/data/en_US/item.json
 *    CDragon's items.json has NO map/mode field at all, so it cannot on
 *    its own tell an ARAM item from an Arena or SR one. Data Dragon's
 *    per-item `maps` flags are the only keyless machine-readable legality
 *    signal, so we keep DDragon purely as the "is this id legal on the
 *    target map?" filter and take nothing else from it (except an icon
 *    fallback). See CLAUDE.md for why this hybrid, and for the remaining
 *    Mayhem-specificity limitation.
 *
 *  - Icon fallback: Data Dragon
 *      https://ddragon.leagueoflegends.com/cdn/<version>/img/item/<id>.png
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Item, ItemsFile, ItemStats } from '../types';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_DIR = join(PACKAGE_ROOT, 'assets', 'items');
const OUTPUT_FILE = join(PACKAGE_ROOT, 'items.json');

const VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
const CDRAGON_ITEMS_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/items.json';
const CDRAGON_ASSET_BASE =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';

const MAX_DESCRIPTION_LENGTH = 160;

/**
 * Which map's item roster to emit. `12` = Howling Abyss, i.e. the
 * ARAM / ARAM-Mayhem battleground (map `11` is Summoner's Rift, `30` is
 * Arena). Wisp targets ARAM Mayhem, so ARAM-legal is the correct filter —
 * this is a deliberate change from the earlier SR-scoped fetch. See
 * CLAUDE.md: a fully Mayhem-specific pool is not cleanly derivable from
 * either source and is tracked as a Phase 3/4 follow-up.
 */
const TARGET_MAP_ID = '12';

/**
 * Data Dragon (and Community Dragon) ship several ID-namespaced copies of
 * the same item for different game modes (prefixes 22xxxx = Arena,
 * 32xxxx = ARAM, 66xxxx / 77xxxx = Mayhem/legacy), and stamp some of the
 * mode copies with real map flags even though they are not real live
 * items (e.g. 663039 "Atma's Reckoning", 663056 "Demon King's Crown").
 * The diagnostic verified every genuine base-game item id is < 10000, and
 * every id >= 100000 that passed the map/purchasable filter was either a
 * namespace duplicate or mode-exclusive content — so this cutoff is a
 * safe guard against that leak, applied to BOTH sources.
 */
const MAX_REAL_ITEM_ID = 100_000;

// --- Data Dragon (map-legality oracle) ------------------------------------

interface DDragonItem {
  name: string;
  gold: { total: number; purchasable: boolean };
  image: { full: string };
  maps: Record<string, boolean>;
}

interface DDragonItemFile {
  data: Record<string, DDragonItem>;
}

// --- Community Dragon (primary data) ------------------------------------

interface CDragonItem {
  id: number;
  name: string;
  description: string;
  inStore: boolean;
  from: number[];
  /** Item ids this upgrades into — CDragon's name for Data Dragon's `into`. */
  to: number[];
  /** CDragon's name for Data Dragon's `tags`, same vocabulary. */
  categories: string[];
  /** Combine cost. */
  price: number;
  /** Total gold cost (what we want as the buy price). */
  priceTotal: number;
  /** e.g. "/lol-game-data/assets/ASSETS/Items/Icons2D/3031_Marksman_T3_InfinityEdge.png". */
  iconPath: string;
}

/**
 * Descriptions carry HTML markup (<mainText>, <stats>, <br>) — strip to
 * plain text. CDragon has no separate plaintext field, so callers pass
 * the HTML as both arguments.
 */
function cleanDescription(rawPlaintext: string, rawHtml: string): string {
  const base = rawPlaintext.trim().length > 0 ? rawPlaintext : rawHtml;
  const plain = base
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= MAX_DESCRIPTION_LENGTH) return plain;
  return `${plain.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

/** Strip HTML + collapse whitespace, WITHOUT the length truncation cleanDescription applies. */
function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse the leading stat line of an item description into structured
 * numbers. Item cards always front-load stats as a contiguous run of
 * "<n>[%] <Stat Name>" pairs before the first passive; this walks that
 * run and stops at the first gap that isn't another stat (or a
 * non-build-stat regen line, which is consumed but not emitted).
 *
 * Best-effort: the source is prose, so treat a missing/oddly-worded stat
 * as "not parsed", never as an error.
 */
const STAT_KEYS: Record<string, keyof ItemStats | null> = {
  'Ability Power': 'abilityPower',
  'Attack Damage': 'attackDamage',
  Health: 'health',
  Armor: 'armor',
  'Magic Resist': 'magicResist',
  'Attack Speed': 'attackSpeed',
  'Ability Haste': 'abilityHaste',
  'Critical Strike Chance': 'critChance',
  'Critical Strike Damage': 'critDamage',
  'Life Steal': 'lifeSteal',
  Omnivamp: 'omnivamp',
  'Move Speed': 'moveSpeed',
  'Magic Penetration': 'magicPen',
  Lethality: 'lethality',
  Mana: 'mana',
  Tenacity: 'tenacity',
  'Heal and Shield Power': 'healShieldPower',
  // consumed to keep the run contiguous, never emitted:
  'Base Mana Regen': null,
  'Base Health Regen': null,
};

const STAT_LINE_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?)%?\\s+(${Object.keys(STAT_KEYS)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})`,
  'g',
);

function parseItemStats(plain: string): ItemStats | undefined {
  STAT_LINE_RE.lastIndex = 0;
  const stats: ItemStats = {};
  let lastEnd = 0;
  let first = true;
  let match: RegExpExecArray | null;
  while ((match = STAT_LINE_RE.exec(plain)) !== null) {
    // Must start at the very front, then stay contiguous with the last hit.
    if (first ? match.index > 1 : match.index - lastEnd > 3) break;
    first = false;
    lastEnd = match.index + match[0].length;
    const key = STAT_KEYS[match[2]];
    if (key) stats[key] = Number(match[1]);
  }
  return Object.keys(stats).length > 0 ? stats : undefined;
}

/** CDragon icon path -> raw asset URL (strip the /lol-game-data prefix, lowercase). */
function cdragonIconUrl(iconPath: string): string {
  const rel = iconPath.replace(/^\/lol-game-data/i, '').toLowerCase();
  return `${CDRAGON_ASSET_BASE}${rel}`;
}

/**
 * Derive Data Dragon's `depth` (basic component = 1, each build-up step
 * +1) from the CDragon `from` tree. Data Dragon exposes this directly but
 * CDragon does not; itemTier.ts depends on it, so reconstruct it rather
 * than reintroduce a DDragon field dependency. Cycle-safe.
 */
function makeDepthResolver(byId: Map<number, CDragonItem>) {
  const cache = new Map<number, number>();
  function depth(id: number, seen: Set<number>): number {
    const cached = cache.get(id);
    if (cached !== undefined) return cached;
    const item = byId.get(id);
    if (!item || item.from.length === 0 || seen.has(id)) {
      cache.set(id, 1);
      return 1;
    }
    seen.add(id);
    const d = 1 + Math.max(...item.from.map((c) => depth(c, seen)));
    seen.delete(id);
    cache.set(id, d);
    return d;
  }
  return (id: number) => depth(id, new Set());
}

async function downloadIcon(destName: string, cdragonUrl: string, ddragonUrl: string): Promise<void> {
  let res = await fetch(cdragonUrl);
  if (!res.ok) {
    // CDragon occasionally lags on a brand-new icon — fall back to DDragon.
    const fallback = await fetch(ddragonUrl);
    if (!fallback.ok) {
      throw new Error(
        `Failed to download icon for ${destName}: CDragon HTTP ${res.status}, DDragon HTTP ${fallback.status}`,
      );
    }
    res = fallback;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(join(ASSETS_DIR, destName), buffer);
}

async function fetchJson<T>(url: string, label: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${label} (${url}): HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function main() {
  console.log(`Fetching current patch version from ${VERSIONS_URL} ...`);
  const versions = await fetchJson<string[]>(VERSIONS_URL, 'versions');
  const version = versions[0];
  console.log(`Using patch ${version}`);

  const ddUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`;
  console.log(`Fetching map-legality data from ${ddUrl} ...`);
  const dd = await fetchJson<DDragonItemFile>(ddUrl, 'Data Dragon item data');

  console.log(`Fetching item data from ${CDRAGON_ITEMS_URL} ...`);
  const cd = await fetchJson<CDragonItem[]>(CDRAGON_ITEMS_URL, 'Community Dragon item data');
  const cdById = new Map(cd.map((item) => [item.id, item]));
  const depthOf = makeDepthResolver(cdById);

  // Ids that are legal on the target map, per Data Dragon, with the
  // namespace-pollution guard applied.
  const legalIds = Object.entries(dd.data)
    .filter(
      ([id, item]) =>
        Number(id) < MAX_REAL_ITEM_ID &&
        item.gold.purchasable &&
        item.maps[TARGET_MAP_ID],
    )
    .map(([id]) => Number(id));

  console.log(
    `${legalIds.length} ids legal on map ${TARGET_MAP_ID}. Cross-referencing Community Dragon + downloading icons...`,
  );

  await mkdir(ASSETS_DIR, { recursive: true });

  const items: Item[] = [];
  let done = 0;
  let cdragonMisses = 0;
  for (const id of legalIds) {
    const c = cdById.get(id);
    const d = dd.data[String(id)];

    if (!c) {
      // Should not happen (verified 0 misses), but stay robust: fall back
      // to the DDragon record so a CDragon gap can't silently drop an item.
      cdragonMisses += 1;
      await downloadIcon(
        `${id}.png`,
        `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${d.image.full}`,
        `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${d.image.full}`,
      );
      items.push({
        id,
        name: d.name,
        description: '',
        price: d.gold.total,
        iconPath: `assets/items/${id}.png`,
        isCompleted: true,
        tags: [],
      });
    } else {
      await downloadIcon(
        `${id}.png`,
        cdragonIconUrl(c.iconPath),
        `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${d.image.full}`,
      );
      const from = c.from.filter((x) => x > 0);
      const into = c.to.filter((x) => x > 0);
      const plain = plainText(c.description);
      items.push({
        id,
        name: c.name,
        description: cleanDescription(c.description, c.description),
        stats: parseItemStats(plain),
        price: c.priceTotal || c.price || d.gold.total,
        iconPath: `assets/items/${id}.png`,
        isCompleted: into.length === 0,
        tags: c.categories ?? [],
        depth: depthOf(id),
        from: from.length > 0 ? from : undefined,
        into: into.length > 0 ? into : undefined,
      });
    }

    done += 1;
    if (done % 25 === 0 || done === legalIds.length) {
      console.log(`  ${done}/${legalIds.length} items processed`);
    }
  }

  if (cdragonMisses > 0) {
    console.warn(`  WARNING: ${cdragonMisses} id(s) not in Community Dragon, fell back to Data Dragon`);
  }

  items.sort((a, b) => a.name.localeCompare(b.name));

  const output: ItemsFile = {
    source: `cdragon-latest (data) + ddragon-${version} (map ${TARGET_MAP_ID} legality)`,
    generatedAt: new Date().toISOString(),
    items,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote ${items.length} items to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
