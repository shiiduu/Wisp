import { useMemo, useState } from 'react';
import type { Champion, ChampionSummary } from '@wisp/data/types';
import { InfoTooltip } from '@wisp/ui';
import { pickTrollDirection, scoreAllTags, type BuildTag } from '@wisp/engine';
import championsData from '@wisp/data/champions.json';
import { ChampionIcon } from './ChampionIcon';
import { loadChampionDetail } from './championDetail';

const MOCKUP_URL = import.meta.env.PROD ? '/Wisp/mockup/' : 'http://localhost:5174/';
const REVEAL_DURATION_MS = 1500;

const CHAMPIONS = (championsData.champions as ChampionSummary[])
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

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

interface Reveal {
  champion: Champion;
  tag: BuildTag;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CHAMPIONS;
    return CHAMPIONS.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  async function pickChampion(summary: ChampionSummary) {
    if (pickingId) return;
    setPickingId(summary.id);
    const champion = await loadChampionDetail(summary.id);
    if (!champion) {
      setPickingId(null);
      return;
    }
    const scores = scoreAllTags(champion);
    const tag = pickTrollDirection(scores).tag;
    setReveal({ champion, tag });
    window.setTimeout(() => {
      const url = new URL(MOCKUP_URL, window.location.href);
      url.searchParams.set('champion', champion.id);
      url.searchParams.set('tag', tag);
      window.location.href = url.toString();
    }, REVEAL_DURATION_MS);
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
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Choose your champion
          </h1>
          <InfoTooltip label="About this recommendation" side="bottom">
            Wisp analyzes the selected champion&apos;s real kit and stats and scores every
            possible build direction — this is Wisp&apos;s own scoring logic, not an official
            Riot recommendation.
          </InfoTooltip>
        </div>

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
              disabled={pickingId !== null}
              onClick={() => pickChampion(champion)}
              className={`group flex flex-col items-center gap-1.5 rounded-lg border border-void-700 bg-void-900/40 p-2 text-center transition-colors hover:border-wisp-500/50 hover:bg-void-900/70 disabled:cursor-wait ${
                pickingId === champion.id ? 'animate-pulse border-wisp-500/50' : ''
              }`}
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
      </main>

      {reveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-950/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <ChampionIcon
              iconPath={reveal.champion.iconPath}
              alt={reveal.champion.name}
              className="h-20 w-20 border-2 border-wisp-500/50 shadow-glow"
            />
            <p className="text-xs font-medium uppercase tracking-widest text-troll-400">
              Tonight&apos;s troll challenge
            </p>
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              {reveal.tag} {reveal.champion.name}
            </h2>
            <p className="text-sm text-mist-400">Loading the build overlay…</p>
          </div>
        </div>
      )}
    </div>
  );
}
