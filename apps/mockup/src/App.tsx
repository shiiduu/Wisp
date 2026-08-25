import { useEffect, useMemo, useState } from 'react';
import type { Augment, Champion } from '@wisp/data/types';
import { InfoTooltip } from '@wisp/ui';
import { buildPlan, BUILD_TAGS, type BuildTag } from '@wisp/engine';
import augmentsData from '@wisp/data/augments.json';
import itemsData from '@wisp/data/items.json';

import { Panel } from './Panel';
import { CharacterPanel, MAX_PURCHASED_ITEMS, MAX_SELECTED_AUGMENTS } from './CharacterPanel';
import { ItemsToBuy, type ShopEntry } from './ItemsToBuy';
import { SkillOrder } from './SkillOrder';
import { AugmentSelectPopup } from './AugmentSelectPopup';
import { AugmentIcon } from './AugmentIcon';
import Companion, { type ReactionKind } from './Companion';
import { useNoGoZones } from './useNoGoZones';
import { loadChampionDetail } from './championDetail';

const CHAMPION_LEVEL = 14;
const DEFAULT_CHAMPION_ID = 'DrMundo';
const DEFAULT_TAG: BuildTag = 'AP';

// NullAugment is an internal placeholder entry in Community Dragon's data
// (used for empty slots), not a real offerable augment — exclude it.
const AUGMENTS = (augmentsData.augments as Augment[]).filter((a) => a.apiName !== 'NullAugment');
const ITEMS = itemsData.items;

const RARITY_STYLES: Record<string, string> = {
  silver: 'border-void-600 bg-void-800/60 text-mist-300',
  gold: 'border-gold-500/40 bg-gold-500/10 text-gold-500',
  prismatic: 'border-wisp-500/40 bg-wisp-500/10 text-wisp-400',
  unknown: 'border-void-600 bg-void-800/60 text-mist-300',
};

/** Reads ?champion=<id>&tag=<BuildTag> — set by the champion-select page. Falls back to a fixed default for standalone/dev use. */
function readSelectionFromUrl(): { championId: string; tag: BuildTag } {
  const params = new URLSearchParams(window.location.search);
  const championId = params.get('champion') ?? DEFAULT_CHAMPION_ID;
  const tagParam = params.get('tag');
  const tag = (BUILD_TAGS as readonly string[]).includes(tagParam ?? '') ? (tagParam as BuildTag) : DEFAULT_TAG;
  return { championId, tag };
}

function championLetters(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w))
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return letters.slice(0, 2) || '??';
}

function ChallengeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M11 2 13.4 8.2 20 9l-5 4.6L16.4 20 11 16.3 5.6 20 7 13.6 2 9l6.6-.8L11 2Z"
        fill="var(--color-troll-500)"
      />
    </svg>
  );
}

function sampleRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function App() {
  const { championId, tag } = useMemo(readSelectionFromUrl, []);
  const [champion, setChampion] = useState<Champion | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadChampionDetail(championId).then((loaded) => {
      if (!cancelled) setChampion(loaded ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [championId]);

  if (!champion) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-void-950">
        <div className="h-16 w-16 animate-pulse rounded-full bg-wisp-500/20" />
      </div>
    );
  }

  return <Mockup champion={champion} tag={tag} />;
}

