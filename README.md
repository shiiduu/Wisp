# Wisp

Wisp is a second-monitor companion for League of Legends **ARAM Mayhem**.
At the start of a match it hands you a random "troll challenge" (e.g. "AP
Mundo", "Tank Yuumi") and nudges your item and augment recommendations
toward that challenge instead of the theoretically optimal build. A small
animated companion character reacts live to match events alongside it.
Built on the Overwolf Game Events Provider — read-only and display-only,
no memory reading, OCR, or input injection.

## Status

Mockup / prototype stage. The UI (landing page + an interactive
full-viewport mockup of the in-game window) is built with static and
mock-driven data; live game integration is pending Overwolf app approval.

## Tech stack

pnpm workspaces monorepo — Vite, React, TypeScript, Tailwind CSS.

## Local development

```bash
pnpm install       # install dependencies
pnpm dev           # run landing + mockup dev servers
pnpm build         # build both apps into a deployable static site
pnpm lint          # lint the workspace
```

Static game data (items, augments) is generated on demand and is not
fetched automatically:

```bash
pnpm fetch:items
pnpm fetch:augments
```

Wisp is an independent fan project, not affiliated with or endorsed by
Riot Games.
