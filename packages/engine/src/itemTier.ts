import type { Item } from '@wisp/data/types';
import type { ItemTier } from './types';

/**
 * Classifies an item's tier purely from fields Data Dragon already
 * provides (tags, depth, from/into build-tree) — no hand-authored list.
 *
 * Rule, in order:
 * 1. `tags` includes "Consumable" -> 'consumable' (potions, wards)
 * 2. `tags` includes "Boots" -> 'boots'
 * 3. No `from` (not built from another item) and depth <= 1 -> 'starter'
 *    (a basic component, e.g. Long Sword, Cloth Armor, Doran's items)
 * 4. Has `into` (a further upgrade exists) -> 'component' (mid-build item)
 * 5. Otherwise it's a completed, top-tier item:
 *    - `tags` includes a penetration/lethality tag -> 'penetration'
 *    - `depth` >= 3 OR `price` >= 2900 -> 'core' (a full "big" item)
 *    - else -> 'situational' (completed but cheap/niche, e.g. Control Ward
 *      variants aside, small completed items)
 */
export function classifyItemTier(item: Item): ItemTier {
  if (item.tags.includes('Consumable')) return 'consumable';
  if (item.tags.includes('Boots')) return 'boots';
  if (!item.from && (item.depth ?? 1) <= 1) return 'starter';
  if (item.into && item.into.length > 0) return 'component';

  const isPenetration = item.tags.some((t) => t === 'Lethality' || t === 'ArmorPenetration' || t === 'MagicPenetration');
  if (isPenetration) return 'penetration';
  if ((item.depth ?? 0) >= 3 || item.price >= 2900) return 'core';
  return 'situational';
}
