import { useEffect, useRef, useState } from 'react';
import type { NoGoRect } from './useNoGoZones';

export type ReactionKind = 'kill' | 'funny-number' | null;

interface CompanionProps {
  reaction: ReactionKind;
  onReactionEnd: () => void;
  noGoZones: NoGoRect[];
}

const WANDER_INTERVAL_MS = 1600;
const STEP_PERCENT = 3.5; // max drift per tick, in percent-of-viewport
const MARGIN = 4;
const MASCOT_RADIUS_PX = 40; // includes the glow margin
const MAX_STEP_ATTEMPTS = 12;
const MAX_ESCAPE_ATTEMPTS = 80;

function isBlocked(x: number, y: number, bufX: number, bufY: number, zones: NoGoRect[]): boolean {
  return zones.some((z) => x + bufX > z.x0 && x - bufX < z.x1 && y + bufY > z.y0 && y - bufY < z.y1);
}

function currentBuffers() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return { bufX: (MASCOT_RADIUS_PX / vw) * 100, bufY: (MASCOT_RADIUS_PX / vh) * 100 };
}

export default function Companion({ reaction, onReactionEnd, noGoZones }: CompanionProps) {
  // Top-middle open area is where this mockup's layout leaves room to wander.
  const [pos, setPos] = useState({ x: 50, y: 24 });
  const posRef = useRef(pos);
  posRef.current = pos;

  // Gentle continuous wander: small organic drifts, not teleports.
  useEffect(() => {
    const id = setInterval(() => {
      const { bufX, bufY } = currentBuffers();
      const { x, y } = posRef.current;

      for (let i = 0; i < MAX_STEP_ATTEMPTS; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = STEP_PERCENT * (0.4 + Math.random() * 0.6);
        const nx = Math.min(100 - MARGIN, Math.max(MARGIN, x + Math.cos(angle) * dist));
        const ny = Math.min(100 - MARGIN, Math.max(MARGIN, y + Math.sin(angle) * dist * 0.65));
        if (!isBlocked(nx, ny, bufX, bufY, noGoZones)) {
          setPos({ x: nx, y: ny });
          return;
        }
      }
      // Boxed in this tick — just hold position and try again next tick.
    }, WANDER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [noGoZones]);

  // Self-correct if the layout shifted (e.g. a panel grew) and the
  // mascot's current spot is now covered — jump to any free point.
  useEffect(() => {
    if (noGoZones.length === 0) return;
    const { bufX, bufY } = currentBuffers();
    const { x, y } = posRef.current;
    if (!isBlocked(x, y, bufX, bufY, noGoZones)) return;

    for (let i = 0; i < MAX_ESCAPE_ATTEMPTS; i++) {
      const nx = MARGIN + Math.random() * (100 - 2 * MARGIN);
      const ny = MARGIN + Math.random() * (100 - 2 * MARGIN);
      if (!isBlocked(nx, ny, bufX, bufY, noGoZones)) {
        setPos({ x: nx, y: ny });
        break;
      }
    }
  }, [noGoZones]);

  useEffect(() => {
    if (!reaction) return;
    const id = setTimeout(onReactionEnd, 1600);
    return () => clearTimeout(id);
  }, [reaction, onReactionEnd]);

  const isReacting = reaction !== null;

  return (
    <div
      className="pointer-events-none absolute z-30 transition-[left,top] ease-in-out"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: 'translate(-50%, -50%)',
        transitionDuration: `${WANDER_INTERVAL_MS}ms`,
      }}
    >
      <div className="relative flex flex-col items-center">
        {isReacting && (
          <div
            className={`absolute -top-14 flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold shadow-panel ${
              reaction === 'kill'
                ? 'border-troll-500/50 bg-troll-500/15 text-troll-400'
                : 'border-gold-500/50 bg-gold-500/15 text-gold-500'
            }`}
            style={{ animation: 'wisp-pop 1.6s ease-out forwards' }}
          >
            {reaction === 'kill' ? (
              <>
                <span className="text-sm">⚔</span> nice one!
              </>
            ) : (
              <>
                <span className="font-mono">69</span> nice.
              </>
            )}
            <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-inherit bg-inherit" />
          </div>
        )}

        <svg
          width="72"
          height="72"
          viewBox="0 0 72 72"
          className={`drop-shadow-[0_0_16px_oklch(0.78_0.14_190_/_0.45)] transition-transform duration-300 ${
            isReacting ? 'scale-[1.18]' : 'scale-100'
          }`}
        >
          <ellipse cx="36" cy="60" rx="20" ry="4" fill="black" opacity="0.25" />
          <circle
            cx="36"
            cy="34"
            r="24"
            fill={isReacting ? 'var(--color-gold-500)' : 'var(--color-wisp-500)'}
            opacity="0.22"
            style={{ transition: 'fill 300ms ease' }}
          />
          <path
            d="M36 12c12 0 21 9.5 21 21 0 10-6 17-13 20.5-1.5.7-2.7-1-1.7-2.3 1.6-2 2.5-4.3 2.5-6.7 0-6.6-5.7-12-12.8-12S18.2 38 18.2 44.5c0 6.6 5.7 12 12.8 12 1.2 0 2.3-.15 3.4-.4"
            fill="none"
            stroke="transparent"
          />
          <path
            d="M36 11c13.25 0 24 10.3 24 23 0 9-4.9 16.9-12.2 20.9-2.7 1.5-6 1.9-9 1-4.9-1.5-8.5-5.6-9.5-10.6-.9-4.5.6-9 3.8-11.9-4.6.4-8.4 3.9-9.4 8.6-.5 2.3-1.9 2.3-2.7.3C19.4 38.5 19 34.9 19.7 31.4 21.4 22.6 28.1 15.3 36 11Z"
            fill={isReacting ? 'var(--color-gold-500)' : 'var(--color-wisp-500)'}
            style={{ transition: 'fill 300ms ease' }}
          />
          <circle cx="29" cy="33" r="3" fill="var(--color-void-950)" />
          <circle cx="43" cy="33" r="3" fill="var(--color-void-950)" />
          <path
            d="M30 42q6 5 12 0"
            stroke="var(--color-void-950)"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
