import { useMemo, useState } from 'react';
import type { Champion, ChampionSummary } from '@wisp/data/types';
import { InfoTooltip } from '@wisp/ui';
import {
  BUILD_TAGS,
  pickTrollDirection,
  resolveItemStyle,
  scoreAllTags,
  type BuildTag,
  type ItemStyle,
} from '@wisp/engine';
import championsData from '@wisp/data/champions.json';
import { ChampionIcon } from './ChampionIcon';
import { loadChampionDetail } from './championDetail';
import { RollCarousel } from './RollCarousel';
import { TAG_VISUALS } from './tagVisuals';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const MOCKUP_URL = import.meta.env.PROD ? '/Wisp/mockup/' : 'http://localhost:5174/';

const CHAMPIONS = (championsData.champions as ChampionSummary[])
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

type Mode = 'random' | 'pick';
type Phase = 'rolling-champion' | 'champion-landed' | 'rolling-build' | 'build-landed';

interface RunState {
  champion: Champion;
  summary: ChampionSummary;
  tag: BuildTag;
  itemStyle: ItemStyle;
  phase: Phase;
}

async function computeResult(
  summary: ChampionSummary,
): Promise<Omit<RunState, 'phase'> | null> {
  const champion = await loadChampionDetail(summary.id);
  if (!champion) return null;
  const tag = pickTrollDirection(scoreAllTags(champion)).tag;
  // Finer archetype axis, resolved from the champion's kit — passed forward
  // so the mockup renders exactly what the preview computed.
  const itemStyle = resolveItemStyle(champion, tag);
  return { champion, summary, tag, itemStyle };
}

function navigateToMockup(run: Pick<RunState, 'champion' | 'tag' | 'itemStyle'>) {
  const url = new URL(MOCKUP_URL, window.location.href);
  url.searchParams.set('champion', run.champion.id);
  url.searchParams.set('tag', run.tag);
  url.searchParams.set('style', run.itemStyle);
  window.location.href = url.toString();
}

function WispMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="10" fill="var(--color-wisp-500)" opacity="0.18" />
      <circle cx="14" cy="14" r="6" fill="var(--color-wisp-500)" opacity="0.55" />
      <circle cx="14" cy="14" r="2.5" fill="var(--color-wisp-400)" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function DiceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="9" r="1.3" fill="currentColor" />
      <circle cx="15" cy="15" r="1.3" fill="currentColor" />
      <circle cx="15" cy="9" r="1.3" fill="currentColor" />
      <circle cx="9" cy="15" r="1.3" fill="currentColor" />
    </svg>
  );
}

const CHAMPION_CELL_W = 78;
const TAG_CELL_W = 100;

function ChampionCell({
  summary,
  isWinner,
  landed,
}: {
  summary: ChampionSummary;
  isWinner: boolean;
  landed: boolean;
}) {
  return (
    <div className="flex items-center justify-center py-1">
      <ChampionIcon
        iconPath={summary.iconPath}
        alt={summary.name}
        className={`h-14 w-14 border transition-shadow ${
          isWinner && landed
            ? 'border-wisp-400 shadow-glow'
            : 'border-white/10 opacity-90'
        }`}
      />
    </div>
  );
}

function TagCell({
  tag,
  isWinner,
  landed,
}: {
  tag: BuildTag;
  isWinner: boolean;
  landed: boolean;
}) {
  const v = TAG_VISUALS[tag];
  const lit = isWinner && landed;
  return (
    <div className="px-1 py-1">
      <div
        className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3"
        style={{
          color: v.color,
          borderColor: lit ? v.color : 'var(--color-void-700)',
          background: lit ? `color-mix(in oklch, ${v.color} 14%, transparent)` : 'transparent',
          boxShadow: lit ? `0 0 20px color-mix(in oklch, ${v.color} 35%, transparent)` : 'none',
        }}
      >
        <v.Icon width={22} height={22} />
        <span className="font-display text-xs font-semibold tracking-wide">{v.label}</span>
      </div>
    </div>
  );
}

