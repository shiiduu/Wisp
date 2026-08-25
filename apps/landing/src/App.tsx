const MOCKUP_URL = import.meta.env.PROD ? '/mockup/' : 'http://localhost:5174/';
const GITHUB_URL = 'https://github.com/shiiduu/Wisp';

const CHALLENGES = ['AP Mundo', 'Tank Yuumi', 'Full Lethality Soraka', 'Attack Speed Nasus'];

function WispMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="10" fill="var(--color-wisp-500)" opacity="0.18" />
      <circle cx="14" cy="14" r="6" fill="var(--color-wisp-500)" opacity="0.55" />
      <circle cx="14" cy="14" r="2.5" fill="var(--color-wisp-400)" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.14 0 1.54-.01 2.79-.01 3.17 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 8h9M8.5 3.5 13 8l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-void-950 text-mist-100 font-body">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-wisp-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-troll-500/10 blur-3xl" />
      </div>

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <WispMark />
          <span className="font-display text-lg font-semibold tracking-tight">Wisp</span>
        </div>
        <a
          href={GITHUB_URL}
          className="flex items-center gap-2 rounded-full border border-void-700 px-4 py-2 text-sm text-mist-200 transition-colors hover:border-void-600 hover:text-mist-50"
        >
          <GithubIcon />
          GitHub
        </a>
      </header>

      <main className="relative">
        <section className="mx-auto max-w-3xl px-6 pb-20 pt-16 text-center sm:pt-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-void-700 bg-void-900/60 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-wisp-400">
            <span className="h-1.5 w-1.5 rounded-full bg-wisp-500" />
            Built for ARAM Mayhem
          </div>
          <h1 className="text-balance font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
            Your build is optimal.
            <br />
            <span className="text-wisp-400">Wisp doesn't care.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-mist-300 sm:text-lg">
            At the start of every ARAM Mayhem match, Wisp hands you a troll challenge —
            <span className="text-mist-100"> AP Mundo, Tank Yuumi</span>, whatever it feels like — then
            nudges your items and augments toward it instead of the build you actually want.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={MOCKUP_URL}
              className="group flex items-center gap-2 rounded-full bg-wisp-500 px-6 py-3 font-medium text-void-950 shadow-glow transition-transform hover:scale-[1.02]"
            >
              View live mockup
              <span className="transition-transform group-hover:translate-x-0.5">
                <ArrowIcon />
              </span>
            </a>
            <a
              href={GITHUB_URL}
              className="flex items-center gap-2 rounded-full border border-void-700 px-6 py-3 font-medium text-mist-200 transition-colors hover:border-void-600 hover:text-mist-50"
            >
              <GithubIcon />
              Source
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-20">
          <div className="rounded-xl2 border border-void-700 bg-void-900/50 p-6 shadow-panel sm:p-8">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-mist-400">
              This game's challenge
            </p>
            <div className="flex flex-wrap gap-3">
              {CHALLENGES.map((challenge, i) => (
                <span
                  key={challenge}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${
                    i === 0
                      ? 'border-troll-500/40 bg-troll-500/10 text-troll-400'
                      : 'border-void-700 text-mist-400'
                  }`}
                >
                  {challenge}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl2 border border-void-700 bg-void-900/40 p-6">
              <div className="mb-3 font-display text-2xl font-semibold text-wisp-400">01</div>
              <h3 className="mb-1.5 font-display text-base font-semibold">Get a challenge</h3>
              <p className="text-sm text-mist-400">
                Loading screen rolls a troll build target for your champion — sometimes cursed,
                always in play.
              </p>
            </div>
            <div className="rounded-xl2 border border-void-700 bg-void-900/40 p-6">
              <div className="mb-3 font-display text-2xl font-semibold text-wisp-400">02</div>
              <h3 className="mb-1.5 font-display text-base font-semibold">Get nudged</h3>
              <p className="text-sm text-mist-400">
                Live item and augment recommendations lean toward the challenge, not the
                theoretically-correct build.
              </p>
            </div>
            <div className="rounded-xl2 border border-void-700 bg-void-900/40 p-6">
              <div className="mb-3 font-display text-2xl font-semibold text-wisp-400">03</div>
              <h3 className="mb-1.5 font-display text-base font-semibold">Get reacted to</h3>
              <p className="text-sm text-mist-400">
                A companion character watches the match and reacts live to kills and the
                occasional funny number.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative mx-auto max-w-5xl px-6 pb-10 text-center text-xs text-mist-400">
        Wisp is an independent fan project, not affiliated with or endorsed by Riot Games.
      </footer>
    </div>
  );
}
