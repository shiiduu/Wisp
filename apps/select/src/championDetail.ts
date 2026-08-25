/**
 * Lazily resolves a champion's FULL detail (stats + ability scaling) by id
 * — needed to actually run the scoring engine on the champion the user
 * just clicked. champions.json only holds a lightweight index; see
 * apps/mockup's championDetail.ts for the full rationale (same pattern).
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
