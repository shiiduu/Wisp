/**
 * Lazily resolves a champion's FULL detail (stats + ability scaling) by id.
 * champions.json only holds a lightweight index (name/tags/icon); the data
 * actually needed for scoring lives in its own champions/<id>.json, loaded
 * on demand — same non-eager import.meta.glob pattern as the icon loaders,
 * applied to JSON instead of images, so the other 172 champions' full data
 * never enters this bundle.
 */
import type { Champion } from '@wisp/data/types';

const loaders = import.meta.glob<{ default: Champion }>(
  '../../../packages/data/champions/*.json',
);

function loaderKeyFor(id: string): string {
  return `../../../packages/data/champions/${id}.json`;
}

export async function loadChampionDetail(id: string): Promise<Champion | undefined> {
  const loader = loaders[loaderKeyFor(id)];
  if (!loader) return undefined;
  const mod = await loader();
  return mod.default;
}
