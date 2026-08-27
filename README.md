# Wisp

**Wisp is a second-monitor companion for League of Legends' ARAM Mayhem, built on Overwolf.**

When a match starts, Wisp assigns you a random *troll build challenge* — something
like "AP Mundo" or "Tank Yuumi" — and then spends the game steering you toward it:
live item and augment suggestions plus skill-order guidance, all pointed at the
challenge instead of the build you'd normally rush. The goal is to make
deliberately off-meta builds fun and playable rather than just throwing.

A small companion character sits on screen and reacts to what's happening in the
match — kills, funny stat lines — for a bit of personality on top of the numbers.

## The build engine

This is the part worth showing off. Wisp doesn't ship a hand-written build for
each champion — it works them out.

**Challenges are generated, not authored.** A scoring engine looks at each
champion's actual kit — ability scaling signals, stat growth per level, role — and
rates it against eight build directions: AD, AP, Tank, Bruiser, Attack Speed,
Crit, Support, and Lethality. It sets aside whichever direction is the champion's
own normal role, then picks — weighted by score — a direction that's genuinely
off-meta but still coherent. It won't hand you something that scored so badly it'd
be unplayable.

**Recommendations go a level deeper than the direction.** Within a direction, the
engine distinguishes *how* a champion wants to play it. Two "AP" champions don't
get the same generic item list — a bursty control mage and a durable AP bruiser
pull from meaningfully different item pools.

**The build has structure, not just a ranked stat list.** Every build has a
guaranteed boots slot and one signature, build-defining item. Tank-leaning builds
balance armor and magic resist instead of stacking one. Crit builds are held to a
real crit-chance target. Late-game scaling items (think Rabadon's Deathcap) are
gated behind having some of the build online first, never recommended as a first
buy.

**It runs on live game data.** Items, champions, and augments come from Riot's
Data Dragon and Community Dragon and are refreshed per patch — so the engine
covers the whole champion roster without anyone writing a build for each one.

It's a more involved approach than a stat-matching lookup, but it's still a set of
heuristics — it aims for plausible and interesting, not perfectly optimal.

## Status

- **Live prototype:** an interactive mockup of the in-game window, running on
  example data, is deployed at **https://shiiduu.github.io/Wisp/**
- **Approvals in progress:** applications to both Riot and Overwolf are submitted
  and awaiting review. It's a sequential process — Overwolf's final sign-off needs
  proof of Riot's approval first.
- **Next:** once approved, the app connects to Overwolf's Game Events Provider for
  real in-match data, replacing the mockup's example data.

## Tech stack

pnpm workspaces monorepo — Vite, React, TypeScript, Tailwind CSS. The eventual
live app targets Overwolf Native.

## Local development

```bash
pnpm install     # install dependencies
pnpm dev         # dev servers for the landing page, champion picker, and mockup
pnpm build       # build all three and assemble the static site into dist/
pnpm test        # run the build-engine unit tests
pnpm lint        # lint the workspace
```

Static reference data (items, augments, champions) is generated on demand, not
fetched during dev or build:

```bash
pnpm fetch:items
pnpm fetch:augments
pnpm fetch:champions
```

## Data & compliance

All live match data will come exclusively through Overwolf's official Game Events
Provider — no memory reading, screen-scraping, or input automation. Static
reference data comes from Riot's public Data Dragon and Community Dragon.

Wisp is an independent fan project, not affiliated with or endorsed by Riot Games.
