/**
 * Lazily resolves a champion icon URL by its Data Dragon image filename
 * (e.g. "Chogath.png"). Same lazy-glob pattern as apps/mockup's icon
 * loaders: 173 champions' icons stay out of the bundle until rendered.
 */
const iconLoaders = import.meta.glob<{ default: string }>(
  '../../../packages/data/assets/champions/*.png',
);

const urlCache = new Map<string, string>();
const pendingLoads = new Map<string, Promise<string | undefined>>();

function loaderKeyFor(fileName: string): string {
  return `../../../packages/data/assets/champions/${fileName}`;
}

export function getCachedChampionIconUrl(fileName: string): string | undefined {
  return urlCache.get(fileName);
}

export async function loadChampionIconUrl(fileName: string): Promise<string | undefined> {
  const cached = urlCache.get(fileName);
  if (cached) return cached;

  const pending = pendingLoads.get(fileName);
  if (pending) return pending;

  const loader = iconLoaders[loaderKeyFor(fileName)];
  if (!loader) return undefined;

  const promise = loader().then((mod) => {
    urlCache.set(fileName, mod.default);
    pendingLoads.delete(fileName);
    return mod.default;
  });
  pendingLoads.set(fileName, promise);
  return promise;
}
