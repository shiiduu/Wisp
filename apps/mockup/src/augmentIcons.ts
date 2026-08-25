/**
 * Lazily resolves an augment icon URL by apiName. Backed by Vite's glob
 * import in non-eager mode: each icon becomes its own on-demand chunk, so
 * referencing one here does NOT add the other ~225 icons to the bundle —
 * only the ones actually rendered (random popup picks, selected augments)
 * are ever fetched.
 */
const iconLoaders = import.meta.glob<{ default: string }>(
  '../../../packages/data/assets/augments/*.png',
);

const urlCache = new Map<string, string>();
const pendingLoads = new Map<string, Promise<string | undefined>>();

function loaderKeyFor(apiName: string): string {
  return `../../../packages/data/assets/augments/${apiName.toLowerCase()}.png`;
}

export function getCachedAugmentIconUrl(apiName: string): string | undefined {
  return urlCache.get(apiName);
}

export async function loadAugmentIconUrl(apiName: string): Promise<string | undefined> {
  const cached = urlCache.get(apiName);
  if (cached) return cached;

  const pending = pendingLoads.get(apiName);
  if (pending) return pending;

  const loader = iconLoaders[loaderKeyFor(apiName)];
  if (!loader) return undefined;

  const promise = loader().then((mod) => {
    urlCache.set(apiName, mod.default);
    pendingLoads.delete(apiName);
    return mod.default;
  });
  pendingLoads.set(apiName, promise);
  return promise;
}
