/**
 * Lazily resolves an item icon URL by id. Same pattern as augmentIcons.ts:
 * items are now recommended dynamically per champion/build-tag (not a
 * fixed hardcoded set), so icons can't be statically imported ahead of
 * time — this keeps the other ~250 unused item icons out of the bundle.
 */
const iconLoaders = import.meta.glob<{ default: string }>(
  '../../../packages/data/assets/items/*.png',
);

const urlCache = new Map<number, string>();
const pendingLoads = new Map<number, Promise<string | undefined>>();

function loaderKeyFor(id: number): string {
  return `../../../packages/data/assets/items/${id}.png`;
}

export function getCachedItemIconUrl(id: number): string | undefined {
  return urlCache.get(id);
}

export async function loadItemIconUrl(id: number): Promise<string | undefined> {
  const cached = urlCache.get(id);
  if (cached) return cached;

  const pending = pendingLoads.get(id);
  if (pending) return pending;

  const loader = iconLoaders[loaderKeyFor(id)];
  if (!loader) return undefined;

  const promise = loader().then((mod) => {
    urlCache.set(id, mod.default);
    pendingLoads.delete(id);
    return mod.default;
  });
  pendingLoads.set(id, promise);
  return promise;
}
