#!/usr/bin/env tsx
/**
 * Downloads current Summoner's Rift item data + icons from Riot's Data
 * Dragon and writes a normalized, static packages/data/items.json plus
 * icon assets under packages/data/assets/items/. Run on demand with
 * `pnpm fetch:items` — never at dev/build time (see CLAUDE.md: static
 * local JSON, no runtime fetch).
 *
 * Endpoints (public, keyless):
 *   - Current patch version: https://ddragon.leagueoflegends.com/api/versions.json
 *   - Item data:  https://ddragon.leagueoflegends.com/cdn/<version>/data/en_US/item.json
 *   - Icon asset: https://ddragon.leagueoflegends.com/cdn/<version>/img/item/<image.full>
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Item, ItemsFile } from '../types';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_DIR = join(PACKAGE_ROOT, 'assets', 'items');
const OUTPUT_FILE = join(PACKAGE_ROOT, 'items.json');

const VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';

const MAX_DESCRIPTION_LENGTH = 160;
const SUMMONERS_RIFT_MAP_ID = '11';

interface DDragonItemImage {
  full: string;
}

interface DDragonItemGold {
  total: number;
  purchasable: boolean;
}

interface DDragonItem {
  name: string;
  description: string;
  plaintext: string;
  gold: DDragonItemGold;
  image: DDragonItemImage;
  maps: Record<string, boolean>;
  /** Item ids this upgrades into. Absent/empty = top-tier, no further upgrade. */
  into?: string[];
}

interface DDragonItemFile {
  data: Record<string, DDragonItem>;
}

/** Item descriptions carry HTML markup (<mainText>, <stats>, <br>) — strip to plain text. */
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

async function downloadIcon(version: string, imageFull: string): Promise<void> {
  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${imageFull}`;
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

  const itemDataUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`;
  console.log(`Fetching item data from ${itemDataUrl} ...`);
  const res = await fetch(itemDataUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch item data: HTTP ${res.status}`);
  }
  const data = (await res.json()) as DDragonItemFile;

  const entries = Object.entries(data.data).filter(
    ([, item]) => item.gold.purchasable && item.maps[SUMMONERS_RIFT_MAP_ID],
  );
  console.log(`Got ${entries.length} purchasable Summoner's Rift items. Downloading icons...`);

  await mkdir(ASSETS_DIR, { recursive: true });

  const items: Item[] = [];
  let done = 0;
  for (const [idStr, raw] of entries) {
    await downloadIcon(version, raw.image.full);

    items.push({
      id: Number(idStr),
      name: raw.name,
      description: cleanDescription(raw.plaintext, raw.description),
      price: raw.gold.total,
      iconPath: `assets/items/${raw.image.full}`,
      isCompleted: !raw.into || raw.into.length === 0,
    });

    done += 1;
    if (done % 25 === 0 || done === entries.length) {
      console.log(`  ${done}/${entries.length} icons downloaded`);
    }
  }

  items.sort((a, b) => a.name.localeCompare(b.name));

  const output: ItemsFile = {
    source: version,
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
