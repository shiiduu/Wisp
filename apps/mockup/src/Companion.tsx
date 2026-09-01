import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { NoGoRect } from './useNoGoZones';
import { preloadCompanionSprites, type CompanionSpriteState } from './companionAssets';

export type ReactionKind = 'kill' | 'funny-number' | 'scared' | 'penta' | null;

interface CompanionProps {
  reaction: ReactionKind;
  onReactionEnd: () => void;
  noGoZones: NoGoRect[];
}

const WANDER_MOVE_MS = 1400; // duration of one drift hop (drives the position CSS transition)
const IDLE_MIN_MS = 4000;
const IDLE_MAX_MS = 22000;
const STEP_PERCENT = 3.5; // max drift per hop, in percent-of-viewport
const MARGIN = 4;

// Sprite footprint — was 112px (Tailwind h-28/w-28) and rendered too small
// against the surrounding panels; now ~1.7x that. Collision math and the
// sparkle burst radius both derive from this so they can't drift out of
// sync with the actual rendered size again.
const SPRITE_SIZE_PX = 192;
const GLOW_BLEED_PX = 16; // matches the drop-shadow blur radius applied below
// Was hardcoded to 40 (a leftover from the original 72px placeholder blob)
// — half of even the previous 112px sprite is already 56, so the no-go-zone
// buffer had been too tight since the sprite-set swap, before this fix.
const MASCOT_RADIUS_PX = SPRITE_SIZE_PX / 2 + GLOW_BLEED_PX;
const MAX_STEP_ATTEMPTS = 12;
const MAX_ESCAPE_ATTEMPTS = 80;

const FADE_MS = 220;

// Dims the sprite art itself (not the glow) so it sits into the dark theme
// instead of popping off it.
const COMPANION_BRIGHTNESS = 0.72;
const COMPANION_SATURATION = 0.88;

type BaseState = 'idle' | 'moving';

const REACTION_TO_SPRITE: Record<Exclude<ReactionKind, null>, CompanionSpriteState> = {
  kill: 'kill',
  'funny-number': 'funnynumber',
  scared: 'scared',
  penta: 'penta',
};

// Penta ("jackpot") holds noticeably longer than the other reactions.
const REACTION_HOLD_MS: Record<Exclude<ReactionKind, null>, number> = {
  kill: 2000,
  'funny-number': 2000,
  scared: 2000,
  penta: 3600,
};

const REACTION_BUBBLE_STYLES: Record<Exclude<ReactionKind, null>, string> = {
  kill: 'border-troll-500/50 bg-troll-500/15 text-troll-400',
  scared: 'border-troll-500/50 bg-troll-500/15 text-troll-400',
  'funny-number': 'border-gold-500/50 bg-gold-500/15 text-gold-500',
  penta: 'border-2 border-gold-500/70 bg-gold-500/20 text-gold-500',
};

function ReactionLabel({ reaction }: { reaction: Exclude<ReactionKind, null> }) {
  switch (reaction) {
    case 'kill':
      return (
        <>
          <span className="text-sm">⚔</span> nice one!
        </>
      );
    case 'funny-number':
      return (
        <>
          <span className="font-mono">69</span> nice.
        </>
      );
    case 'scared':
      return (
        <>
          <span className="text-sm">😱</span> uh oh...
        </>
      );
    case 'penta':
      return (
        <>
          <span className="text-sm">🏆</span> PENTAKILL!
        </>
      );
  }
}

function isBlocked(x: number, y: number, bufX: number, bufY: number, zones: NoGoRect[]): boolean {
  return zones.some((z) => x + bufX > z.x0 && x - bufX < z.x1 && y + bufY > z.y0 && y - bufY < z.y1);
}

function currentBuffers() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return { bufX: (MASCOT_RADIUS_PX / vw) * 100, bufY: (MASCOT_RADIUS_PX / vh) * 100 };
}

interface SparkleParticle {
  id: number;
  dx: number;
  dy: number;
  size: number;
  delay: number;
  duration: number;
}

// Burst travel distance is a fraction of the sprite footprint so it stays
// proportionate if SPRITE_SIZE_PX ever changes again — tuned at ~0.25x/0.5x
// (normal/big) of the sprite size against the current 192px sprite.
const SPARKLE_DIST_NORMAL_BASE = SPRITE_SIZE_PX * 0.25;
const SPARKLE_DIST_NORMAL_RANGE = SPRITE_SIZE_PX * 0.18;
const SPARKLE_DIST_BIG_BASE = SPRITE_SIZE_PX * 0.49;
const SPARKLE_DIST_BIG_RANGE = SPRITE_SIZE_PX * 0.4;

