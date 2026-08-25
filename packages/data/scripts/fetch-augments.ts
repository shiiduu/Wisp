#!/usr/bin/env tsx
/**
 * Downloads current Arena augment data + icons from Community Dragon and
 * writes a normalized, static packages/data/augments.json plus icon assets
 * under packages/data/assets/augments/. Run on demand with `pnpm fetch:augments`
 * — never at dev/build time (see CLAUDE.md: static local JSON, no runtime fetch).
 *
 * Endpoints (public, keyless, community-maintained mirror of Riot's game data):
 *   - Augment data: https://raw.communitydragon.org/latest/cdragon/arena/en_us.json
 *   - Icon assets:  https://raw.communitydragon.org/latest/game/<iconPath, lowercased>
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Augment, AugmentRarity, AugmentsFile } from '../types';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_DIR = join(PACKAGE_ROOT, 'assets', 'augments');
const OUTPUT_FILE = join(PACKAGE_ROOT, 'augments.json');

const ARENA_DATA_URL = 'https://raw.communitydragon.org/latest/cdragon/arena/en_us.json';
const RAW_ASSET_BASE = 'https://raw.communitydragon.org/latest/game/';

const MAX_DESCRIPTION_LENGTH = 160;

interface CDragonAugment {
  id: number;
  apiName: string;
  name: string;
  rarity: number;
  desc: string;
  tooltip: string;
  iconSmall: string;
  iconLarge: string;
}

interface CDragonArenaFile {
  augments: CDragonAugment[];
}

function rarityFromCDragon(rarity: number): AugmentRarity {
  switch (rarity) {
    case 0:
      return 'silver';
    case 1:
      return 'gold';
    case 2:
      return 'prismatic';
    default:
      return 'unknown';
  }
}

/**
 * CDragon descriptions carry markup tags (<spellName>, <br>), template
 * placeholders ({{ Item_Keyword_OnHit }}), and unresolved stat formulas
 * (@MaxStacks*100@) — strip all of that down to short, readable plain text.
 */
function cleanDescription(raw: string): string {
  const plain = raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, token: string) =>
      token.replace(/_/g, ' ').toLowerCase(),
    )
    .replace(/@[^@]+@/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= MAX_DESCRIPTION_LENGTH) return plain;
  return `${plain.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

function iconFileName(apiName: string): string {
  return `${apiName.toLowerCase()}.png`;
}

async function downloadIcon(iconSmallPath: string, destFileName: string): Promise<void> {
  const url = RAW_ASSET_BASE + iconSmallPath.toLowerCase();
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download icon ${url}: HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(join(ASSETS_DIR, destFileName), buffer);
}

async function main() {
  console.log(`Fetching augment data from ${ARENA_DATA_URL} ...`);
  const res = await fetch(ARENA_DATA_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch augment data: HTTP ${res.status}`);
  }
  const data = (await res.json()) as CDragonArenaFile;
  console.log(`Got ${data.augments.length} augments. Downloading icons...`);

  await mkdir(ASSETS_DIR, { recursive: true });

  const augments: Augment[] = [];
  let done = 0;
  for (const raw of data.augments) {
    const fileName = iconFileName(raw.apiName);
    await downloadIcon(raw.iconSmall, fileName);

    augments.push({
      id: raw.id,
      apiName: raw.apiName,
      name: raw.name,
      description: cleanDescription(raw.desc),
      rarity: rarityFromCDragon(raw.rarity),
      iconPath: `assets/augments/${fileName}`,
    });

    done += 1;
    if (done % 25 === 0 || done === data.augments.length) {
      console.log(`  ${done}/${data.augments.length} icons downloaded`);
    }
  }

  augments.sort((a, b) => a.name.localeCompare(b.name));

  const output: AugmentsFile = {
    source: 'latest',
    generatedAt: new Date().toISOString(),
    augments,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote ${augments.length} augments to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