/** Big landed BuildTag card + the secondary ItemStyle reveal underneath. */
function BuildReveal({
  championName,
  tag,
  itemStyle,
}: {
  championName: string;
  tag: BuildTag;
  itemStyle: ItemStyle;
}) {
  const v = TAG_VISUALS[tag];
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-troll-400">
        Tonight&apos;s troll challenge
      </p>
      <div
        className="flex items-center gap-3 rounded-xl2 border px-6 py-4"
        style={{
          color: v.color,
          borderColor: v.color,
          background: `color-mix(in oklch, ${v.color} 12%, transparent)`,
          boxShadow: `0 0 32px color-mix(in oklch, ${v.color} 35%, transparent)`,
        }}
      >
        <v.Icon width={30} height={30} />
        <span className="font-display text-3xl font-semibold tracking-tight">
          {tag} {championName}
        </span>
      </div>
      <p className="animate-[fadeUp_0.4s_ease-out] text-sm text-mist-300">
        <span style={{ color: v.color }}>{tag}</span>
        <span className="mx-2 text-mist-500">→</span>
        <span className="font-medium text-mist-100">{itemStyle}</span>
      </p>
      <p className="text-sm text-mist-400">Loading the build overlay…</p>
    </div>
  );
}

export default function App() {
  const reducedMotion = usePrefersReducedMotion();
  const [mode, setMode] = useState<Mode>('random');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<RunState | null>(null);

  // Dev-only repeat-testing controls.
  const [devInstant, setDevInstant] = useState(false);
  const [speedFactor, setSpeedFactor] = useState(1);
  const instant = reducedMotion || devInstant;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? CHAMPIONS.filter((c) => c.name.toLowerCase().includes(q)) : CHAMPIONS;
  }, [query]);

  async function startRandomRoll() {
    if (busy) return;
    setBusy(true);
    const summary = CHAMPIONS[Math.floor(Math.random() * CHAMPIONS.length)];
    const result = await computeResult(summary);
    setBusy(false);
    if (!result) return;
    setRun({ ...result, phase: 'rolling-champion' });
  }

  async function startPickRoll(summary: ChampionSummary) {
    if (busy) return;
    setBusy(true);
    const result = await computeResult(summary);
    setBusy(false);
    if (!result) return;
    setRun({ ...result, phase: 'rolling-build' });
  }

  function onChampionLanded() {
    setRun((r) => (r ? { ...r, phase: 'champion-landed' } : r));
    window.setTimeout(
      () => setRun((r) => (r ? { ...r, phase: 'rolling-build' } : r)),
      instant ? 200 : 750,
    );
  }

  function onBuildLanded() {
    setRun((r) => (r ? { ...r, phase: 'build-landed' } : r));
    window.setTimeout(() => {
      setRun((r) => {
        if (r) navigateToMockup(r);
        return r;
      });
    }, instant ? 1000 : 2000);
  }

  return (
    <div className="relative min-h-screen bg-void-950 font-body text-mist-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-wisp-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-troll-500/10 blur-3xl" />
      </div>

      <header className="relative mx-auto flex max-w-5xl items-center gap-2 px-6 py-6">
        <WispMark />
        <span className="font-display text-lg font-semibold tracking-tight">Wisp</span>
      </header>

      <main className="relative mx-auto max-w-5xl px-6 pb-16">
        <div className="mb-6 flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Roll a troll challenge</h1>
          <InfoTooltip label="About this recommendation" side="bottom">
            Wisp analyzes the champion&apos;s real kit and stats and scores every possible build
            direction — this is Wisp&apos;s own scoring logic, not an official Riot recommendation.
            The spin is just presentation; it always lands on the real result.
          </InfoTooltip>
        </div>

        {/* mode switch */}
        <div className="mb-8 inline-flex rounded-full border border-void-700 bg-void-900/60 p-1 text-sm">
          {(
            [
              ['random', 'Randomize everything'],
              ['pick', 'Pick my champion'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                mode === value
                  ? 'bg-wisp-500 text-void-950'
                  : 'text-mist-300 hover:text-mist-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'random' ? (
          <div className="flex flex-col items-start gap-4">
            <p className="max-w-md text-sm text-mist-400">
              Wisp picks a random champion and rolls an off-role build direction for it — two
              spins, one result.
            </p>
            <button
              type="button"
              onClick={startRandomRoll}
              disabled={busy}
              className="group flex items-center gap-2 rounded-full bg-wisp-500 px-6 py-3 font-medium text-void-950 shadow-glow transition-transform hover:scale-[1.02] disabled:cursor-wait disabled:opacity-70"
            >
              <DiceIcon />
              {busy ? 'Rolling…' : 'Roll'}
            </button>
          </div>
        ) : (
          <>
            <div className="relative mb-6 max-w-sm">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-500">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search champions…"
                className="w-full rounded-full border border-void-700 bg-void-900/60 py-2 pl-9 pr-4 text-sm text-mist-100 placeholder:text-mist-500 focus:border-wisp-500/50 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {filtered.map((champion) => (
                <button
                  key={champion.id}
                  type="button"
                  disabled={busy}
                  onClick={() => startPickRoll(champion)}
                  className="group flex flex-col items-center gap-1.5 rounded-lg border border-void-700 bg-void-900/40 p-2 text-center transition-colors hover:border-wisp-500/50 hover:bg-void-900/70 disabled:cursor-wait"
                >
                  <ChampionIcon
                    iconPath={champion.iconPath}
                    alt={champion.name}
                    className="h-12 w-12 border border-white/10"
                  />
                  <span className="line-clamp-1 text-[11px] text-mist-300 group-hover:text-mist-100">
                    {champion.name}
                  </span>
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <p className="mt-8 text-center text-sm text-mist-500">No champions match "{query}".</p>
            )}
          </>
        )}
      </main>

      {run && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-void-950/92 px-6 backdrop-blur-sm">
          {(run.phase === 'rolling-champion' || run.phase === 'champion-landed') && (
            <div className="flex w-full max-w-2xl flex-col items-center gap-4">
              <p className="text-xs font-medium uppercase tracking-widest text-mist-400">
                Rolling champion
              </p>
              <RollCarousel
                key={`champ-${run.champion.id}`}
                pool={CHAMPIONS}
                winner={run.summary}
                keyFor={(c, i) => `${c.id}-${i}`}
                renderCell={(c, isWinner, landed) => (
                  <ChampionCell summary={c} isWinner={isWinner} landed={landed} />
                )}
                cellWidth={CHAMPION_CELL_W}
                onLanded={onChampionLanded}
                instant={instant}
                speedFactor={speedFactor}
              />
              {run.phase === 'champion-landed' && (
                <p className="animate-[fadeUp_0.3s_ease-out] font-display text-xl font-semibold">
                  {run.champion.name}
                </p>
              )}
            </div>
          )}

          {run.phase === 'rolling-build' && (
            <div className="flex w-full max-w-2xl flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-mist-400">
                <ChampionIcon
                  iconPath={run.champion.iconPath}
                  alt={run.champion.name}
                  className="h-6 w-6 border border-white/10"
                />
                Rolling build direction for {run.champion.name}
              </div>
              <RollCarousel
                key={`build-${run.champion.id}-${run.tag}`}
                pool={[...BUILD_TAGS]}
                winner={run.tag}
                keyFor={(t, i) => `${t}-${i}`}
                renderCell={(t, isWinner, landed) => (
                  <TagCell tag={t} isWinner={isWinner} landed={landed} />
                )}
                cellWidth={TAG_CELL_W}
                onLanded={onBuildLanded}
                instant={instant}
                speedFactor={speedFactor}
              />
            </div>
          )}

          {run.phase === 'build-landed' && (
            <BuildReveal
              championName={run.champion.name}
              tag={run.tag}
              itemStyle={run.itemStyle}
            />
          )}
        </div>
      )}

      {import.meta.env.DEV && (
        <div className="fixed bottom-3 right-3 z-[60] flex items-center gap-2 rounded-lg border border-troll-500/40 bg-void-900/90 px-3 py-2 text-[11px] font-medium text-mist-300 shadow-panel">
          <span className="uppercase tracking-widest text-troll-400">dev</span>
          <button
            type="button"
            onClick={() => setDevInstant((v) => !v)}
            className="rounded border border-void-600 px-2 py-1 hover:border-troll-500/50"
          >
            instant: {devInstant ? 'on' : 'off'}
          </button>
          <button
            type="button"
            onClick={() => setSpeedFactor((s) => (s === 1 ? 3 : s === 3 ? 8 : 1))}
            className="rounded border border-void-600 px-2 py-1 hover:border-troll-500/50"
          >
            speed ×{speedFactor}
          </button>
          {run && (
            <button
              type="button"
              onClick={() => navigateToMockup(run)}
              className="rounded border border-void-600 px-2 py-1 hover:border-troll-500/50"
            >
              skip →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