function SparkleBurst({ big, onDone }: { big: boolean; onDone: () => void }) {
  const particles = useMemo<SparkleParticle[]>(() => {
    const count = big ? 16 : 6;
    const distBase = big ? SPARKLE_DIST_BIG_BASE : SPARKLE_DIST_NORMAL_BASE;
    const distRange = big ? SPARKLE_DIST_BIG_RANGE : SPARKLE_DIST_NORMAL_RANGE;
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const dist = distBase + Math.random() * distRange;
      return {
        id: i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - dist * 0.35,
        size: (big ? 7 : 4) + Math.random() * (big ? 8 : 5),
        delay: Math.random() * (big ? 220 : 120),
        duration: (big ? 1100 : 650) + Math.random() * (big ? 500 : 250),
      };
    });
  }, [big]);

  useEffect(() => {
    const lifetime = Math.max(...particles.map((p) => p.delay + p.duration));
    const id = setTimeout(onDone, lifetime + 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- particles is stable for this mount
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute left-1/2 top-1/2 rounded-full bg-gold-500"
          style={
            {
              width: p.size,
              height: p.size,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              animation: `wisp-sparkle ${p.duration}ms ease-out ${p.delay}ms forwards`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function Companion({ reaction, onReactionEnd, noGoZones }: CompanionProps) {
  // Top-middle open area is where this mockup's layout leaves room to wander.
  const [pos, setPos] = useState({ x: 50, y: 24 });
  const posRef = useRef(pos);
  posRef.current = pos;

  const [baseState, setBaseState] = useState<BaseState>('idle');
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  // Chroma-keyed + crop-normalized sprite URLs — see companionAssets.ts.
  // Nothing is rendered until this resolves, so there's never a raw
  // white-background flash while it's still processing.
  const [sprites, setSprites] = useState<Record<CompanionSpriteState, string> | null>(null);
  useEffect(() => {
    let cancelled = false;
    preloadCompanionSprites().then((map) => {
      if (!cancelled) setSprites(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Wander scheduler: alternates idle pauses with drift hops.
  useEffect(() => {
    let cancelled = false;
    let phaseTimer: ReturnType<typeof setTimeout> | undefined;

    function scheduleIdle() {
      setBaseState('idle');

      const pause = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS);
      phaseTimer = setTimeout(() => {
        hop();
      }, pause);
    }

    function hop() {
      const { bufX, bufY } = currentBuffers();
      const { x, y } = posRef.current;
      let moved = false;

      for (let i = 0; i < MAX_STEP_ATTEMPTS; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = STEP_PERCENT * (0.4 + Math.random() * 0.6);
        const dx = Math.cos(angle) * dist;
        const nx = Math.min(100 - MARGIN, Math.max(MARGIN, x + dx));
        const ny = Math.min(100 - MARGIN, Math.max(MARGIN, y + Math.sin(angle) * dist * 0.65));
        if (!isBlocked(nx, ny, bufX, bufY, noGoZones)) {
          setDirection(dx < 0 ? 'left' : 'right');
          setBaseState('moving');
          setPos({ x: nx, y: ny });
          moved = true;
          break;
        }
      }

      phaseTimer = setTimeout(() => {
        if (!cancelled) scheduleIdle();
      }, moved ? WANDER_MOVE_MS : 300);
    }

    scheduleIdle();
    return () => {
      cancelled = true;
      clearTimeout(phaseTimer);
    };
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

  // Reaction states always interrupt idle/moving immediately and hold for
  // a fixed duration before handing control back.
  useEffect(() => {
    if (!reaction) return;
    const id = setTimeout(onReactionEnd, REACTION_HOLD_MS[reaction]);
    return () => clearTimeout(id);
  }, [reaction, onReactionEnd]);

  const displayState: CompanionSpriteState = reaction ? REACTION_TO_SPRITE[reaction] : baseState;

  // Cross-fade: on every displayState change, the outgoing layer fades out
  // while the incoming one fades in, both via CSS animation (so no
  // two-phase mount-then-animate dance is needed) — never a hard cut.
  const layerIdRef = useRef(0);
  const [layers, setLayers] = useState<{ id: number; state: CompanionSpriteState; phase: 'in' | 'out' }[]>([
    { id: 0, state: displayState, phase: 'in' },
  ]);
  const prevDisplayStateRef = useRef(displayState);

  useEffect(() => {
    if (displayState === prevDisplayStateRef.current) return;
    prevDisplayStateRef.current = displayState;
    const outgoingId = layerIdRef.current;
    const incomingId = ++layerIdRef.current;
    setLayers((prev) => [
      ...prev.map((l) => (l.id === outgoingId ? { ...l, phase: 'out' as const } : l)),
      { id: incomingId, state: displayState, phase: 'in' as const },
    ]);
    // Prune only this transition's retired layer, not everything but the
    // newest — if another transition fires before this timeout runs (rapid
    // reaction re-triggers), a filter-down-to-incomingId here would wipe
    // out that newer incoming layer too.
    const timeout = setTimeout(() => {
      setLayers((prev) => prev.filter((l) => l.id !== outgoingId));
    }, FADE_MS + 40);
    return () => clearTimeout(timeout);
  }, [displayState]);

  // Sparkle burst on kill / funny-number / penta (not scared — nothing to
  // celebrate there). Penta gets the "big" burst variant.
  const sparkleIdRef = useRef(0);
  const [sparkleBurst, setSparkleBurst] = useState<{ id: number; big: boolean } | null>(null);
  useEffect(() => {
    if (reaction === 'kill' || reaction === 'funny-number' || reaction === 'penta') {
      sparkleIdRef.current += 1;
      setSparkleBurst({ id: sparkleIdRef.current, big: reaction === 'penta' });
    }
  }, [reaction]);

  // Penta additionally gets a one-shot scale-up "pop" on entry (remounting
  // this key restarts the CSS animation cleanly instead of a plain fade).
  const pentaPopIdRef = useRef(0);
  const [pentaPopId, setPentaPopId] = useState(0);
  useEffect(() => {
    if (reaction === 'penta') {
      pentaPopIdRef.current += 1;
      setPentaPopId(pentaPopIdRef.current);
    }
  }, [reaction]);

  if (!sprites) return null;

  const isReacting = reaction !== null;
  const isMoving = baseState === 'moving' && !isReacting;
  const isFlipped = direction === 'left' && displayState === 'moving';

  return (
    <div
      className="pointer-events-none absolute z-30 transition-[left,top] ease-in-out"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: 'translate(-50%, -50%)',
        transitionDuration: `${WANDER_MOVE_MS}ms`,
      }}
    >
      <div className="relative flex flex-col items-center">
        {reaction && (
          <div
            className={`absolute -top-14 flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold shadow-panel ${REACTION_BUBBLE_STYLES[reaction]}`}
            style={{ animation: `wisp-pop ${REACTION_HOLD_MS[reaction]}ms ease-out forwards` }}
          >
            <ReactionLabel reaction={reaction} />
            <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-inherit bg-inherit" />
          </div>
        )}

        {/* Continuous bob: subtle float + scale pulse, always running. */}
        <div
          className="relative drop-shadow-[0_0_16px_oklch(0.78_0.14_190_/_0.45)]"
          style={{
            width: SPRITE_SIZE_PX,
            height: SPRITE_SIZE_PX,
            animation: 'wisp-bob 3.4s ease-in-out infinite',
          }}
        >
          {/* Rotation wobble while drifting — separate element so it doesn't
              clobber the bob wrapper's own transform. */}
          <div
            className="relative h-full w-full"
            style={{ animation: isMoving ? 'wisp-wobble 1.1s ease-in-out infinite' : undefined }}
          >
            {/* Flip for leftward travel — separate element for the same reason. */}
            <div
              key={pentaPopId}
              className="relative h-full w-full"
              style={{
                transform: isFlipped ? 'scaleX(-1)' : undefined,
                animation:
                  reaction === 'penta'
                    ? 'wisp-penta-pop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both'
                    : undefined,
              }}
            >
              {layers.map((layer) => (
                <img
                  key={layer.id}
                  src={sprites[layer.state]}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{
                    // The source art is bright/high-saturation and stood out
                    // too much against the mockup's dark theme — dim it a
                    // touch so it reads as part of the UI rather than
                    // floating on top of it.
                    filter: `brightness(${COMPANION_BRIGHTNESS}) saturate(${COMPANION_SATURATION})`,
                    animation: `${layer.phase === 'in' ? 'wisp-fade-in' : 'wisp-fade-out'} ${FADE_MS}ms ease forwards`,
                  }}
                />
              ))}
            </div>
          </div>

          {sparkleBurst && (
            <SparkleBurst
              key={sparkleBurst.id}
              big={sparkleBurst.big}
              onDone={() => setSparkleBurst(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
