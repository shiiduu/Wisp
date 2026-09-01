import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

const STRIP_LEN = 52;
const WINNER_INDEX = 46; // a few filler cells trail the winner so it isn't at the edge
const SPIN_MS = 4200;
const SETTLE_MS = 620;
const OVERSHOOT_PX = 46;

function shuffled<T>(arr: T[]): T[] {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

interface RollCarouselProps<T> {
  /** Real filler pool — the spin is built from these so it reads as genuine. */
  pool: T[];
  /** The actual engine result the strip must land on. */
  winner: T;
  keyFor: (item: T, index: number) => string;
  renderCell: (item: T, isWinner: boolean, landed: boolean) => ReactNode;
  cellWidth: number;
  onLanded: () => void;
  /** Skip the spin, jump straight to the result (reduced-motion / dev skip). */
  instant?: boolean;
  /** Dev speed-up: 1 = normal, >1 = faster. */
  speedFactor?: number;
}

export function RollCarousel<T>({
  pool,
  winner,
  keyFor,
  renderCell,
  cellWidth,
  onLanded,
  instant = false,
  speedFactor = 1,
}: RollCarouselProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportW, setViewportW] = useState(0);
  const [x, setX] = useState(0);
  const [transition, setTransition] = useState('none');
  const [landed, setLanded] = useState(false);
  const startedRef = useRef(false);

  // Strip contents: shuffled real filler, with the real winner pinned at
  // WINNER_INDEX. Rebuilt once per mount so each spin looks different.
  const strip = useMemo(() => {
    const cells: T[] = [];
    let bag: T[] = [];
    for (let i = 0; i < STRIP_LEN; i++) {
      if (bag.length === 0) bag = shuffled(pool);
      cells.push(bag.pop()!);
    }
    cells[WINNER_INDEX] = winner;
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) setViewportW(el.offsetWidth);
  }, []);

  useLayoutEffect(() => {
    if (viewportW === 0 || startedRef.current) return;
    startedRef.current = true;

    const targetX = viewportW / 2 - (WINNER_INDEX * cellWidth + cellWidth / 2);

    if (instant) {
      setTransition('none');
      setX(targetX);
      setLanded(true);
      const t = setTimeout(onLanded, 60);
      return () => clearTimeout(t);
    }

    const spinMs = SPIN_MS / speedFactor;
    const settleMs = SETTLE_MS / speedFactor;

    const raf = requestAnimationFrame(() => {
      setTransition(`transform ${spinMs}ms cubic-bezier(0.12, 0.72, 0.16, 1)`);
      setX(targetX - OVERSHOOT_PX);
    });
    const t1 = setTimeout(() => {
      setTransition(`transform ${settleMs}ms cubic-bezier(0.34, 1.3, 0.7, 1)`);
      setX(targetX);
    }, spinMs);
    const t2 = setTimeout(() => {
      setLanded(true);
      onLanded();
    }, spinMs + settleMs);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportW]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl2 border border-void-700 bg-void-900/60 py-4 shadow-panel"
      style={{
        WebkitMaskImage:
          'linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)',
        maskImage: 'linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)',
      }}
    >
      {/* centre marker */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 -translate-x-1/2">
        <div className="h-full w-0.5 bg-wisp-400/80 shadow-glow" />
        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-wisp-400" />
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 border-x-[5px] border-b-[6px] border-x-transparent border-b-wisp-400" />
      </div>

      <div
        className="flex"
        style={{ transform: `translateX(${x}px)`, transition, willChange: 'transform' }}
      >
        {strip.map((item, i) => (
          <div key={keyFor(item, i)} className="shrink-0" style={{ width: cellWidth }}>
            {renderCell(item, i === WINNER_INDEX, landed)}
          </div>
        ))}
      </div>
    </div>
  );
}
