// wisp_idle.png is intentionally not imported/used — wisp_idle_alt is the
// default idle sprite (see CompanionSpriteState below).
import idleUrl from '../../../packages/ui/assets/companion/wisp_idle_alt.png';
import movingUrl from '../../../packages/ui/assets/companion/wisp_moving.png';
import killUrl from '../../../packages/ui/assets/companion/wisp_kill.png';
import funnyNumberUrl from '../../../packages/ui/assets/companion/wisp_funnynumber.png';
import scaredUrl from '../../../packages/ui/assets/companion/wisp_scared.png';
import pentaUrl from '../../../packages/ui/assets/companion/wisp_penta.png';

export type CompanionSpriteState = 'idle' | 'moving' | 'kill' | 'funnynumber' | 'scared' | 'penta';

const SOURCE_URLS: Record<CompanionSpriteState, string> = {
  idle: idleUrl,
  moving: movingUrl,
  kill: killUrl,
  funnynumber: funnyNumberUrl,
  scared: scaredUrl,
  penta: pentaUrl,
};

// The delivered PNGs ship with a solid white background instead of real
// alpha transparency, and wisp_idle_alt (1280x720, like the other five
// remaining states) needs the same treatment. Rather than hard-cut on a
// single white value (which leaves a visible fringe around the character's
// soft outer glow), channels within WHITE_FEATHER of WHITE_THRESHOLD ramp
// alpha down smoothly. The same pass finds the bounding box of the
// remaining (non-background) pixels and crops to it with uniform padding,
// so every state renders at a consistent scale/framing.
const WHITE_THRESHOLD = 244;
const WHITE_FEATHER = 26;
const CONTENT_ALPHA_CUTOFF = 40;
const CROP_PADDING_RATIO = 0.08;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load companion sprite: ${src}`));
    img.src = src;
  });
}

async function processSprite(src: string): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0);

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let i = 0; i < data.length; i += 4) {
    const minChannel = Math.min(data[i], data[i + 1], data[i + 2]);
    let alpha = 255;
    if (minChannel >= WHITE_THRESHOLD - WHITE_FEATHER) {
      const t = Math.min(1, Math.max(0, (minChannel - (WHITE_THRESHOLD - WHITE_FEATHER)) / WHITE_FEATHER));
      alpha = Math.round(255 * (1 - t));
    }
    data[i + 3] = alpha;

    if (alpha > CONTENT_ALPHA_CUTOFF) {
      const pixelIndex = i / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  if (maxX <= minX || maxY <= minY) {
    // Nothing detected as foreground (shouldn't happen) — fall back to the
    // un-cropped, alpha-stripped canvas rather than throwing.
    return canvas.toDataURL('image/png');
  }

  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const side = Math.max(boxW, boxH) * (1 + CROP_PADDING_RATIO * 2);
  const cx = minX + boxW / 2;
  const cy = minY + boxH / 2;

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = side;
  cropCanvas.height = side;
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) return canvas.toDataURL('image/png');
  cropCtx.drawImage(canvas, cx - side / 2, cy - side / 2, side, side, 0, 0, side, side);

  return cropCanvas.toDataURL('image/png');
}

let inFlight: Promise<Record<CompanionSpriteState, string>> | null = null;

/**
 * Processes (background-strip + crop-normalize) and caches all 6 companion
 * sprites, returning a state->dataURL map once every image is ready.
 * Idempotent/memoized — safe to call from multiple mounts (e.g. HMR).
 */
export function preloadCompanionSprites(): Promise<Record<CompanionSpriteState, string>> {
  if (!inFlight) {
    const entries = Object.entries(SOURCE_URLS) as [CompanionSpriteState, string][];
    inFlight = Promise.all(entries.map(([state, src]) => processSprite(src).then((url) => [state, url] as const))).then(
      (pairs) => Object.fromEntries(pairs) as Record<CompanionSpriteState, string>,
    );
  }
  return inFlight;
}
