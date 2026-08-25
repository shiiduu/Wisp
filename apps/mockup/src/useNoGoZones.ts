import { useEffect, useState } from 'react';

/** A rectangle in percent-of-viewport units. */
export interface NoGoRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Measures every element marked `data-nogo` and reports their bounding
 * rects as percentages of the viewport. Re-measures on resize and whenever
 * a marked element's own size changes (ResizeObserver) — plus whenever a
 * value in `deps` changes, since panel content (purchased items, shop
 * stock) can resize a panel without the window itself resizing.
 */
export function useNoGoZones(deps: unknown[] = []): NoGoRect[] {
  const [zones, setZones] = useState<NoGoRect[]>([]);

  useEffect(() => {
    function measure() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rects: NoGoRect[] = [];
      document.querySelectorAll<HTMLElement>('[data-nogo]').forEach((el) => {
        const r = el.getBoundingClientRect();
        rects.push({
          x0: (r.left / vw) * 100,
          y0: (r.top / vh) * 100,
          x1: (r.right / vw) * 100,
          y1: (r.bottom / vh) * 100,
        });
      });
      setZones(rects);
    }

    measure();
    // Layout can still be settling (fonts, images) right after mount/update.
    const settleTimer = setTimeout(measure, 300);

    const ro = new ResizeObserver(measure);
    document.querySelectorAll<HTMLElement>('[data-nogo]').forEach((el) => ro.observe(el));
    window.addEventListener('resize', measure);

    return () => {
      clearTimeout(settleTimer);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return zones;
}