function Mockup({ champion, tag }: { champion: Champion; tag: BuildTag }) {
  const plan = useMemo(() => buildPlan(champion, tag, ITEMS, AUGMENTS), [champion, tag]);

  const [reaction, setReaction] = useState<ReactionKind>(null);
  const [gold] = useState(4269);
  const [cs] = useState(187);

  const [shopEntries, setShopEntries] = useState<ShopEntry[]>(() =>
    plan.shopItems.map(({ item, recommended }) => ({ item, recommended })),
  );
  const [purchased, setPurchased] = useState<ShopEntry[]>(() =>
    plan.ownedItems.map((item) => ({ item })),
  );
  const [selectedAugments, setSelectedAugments] = useState<Augment[]>([]);
  const [popupChoices, setPopupChoices] = useState<Augment[] | null>(null);
  const [popupRecommendation, setPopupRecommendation] = useState<string | null>(null);

  const isInventoryFull = purchased.length >= MAX_PURCHASED_ITEMS;
  const isAugmentsFull = selectedAugments.length >= MAX_SELECTED_AUGMENTS;

  const noGoZones = useNoGoZones([
    shopEntries.length,
    purchased.length,
    selectedAugments.length,
  ]);

  function buyItem(itemId: number) {
    if (isInventoryFull) return;
    setShopEntries((prev) => {
      const entry = prev.find((e) => e.item.id === itemId);
      if (!entry) return prev;
      setPurchased((p) =>
        p.length >= MAX_PURCHASED_ITEMS || p.some((e) => e.item.id === itemId)
          ? p
          : [...p, entry],
      );
      return prev.filter((e) => e.item.id !== itemId);
    });
  }

  function removeItem(itemId: number) {
    setPurchased((prev) => {
      const entry = prev.find((e) => e.item.id === itemId);
      if (!entry) return prev;
      setShopEntries((s) => (s.some((e) => e.item.id === itemId) ? s : [...s, entry]));
      return prev.filter((e) => e.item.id !== itemId);
    });
  }

  function removeAugment(apiName: string) {
    setSelectedAugments((prev) => prev.filter((a) => a.apiName !== apiName));
  }

  function openAugmentPopup() {
    if (isAugmentsFull) return;
    const choices = sampleRandom(AUGMENTS, 3);
    setPopupChoices(choices);
    setPopupRecommendation(choices[Math.floor(Math.random() * choices.length)].apiName);
  }

  function selectAugment(augment: Augment) {
    setSelectedAugments((prev) => {
      if (prev.length >= MAX_SELECTED_AUGMENTS) return prev;
      if (prev.some((a) => a.apiName === augment.apiName)) return prev;
      return [...prev, augment];
    });
    setPopupChoices(null);
    setPopupRecommendation(null);
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-void-950 font-body text-mist-100">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-32 left-1/3 h-96 w-96 rounded-full bg-wisp-500/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-troll-500/10 blur-3xl" />
      </div>

      <div className="relative z-20 flex h-full w-full flex-col gap-5 p-6">
        <Panel
          title="Tonight's troll challenge"
          info={
            <InfoTooltip label="About the challenge" side="bottom">
              This challenge comes from Wisp&apos;s own scoring engine — it analyzes{' '}
              {champion.name}&apos;s real kit and stats, not data from Riot or Community Dragon
              directly.
            </InfoTooltip>
          }
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <ChallengeIcon />
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {plan.challengeTitle}
              </h1>
              <p className="text-sm text-mist-400">{plan.challengeSubtitle}</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex items-center gap-2 rounded-full border border-wisp-500/30 bg-wisp-500/10 px-4 py-1.5 text-sm font-medium text-wisp-400">
              <span className="h-1.5 w-1.5 rounded-full bg-wisp-500" />
              On track
            </div>
            <InfoTooltip label="Data & privacy" side="bottom" align="end">
              Live match data comes only from the Overwolf Game Events Provider (GameID 5426) —
              no other channel. No memory reading, OCR, input injection, or fog-of-war access.
              Wisp is read-only and display-only.
            </InfoTooltip>
          </div>
        </Panel>

        <div className="flex min-h-0 flex-1 gap-6">
          <CharacterPanel
            championName={champion.name}
            championLetters={championLetters(champion.name)}
            gold={gold}
            cs={cs}
            championInfo={
              <InfoTooltip label="About champion selection" side="bottom">
                Champion is assigned by ARAM&apos;s random/limited pool, not freely picked — Wisp
                doesn&apos;t control or influence champion selection.
              </InfoTooltip>
            }
            purchased={purchased}
            purchasedInfo={
              <InfoTooltip label="About item data">
                Item names, icons and prices come from static, local JSON generated from Riot
                Data Dragon. What you own here is currently mock/manual data (click a purchased
                item to remove it, for testing) — later it will update live from your actual
                in-game purchases via GEP.
              </InfoTooltip>
            }
            selectedAugments={selectedAugments}
            onDropItem={buyItem}
            onRemoveItem={removeItem}
            onRemoveAugment={removeAugment}
          />

          <div className="flex min-h-0 flex-1 flex-col">
            {/* Open space above — this is where the mascot mostly wanders. */}
            <div className="flex-1" />

            <ItemsToBuy entries={shopEntries} onBuy={buyItem} disabled={isInventoryFull} />
          </div>

          <div className="flex w-80 shrink-0 flex-col gap-5">
            <Panel
              title="Best augments"
              info={
                <InfoTooltip label="About augment data">
                  Augment name, icon and description are static, local JSON generated from
                  Community Dragon&apos;s Arena augment data — never fetched live. Ranking against
                  the current build direction is Wisp&apos;s own heuristic.
                </InfoTooltip>
              }
            >
              <div className="space-y-3">
                <div
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${RARITY_STYLES[plan.featuredAugment.rarity]}`}
                >
                  <AugmentIcon
                    apiName={plan.featuredAugment.apiName}
                    alt={plan.featuredAugment.name}
                    className="mt-0.5 h-8 w-8 border border-white/10"
                  />
                  <div>
                    <p className="text-sm font-medium">{plan.featuredAugment.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-mist-400">
                      {plan.featuredAugment.description}
                    </p>
                  </div>
                </div>
                {plan.otherAugmentNames.map((name) => (
                  <div key={name} className="rounded-lg border border-void-700 px-3 py-2.5">
                    <p className="text-sm text-mist-300">{name}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <SkillOrder currentLevel={CHAMPION_LEVEL} priority={plan.skillPriority} />
          </div>
        </div>
      </div>

      <Companion
        reaction={reaction}
        onReactionEnd={() => setReaction(null)}
        noGoZones={noGoZones}
      />

      <div className="absolute bottom-4 right-4 z-40 rounded-xl2 border border-troll-500/40 bg-void-900/90 p-3 shadow-panel">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-troll-400">
          <span className="h-1.5 w-1.5 rounded-full bg-troll-500" />
          Dev
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setReaction('kill')}
            className="rounded-lg border border-void-600 bg-void-800 px-3 py-1.5 text-xs font-medium text-mist-200 transition-colors hover:border-troll-500/50 hover:text-troll-400"
          >
            Trigger kill
          </button>
          <button
            type="button"
            onClick={() => setReaction('funny-number')}
            className="rounded-lg border border-void-600 bg-void-800 px-3 py-1.5 text-xs font-medium text-mist-200 transition-colors hover:border-gold-500/50 hover:text-gold-500"
          >
            Trigger funny number
          </button>
          <button
            type="button"
            onClick={openAugmentPopup}
            disabled={isAugmentsFull}
            title={isAugmentsFull ? `Augments full (${MAX_SELECTED_AUGMENTS}/${MAX_SELECTED_AUGMENTS})` : undefined}
            className="rounded-lg border border-void-600 bg-void-800 px-3 py-1.5 text-xs font-medium text-mist-200 transition-colors hover:border-wisp-500/50 hover:text-wisp-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-void-600 disabled:hover:text-mist-200"
          >
            Simulate augment pick
          </button>
        </div>
      </div>

      {popupChoices && popupRecommendation && (
        <AugmentSelectPopup
          choices={popupChoices}
          recommendedApiName={popupRecommendation}
          onSelect={selectAugment}
          onClose={() => {
            setPopupChoices(null);
            setPopupRecommendation(null);
          }}
        />
      )}
    </div>
  );
}
